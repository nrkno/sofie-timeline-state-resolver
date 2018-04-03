
// mock CasparCG
import * as _ from 'underscore'
import {AMCP as AMCP2, AMCPUtil as util, Command} from '../../node_modules/casparcg-connection'

let test = 0

let mockDo = jest.fn()

let instances = []

export const AMCP = AMCP2
export const AMCPUtil = util

export class CasparCG {
	onConnected: () => void

	constructor () {
		// console.log('Mock CasparCG: constructor was called');

		setTimeout(() => {
			// simulate that we're connected
			if (this.onConnected) this.onConnected()
		},10)

		instances.push(this)
	}

	do () {
		mockDo.apply(this,arguments)
	}

	info () {
		return new Promise((resolve) => {
			let cmd = new AMCP.InfoCommand()
			cmd.response = new Command.AMCPResponse()
			cmd.response.code = 200
			cmd.response.raw = '200 INFO OK\n1 PAL PLAYING\n2 PAL PLAYING'
			cmd.response.data = [{
				channel: 1,
				format: 'pal',
				channelRate: 50,
				frameRate: 25,
				interlaced: true
			},{
				channel: 2,
				format: 'pal',
				channelRate: 50,
				frameRate: 25,
				interlaced: true
			}]
			resolve(cmd)
		})
	}

	time () {
		return new Promise((resolve) => {
			let cmd = new AMCP.TimeCommand()
			cmd.response = new Command.AMCPResponse()
			cmd.response.code = 201
			cmd.response.raw = '201 INFO OK\n00:00:00:00'
			cmd.response.data = '00:00:00:00'
			resolve(cmd)
		})
	}

	static get mockDo () {
		return mockDo
	}
	static get instances () {
		return instances
	}
}
/*

//jest.mock("casparcg-connection")


export const mockDo = jest.fn();

const CasparCG = jest.fn().mockImplementation(() => {
  return {do: mockDo};
});

export default CasparCG;

*/

//const CasparCG = jest.genMockFromModule('casparcg-connection');


//console.log('mock CasparCG',CasparCG);

//export default CasparCG;
