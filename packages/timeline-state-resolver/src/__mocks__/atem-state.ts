export * from 'atem-state'
import { AtemConnection as OrigAtemConnection } from 'atem-state'
import { EventEmitter } from 'events'
import * as fs from 'fs'

/** Note: This is incomplete, and should be filled in as needed */
function parseAtemState(rawState: any): OrigAtemConnection.AtemState {
	const state = rawState

	return state
}

const mockData = parseAtemState(JSON.parse(fs.readFileSync('./atem-out.json', 'utf8')))

const setTimeoutOrg = setTimeout

// @ts-ignore separate declarations
export { OrigAtemConnection as AtemConnection }
export namespace AtemConnection {
	// @ts-ignore separate declarations
	export class BasicAtem extends EventEmitter implements OrigAtemConnection.BasicAtem {
		constructor(_options?: OrigAtemConnection.AtemOptions) {
			super()
		}
		get state(): OrigAtemConnection.AtemState {
			return mockData
		}
		connect(): Promise<void> {
			setTimeoutOrg(() => {
				this.emit('connected', true)
			}, 10)

			return new Promise<void>((resolve) => {
				setTimeoutOrg(() => {
					resolve()
				}, 5)
			})
		}
		disconnect(): Promise<void> {
			return new Promise<void>((resolve) => {
				setTimeoutOrg(() => {
					resolve()
				}, 10)
			})
		}

		destroy(): Promise<void> {
			return new Promise<void>((resolve) => {
				setTimeoutOrg(() => {
					resolve()
				}, 10)
			})
		}

		sendCommand(): Promise<void> {
			return Promise.resolve()
		}
	}
}
