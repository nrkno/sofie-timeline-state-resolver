import { EventEmitter } from 'eventemitter3'
import { QuantelTransitionType, QuantelControlMode } from 'timeline-state-resolver-types'
import { QuantelGateway, Q, QuantelErrorResponse } from 'tv-automation-quantel-gateway-client'
import _ = require('underscore')
import {
	QuantelCommandClearClip,
	QuantelCommandClip,
	QuantelCommandLoadClipFragments,
	QuantelCommandPauseClip,
	QuantelCommandPlayClip,
	QuantelCommandReleasePort,
	QuantelCommandSetupPort,
	QuantelStatePortClip,
	QuantelStatePortClipContent,
	QuantelTrackedState,
	QuantelTrackedStatePort,
} from './types'
import { WaitGroup } from '../../waitGroup'

let SOFT_JUMP_WAIT_TIME = 250 // Is a constant, but can be changed during unit tests

const DEFAULT_FPS = 25 // frames per second
const JUMP_ERROR_MARGIN = 10 // frames

interface QuantelManagerOptions {
	/** If set: If a clip turns out to be on the wrong server, an attempt to copy the clip will be done. */
	allowCloneClips?: boolean
}
export class QuantelManager extends EventEmitter {
	private _quantelState: QuantelTrackedState = {
		port: {},
	}
	private _cache = new Cache()
	private _waitWithPorts = new WaitGroup()
	private _retryLoadFragmentsTimeout: { [portId: string]: NodeJS.Timeout } = {}
	private _failedAction: {
		[portId: string]: {
			action: 'play' | 'pause'
			cmd: QuantelCommandClip
		}
	} = {}
	private waitingForReleaseChannel = new Map<number, Promise<any>>() // maps channel to Promise

	constructor(
		private _quantel: QuantelGateway,
		private getCurrentTime: () => number,
		private options: QuantelManagerOptions
	) {
		super()
		this._quantel.on('error', (...args) => this.emit('error', ...args))
		this._quantel.on('debug', (...args) => this.emit('debug', ...args))
	}

