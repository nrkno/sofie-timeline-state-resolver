// mock CasparCG
import { Commands as orgCommands, AMCPCommand as orgAMCPCommand, SendResult } from 'casparcg-connection'
import { ResponseTypes } from 'casparcg-connection/dist/connection'
import { EventEmitter } from 'events'

const mockDo = jest.fn()

const instances: Array<BasicCasparCGAPI> = []

export const Commands = orgCommands
export type AMCPCommand = orgAMCPCommand

export class BasicCasparCGAPI extends EventEmitter {
	onConnected: () => void

	constructor() {
		super()

		setTimeout(() => {
			// simulate that we're connected
			if (this.onConnected) this.onConnected()
			this.emit('connect')
		}, 10)

		instances.push(this)
	}

	async executeCommand(command: AMCPCommand): Promise<SendResult<unknown>> {
		mockDo.apply(this, command)

		if (command.command === Commands.Info) {
			return Promise.resolve({
				error: undefined,
				request: Promise.resolve({
					reqId: 'mockedReq',
					command: command.command,
					responseCode: 200, // note: we may need to mock some actual responses
					data: [
						{
							channel: 1,
							format: 'pal',
							channelRate: 50,
							frameRate: 25,
							interlaced: true,
						},
						{
							channel: 2,
							format: 'pal',
							channelRate: 50,
							frameRate: 25,
							interlaced: true,
						},
						{
							channel: 3,
							format: 'pal',
							channelRate: 50,
							frameRate: 25,
							interlaced: true,
						},
					],

					type: ResponseTypes.OK,
					message: 'The command has been executed.',
				}),
			})
		}

		return Promise.resolve({
			error: undefined,
			request: Promise.resolve({
				reqId: 'mockedReq',
				command: command.command,
				responseCode: 202, // note: we may need to mock some actual responses
				data: [],

				type: ResponseTypes.OK,
				message: 'The command has been executed.',
			}),
		})
	}

	static get mockDo() {
		return mockDo
	}
	static get instances() {
		return instances
	}
}
