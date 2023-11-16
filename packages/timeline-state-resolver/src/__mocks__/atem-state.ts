export * from 'atem-state'
import * as OrigAtemConnection from 'atem-connection'
import { EventEmitter } from 'events'

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
			return OrigAtemConnection.AtemStateUtil.Create()
		}
		async connect(): Promise<void> {
			setTimeoutOrg(() => {
				this.emit('connected')
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