	public async setupPort(cmd: QuantelCommandSetupPort): Promise<void> {
		const trackedPort = this._quantelState.port[cmd.portId]

		// Check if the port is already set up
		if (!trackedPort || trackedPort.channel !== cmd.channel) {
			// Before doing anything, wait for any releasePort to finish:
			await (this.waitingForReleaseChannel.get(cmd.channel) || Promise.resolve())

			let port: Q.PortStatus | null = null
			// Setup a port and connect it to a channel
			try {
				port = await this._quantel.getPort(cmd.portId)
			} catch (e) {
				// If the GET fails, it might be something unknown wrong.
				// A temporary workaround is to send a delete on that port and try again, it might work.
				try {
					await this._quantel.releasePort(cmd.portId)
				} catch {
					// ignore any errors
				}
				// Try again:
				port = await this._quantel.getPort(cmd.portId)
			}
			if (port) {
				try {
					// port already exists, release it first:
					await this._quantel.releasePort(cmd.portId)
				} catch (e) {
					// we should still try to create the port even if we can't release the old one
					this.emit('warning', `setupPort release failed: ${(e as Error).toString()}`)
				}
			}
			await this._quantel.createPort(cmd.portId, cmd.channel)

			// Store to the local tracking state:
			this._quantelState.port[cmd.portId] = {
				loadedFragments: {},
				offset: -1,
				playing: false,
				jumpOffset: null,
				scheduledStop: null,
				channel: cmd.channel,
			}
		}
	}
	public async releasePort(cmd: QuantelCommandReleasePort): Promise<void> {
		try {
			const channel = this._quantelState.port[cmd.portId].channel

			{
				// Before doing anything, wait for an existing releasePort to finish:
				const existingRelease = this.waitingForReleaseChannel.get(channel)
				if (existingRelease) await existingRelease
			}

			const p = this._quantel.releasePort(cmd.portId)

			// Create a promise for others to wait on, that will never reject
			const waitP = p.catch().then(() => {
				this.waitingForReleaseChannel.delete(channel)
			})
			this.waitingForReleaseChannel.set(channel, waitP)

			// Wait for the release
			await p
		} catch (e) {
			if ((e as QuantelErrorResponse).status !== 404) {
				// releasing a non-existent port is OK
				throw e
			}
		}
		// Delete the local tracking state:
		delete this._quantelState.port[cmd.portId]
	}
	public async tryLoadClipFragments(cmd: QuantelCommandLoadClipFragments, fromRetry?: boolean): Promise<void> {
		if (this._retryLoadFragmentsTimeout[cmd.portId]) {
			clearTimeout(this._retryLoadFragmentsTimeout[cmd.portId])
			delete this._retryLoadFragmentsTimeout[cmd.portId]
		}

		try {
			await this.loadClipFragments(cmd)

			if (fromRetry) {
				// The loading seemed to work now.

				// Check if there also is a queued action for this:
				const failedAction = this._failedAction[cmd.portId]
				if (failedAction) {
					delete this._failedAction[cmd.portId]
					this.prepareClipJump(failedAction.cmd, failedAction.action).catch((err) => this.emit('error', err))
				}
			}
		} catch (err) {
			if ((err + '').match(/not found/i)) {
				// It seems like the clip doesn't exist.
				// Try again some time later, maybe it has appeared by then?

				this._retryLoadFragmentsTimeout[cmd.portId] = setTimeout(() => {
					this.tryLoadClipFragments(cmd, true).catch((fragErr) => this.emit('error', fragErr))
				}, 10 * 1000) // 10 seconds
			} else {
				throw err
			}
		}
	}
	public async loadClipFragments(cmd: QuantelCommandLoadClipFragments): Promise<void> {
		const trackedPort = this.getTrackedPort(cmd.portId)
		const server = await this.getServer()

		let clipId = 0
		try {
			clipId = await this.getClipId(cmd.clip)
		} catch (e) {
			if ((e + '').match(/not found/i)) {
				// The clip was not found
				if (this.options.allowCloneClips) {
					// Try to clone the clip from another server:

					if (!server.pools) throw new Error(`server.pools not set!`)

					// find another clip

					const foundClips = this.filterClips(await this.searchForClips(cmd.clip), undefined)
					const clipToCloneFrom = _.first(this.prioritizeClips(foundClips))
					if (clipToCloneFrom) {
						// Try to copy to each of the server pools, break on first succeeded
						let copyCreated = false
						let lastError: any
						for (const pool of server.pools) {
							try {
								const cloneResult = await this._quantel.copyClip(undefined, clipToCloneFrom.ClipID, pool, 8, true)

								clipId = cloneResult.copyID // new clip id

								copyCreated = true
								break
							} catch (e) {
								lastError = e
								continue
							}
						}
						if (!copyCreated) {
							throw lastError || new Error(`Unable to copy clip ${clipToCloneFrom.ClipID} for unknown reasons`)
						}
					} else throw e
				} else throw e
			} else throw e
		}

		// let clipId = await this.getClipId(cmd.clip)
		const clipData = await this._quantel.getClip(clipId)
		if (!clipData) throw new Error(`Clip ${clipId} not found`)
		if (!clipData.PoolID) throw new Error(`Clip ${clipData.ClipID} missing PoolID`)

		// Check that the clip is present on the server:
		if (!(server.pools || []).includes(clipData.PoolID)) {
			throw new Error(`Clip "${clipData.ClipID}" PoolID ${clipData.PoolID} not found on right server (${server.ident})`)
		}

		const useInOutPoints = !!(cmd.clip.inPoint || cmd.clip.length)

		/** milliseconds */
		const inPoint = cmd.clip.inPoint
		/** milliseconds */
		const length = cmd.clip.length

		/** In point [frames] */
		const inPointFrames: number =
			(inPoint
				? Math.round((inPoint * DEFAULT_FPS) / 1000) // todo: handle fps, get it from clip?
				: 0) || 0

		/** Duration [frames] */
		let lengthFrames = 0

		if (length) {
			lengthFrames = Math.round((length * DEFAULT_FPS) / 1000) // todo: handle fps, get it from clip?
		}
		if (!lengthFrames) {
			const clipLength: number = parseInt(clipData.Frames, 10) || 0
			if (inPoint) {
				lengthFrames = clipLength - inPointFrames // THe remaining length of the clip
			} else {
				lengthFrames = clipLength
			}
		}

		const outPointFrames = inPointFrames + lengthFrames

		let portInPoint: number
		let portOutPoint: number
		// Check if the fragments are already loaded on the port?
		const loadedFragments = trackedPort.loadedFragments[clipId]
		if (loadedFragments && loadedFragments.inPoint === inPointFrames && loadedFragments.outPoint === outPointFrames) {
			// Reuse the already loaded fragment:
			portInPoint = loadedFragments.portInPoint
			// portOutPoint = loadedFragments.portOutPoint
		} else {
			// Fetch fragments of clip:
			const fragmentsInfo = await (useInOutPoints
				? this._quantel.getClipFragments(clipId, inPointFrames, outPointFrames)
				: this._quantel.getClipFragments(clipId))

			// Check what the end-frame of the port is:
			const portStatus = await this._quantel.getPort(cmd.portId)
			if (!portStatus) throw new Error(`Port ${cmd.portId} not found`)
			// Load the fragments onto Port:
			portInPoint = portStatus.endOfData || 0
			const newPortStatus = await this._quantel.loadFragmentsOntoPort(cmd.portId, fragmentsInfo.fragments, portInPoint)
			if (!newPortStatus) throw new Error(`Port ${cmd.portId} not found after loading fragments`)

			// Calculate the end of data of the fragments:
			portOutPoint =
				portInPoint +
				(fragmentsInfo.fragments
					.filter(
						(fragment) =>
							fragment.type === 'VideoFragment' && // Only use video, so that we don't risk ending at a black frame
							fragment.trackNum === 0 // < 0 are historic data (not used for automation), 0 is the normal, playable video track, > 0 are extra channels, such as keys
					)
					.reduce((prev, current) => (prev > current.finish ? prev : current.finish), 0) -
					1) // newPortStatus.endOfData - 1

			// Store a reference to the beginning of the fragments:
			trackedPort.loadedFragments[clipId] = {
				portInPoint: portInPoint,
				portOutPoint: portOutPoint,
				inPoint: inPointFrames,
				outPoint: outPointFrames,
			}
		}
		// Prepare the jump?
		const timeLeftToPlay = cmd.timeOfPlay - this.getCurrentTime()
		if (cmd.allowedToPrepareJump && timeLeftToPlay > 0) {
			// We have time to prepare the jump

			if (portInPoint > 0 && trackedPort.scheduledStop === null) {
				// Since we've now added fragments to the end of the port timeline, we should make sure it'll stop at the previous end
				await this._quantel.portStop(cmd.portId, portInPoint - 1)
				trackedPort.scheduledStop = portInPoint - 1
			}

			await this._quantel.portPrepareJump(cmd.portId, portInPoint)
			// Store the jump in the tracked state:
			trackedPort.jumpOffset = portInPoint
		}
	}
	public async playClip(cmd: QuantelCommandPlayClip): Promise<void> {
		await this.tryPrepareClipJump(cmd, 'play')
	}
	public async pauseClip(cmd: QuantelCommandPauseClip): Promise<void> {
		await this.tryPrepareClipJump(cmd, 'pause')
	}
	public async clearClip(cmd: QuantelCommandClearClip): Promise<void> {
		// Fetch tracked reference to the loaded clip:
		const trackedPort = this.getTrackedPort(cmd.portId)
		if (cmd.transition) {
			if (cmd.transition.type === QuantelTransitionType.DELAY) {
				if (await this.waitWithPort(cmd.portId, cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}
		// Reset the port (this will clear all fragments and reset playhead)
		await this._quantel.resetPort(cmd.portId)

		trackedPort.loadedFragments = {}
		trackedPort.offset = -1
		trackedPort.playing = false
		trackedPort.jumpOffset = null
		trackedPort.scheduledStop = null
	}
	private async tryPrepareClipJump(cmd: QuantelCommandClip, alsoDoAction: 'play' | 'pause'): Promise<void> {
		delete this._failedAction[cmd.portId]

		try {
			return await this.prepareClipJump(cmd, alsoDoAction)
		} catch (err) {
			if (this._retryLoadFragmentsTimeout[cmd.portId]) {
				// It looks like there was an issue with loading fragments,
				// that's probably why we got an error as well.

				if ((err + '').match(/not found/i)) {
					// Store the failed action, it'll be run whenever the fragments has been loaded later:
					this._failedAction[cmd.portId] = {
						action: alsoDoAction,
						cmd: cmd,
					}
				} else throw err
			} else throw err
		}
	}
	private async prepareClipJump(cmd: QuantelCommandClip, alsoDoAction: 'play' | 'pause'): Promise<void> {
		// Fetch tracked reference to the loaded clip:
		const trackedPort = this.getTrackedPort(cmd.portId)
		if (cmd.transition) {
			if (cmd.transition.type === QuantelTransitionType.DELAY) {
				if (await this.waitWithPort(cmd.portId, cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		const clipId = await this.getClipId(cmd.clip)
		const loadedFragments = trackedPort.loadedFragments[clipId]

		if (!loadedFragments) {
			// huh, the fragments hasn't been loaded
			throw new Error(`Fragments of clip ${clipId} wasn't loaded`)
		}
		const clipFps = DEFAULT_FPS // todo: handle fps, get it from clip?
		const jumpToOffset = Math.floor(
			loadedFragments.portInPoint +
				(cmd.clip.playTime
					? (Math.max(0, (cmd.clip.pauseTime || this.getCurrentTime()) - cmd.clip.playTime) * clipFps) / 1000
					: 0)
		)
		this.emit(
			'warning',
			`prepareClipJump: cmd=${JSON.stringify(
				cmd
			)}: ${alsoDoAction}: clipId=${clipId}: jumpToOffset=${jumpToOffset}: trackedPort=${JSON.stringify(trackedPort)}`
		)
		if (
			(jumpToOffset === trackedPort.offset && trackedPort.playing === false) || // On request to play clip again, prepare jump // We're already there
			// TODO: what situation is this for??
			(alsoDoAction === 'play' &&
				// trackedPort.offset &&
				trackedPort.playing === false &&
				jumpToOffset > trackedPort.offset &&
				jumpToOffset - trackedPort.offset < JUMP_ERROR_MARGIN)
			// We're probably a bit late, just start playing
		) {
			// do nothing
		} else {
			// We've determined that we're not on the correct frame

			if (
				trackedPort.jumpOffset !== null &&
				Math.abs(trackedPort.jumpOffset - jumpToOffset) > JUMP_ERROR_MARGIN // "the prepared jump is still valid"
				// || trackedPort.playing === true // Likely request to play clip again
			) {
				// It looks like the stored jump is no longer valid
				// Invalidate stored jump:
				trackedPort.jumpOffset = null
			}
			// Jump the port playhead to the correct place
			if (trackedPort.jumpOffset !== null) {
				// Good, there is a prepared jump
				if (alsoDoAction === 'pause') {
					// Pause the playback:
					await this._quantel.portStop(cmd.portId)
					trackedPort.scheduledStop = null
					trackedPort.playing = false
				}
				// Trigger the jump:
				await this._quantel.portTriggerJump(cmd.portId)
				trackedPort.offset = trackedPort.jumpOffset
				trackedPort.jumpOffset = null
			} else {
				// No jump has been prepared
				if (cmd.mode === QuantelControlMode.QUALITY) {
					// Prepare a soft jump:
					await this._quantel.portPrepareJump(cmd.portId, jumpToOffset)
					trackedPort.jumpOffset = jumpToOffset

					if (alsoDoAction === 'pause') {
						// Pause the playback:
						await this._quantel.portStop(cmd.portId)
						trackedPort.scheduledStop = null
						trackedPort.playing = false

						// Allow the server some time to load the clip:
						await this.wait(SOFT_JUMP_WAIT_TIME) // This is going to give the
					} else {
						// Allow the server some time to load the clip:
						await this.wait(SOFT_JUMP_WAIT_TIME) // This is going to give the
					}

					// Trigger the jump:
					await this._quantel.portTriggerJump(cmd.portId)
					trackedPort.offset = trackedPort.jumpOffset
					trackedPort.jumpOffset = null
				} else {
					// cmd.mode === QuantelControlMode.SPEED
					// Just do a hard jump:
					await this._quantel.portHardJump(cmd.portId, jumpToOffset)

					trackedPort.offset = jumpToOffset
					trackedPort.playing = false
					// trackedPort.jumpOffset = null TODO:
				}
			}
		}

		if (alsoDoAction === 'play') {
			// Start playing:
			await this._quantel.portPlay(cmd.portId)

			await this.wait(60)

			// Check if the play actually succeeded:
			const portStatus = await this._quantel.getPort(cmd.portId)

			if (!portStatus) {
				// oh, something's gone very wrong
				throw new Error(`Quantel: After play, port doesn't exist anymore`)
			} else if (!portStatus.status.match(/playing/i)) {
				// The port didn't seem to have started playing, let's retry a few more times:

				this.emit('warning', `quantelRecovery: port didn't play`)
				this.emit('warning', portStatus)

				for (let i = 0; i < 3; i++) {
					await this.wait(20)

					await this._quantel.portPlay(cmd.portId)

					await this.wait(60 + i * 200) // Wait progressively longer times before trying again:

					const portStatus = await this._quantel.getPort(cmd.portId)

					if (portStatus && portStatus.status.match(/playing/i)) {
						// it has started playing, all good!
						this.emit('warning', `quantelRecovery: port started playing again, on try ${i}`)
						break
					} else {
						this.emit('warning', `quantelRecovery: try ${i}, no luck trying again..`)
						this.emit('warning', portStatus)
					}
				}
			}
			trackedPort.scheduledStop = null
			trackedPort.playing = true
			trackedPort.jumpOffset = null // As a safety precaution, remove any knowledge of any prepared jump, another preparation will be triggered on any following commands.

			// Schedule the port to stop at the last frame of the clip
			if (loadedFragments.portOutPoint) {
				await this._quantel.portStop(cmd.portId, loadedFragments.portOutPoint)
				trackedPort.scheduledStop = loadedFragments.portOutPoint
			}
		} else if (alsoDoAction === 'pause' && trackedPort.playing) {
			await this._quantel.portHardJump(cmd.portId, jumpToOffset)

			trackedPort.offset = jumpToOffset
			trackedPort.playing = false
			trackedPort.jumpOffset = null // As a safety precaution, remove any knowledge of any prepared jump, another preparation will be triggered on any following commands.
		}
	}
	private getTrackedPort(portId: string): QuantelTrackedStatePort {
		const trackedPort = this._quantelState.port[portId]
		if (!trackedPort) {
			// huh, it looks like the port hasn't been created yet.
			// This is strange, it should have been created by a previously run SETUPPORT
			throw new Error(`Port ${portId} missing in tracked quantel state`)
		}
		return trackedPort
	}
	private async getServer() {
		const server = await this._quantel.getServer()
		if (!server) throw new Error(`Quantel server ${this._quantel.serverId} not found`)
		if (!server.pools) throw new Error(`Server ${server.ident} has no .pools`)
		if (!server.pools.length) throw new Error(`Server ${server.ident} has an empty .pools array`)

		return server
	}
	private async getClipId(clip: QuantelStatePortClip): Promise<number> {
		let clipId = clip.clipId

		if (!clipId && clip.guid) {
			clipId = await this._cache.getSet(`clip.guid.${clip.guid}.clipId`, async () => {
				const server = await this.getServer()

				// Look up the clip:
				const foundClips = this.filterClips(await this.searchForClips(clip), server)
				const foundClip = _.first(this.prioritizeClips(foundClips))
				if (!foundClip) throw new Error(`Clip with GUID "${clip.guid}" not found on server (${server.ident})`)
				return foundClip.ClipID
			})
		} else if (!clipId && clip.title) {
			clipId = await this._cache.getSet(`clip.title.${clip.title}.clipId`, async () => {
				const server = await this.getServer()

				// Look up the clip:
				const foundClips = this.filterClips(await this.searchForClips(clip), server)
				const foundClip = _.first(this.prioritizeClips(foundClips))

				if (!foundClip) throw new Error(`Clip with Title "${clip.title}" not found on server (${server.ident})`)
				return foundClip.ClipID
			})
		}
		if (!clipId) throw new Error(`Unable to determine clipId for clip "${clip.title || clip.guid}"`)

		return clipId
	}
	private filterClips(clips: Q.ClipDataSummary[], server?: Q.ServerInfo): Q.ClipDataSummary[] {
		return _.filter(
			clips,
			(clip) =>
				typeof clip.PoolID === 'number' &&
				parseInt(clip.Frames, 10) > 0 && // "Placeholder clips" does not have any Frames
				(!server || (server.pools || []).indexOf(clip.PoolID) !== -1) // If present in any of the pools of the server
			// From Media-Manager:
			// clip.Completed !== null &&
			// clip.Completed.length > 0 // Note from Richard: Completed might not necessarily mean that it's completed on the right server
		)
	}
	private prioritizeClips(clips: Q.ClipDataSummary[]): Q.ClipDataSummary[] {
		// Sort the clips, so that the most likely to use is first.

		return clips.sort(
			(
				a,
				b // Sort Created dates into reverse order
			) => new Date(b.Created).getTime() - new Date(a.Created).getTime()
		)
	}
	private async searchForClips(clip: QuantelStatePortClipContent): Promise<Q.ClipDataSummary[]> {
		if (clip.guid) {
			return this._quantel.searchClip({
				ClipGUID: `"${clip.guid}"`,
			})
		} else if (clip.title) {
			return this._quantel.searchClip({
				Title: `"${clip.title}"`,
			})
		} else {
			throw new Error(`Unable to search for clip "${clip.title || clip.guid}"`)
		}
	}
	private async wait(time: number) {
		return new Promise((resolve) => {
			setTimeout(resolve, time)
		})
	}
	public clearAllWaitWithPort(portId: string) {
		this._waitWithPorts.clearAllForKey(portId)
	}
	/**
	 * Returns true if the wait was cleared from someone else
	 */
	private async waitWithPort(portId: string, delay: number): Promise<boolean> {
		return this._waitWithPorts.waitOnKey(portId, delay)
	}
}
class Cache {
	private data: {
		[key: string]: {
			endTime: number
			value: any
		}
	} = {}
	private callCount = 0
	set(key: string, value: any, ttl = 30000): any {
		this.data[key] = {
			endTime: Date.now() + ttl,
			value: value,
		}
		this.callCount++
		if (this.callCount > 100) {
			this.callCount = 0
			this._triggerClean()
		}
		return value
	}
	get(key: string): any | undefined {
		const o = this.data[key]
		if (o && (o.endTime || 0) >= Date.now()) return o.value
	}
	exists(key: string): boolean {
		const o = this.data[key]
		return o && (o.endTime || 0) >= Date.now()
	}
	getSet<T>(key, fcn: () => T, ttl?: number): T {
		if (this.exists(key)) {
			return this.get(key)
		} else {
			const value = fcn()
			if (value && _.isObject(value) && _.isFunction(value['then'])) {
				// value is a promise
				return Promise.resolve(value).then((value) => {
					return this.set(key, value, ttl)
				}) as any as T
			} else {
				return this.set(key, value, ttl)
			}
		}
	}
	private _triggerClean() {
		setTimeout(() => {
			_.each(this.data, (o, key) => {
				if ((o.endTime || 0) < Date.now()) {
					delete this.data[key]
				}
			})
		}, 1)
	}
}
/**
 * USED IN UNIT TESTS ONLY
 */
export function setSoftJumpWaitTime(time: number) {
	SOFT_JUMP_WAIT_TIME = time
}
