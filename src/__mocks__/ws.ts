import { EventEmitter } from 'events'

export class WebSocket extends EventEmitter {
	public CONNECTING = 1
	public OPEN = 2
	public CLOSING = 3
	public CLOSED = 4

	private _pathName: string

	constructor (pathName) {
		super()
		this._pathName = pathName

		// this.emit('open')
		// this.emit('message', message)
		// this.emit('error', error)
		// this.emit('close')
	}
	public send (message, callback: (err?: Error) => void) {

	}
	public get readyState () {
		return this.OPEN
	}
}
