import {

} from '../../node_modules/atem-connection'
import { EventEmitter } from 'events'
const mockData = require('./atem-out.json')

export {
	Enums,
	VideoState,
	AtemState,
	Commands
} from '../../node_modules/atem-connection'

let instances = []

let setTimeoutOrg = setTimeout

export class Atem extends EventEmitter {

	constructor () {
		super()
		instances.push(this)
	}
	connect () {
		// mock a connection
		setTimeoutOrg(() => {
			this.emit('connected', true)
		}, 10)
	}
	get state () {
		return mockData
	}
}
