export * from 'atem-state'
import * as OrigAtemConnection from 'atem-connection'
import { EventEmitter } from 'events'
import * as fs from 'fs'

/** Note: This is incomplete, and should be filled in as needed */
function parseAtemState(rawState: any): OrigAtemConnection.AtemState {
	const state = rawState

	return state
}

const mockData = parseAtemState(JSON.parse(fs.readFileSync(__dirname + '/atem-out.json', 'utf8')))

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
		async connect(): Promise<void> {
			setTimeoutOrg(() => {
				this.emit('connected', true)
			}, 10)

			return new Promise<void>((resolve) => {
				setTimeoutOrg(() => {
					resolve()
				}, 5)
			})
		}
		async disconnect(): Promise<void> {
			return new Promise<void>((resolve) => {
				setTimeoutOrg(() => {
					resolve()
				}, 10)
			})
		}

		async destroy(): Promise<void> {
			return new Promise<void>((resolve) => {
				setTimeoutOrg(() => {
					resolve()
				}, 10)
			})
		}

		async sendCommand(): Promise<void> {
			return Promise.resolve()
		}
	}
}
