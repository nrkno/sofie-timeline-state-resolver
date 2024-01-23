// mock emberplus-connection
import { EventEmitter } from 'events'

export { Model, Types } from 'emberplus-connection'

export const mockSetValue = jest.fn(async () => {
	return {
		sentOk: true,
		response: Promise.resolve(),
	}
})
export const mockInvoke = jest.fn(async () => {
	return {
		sentOk: true,
		response: Promise.resolve({
			id: 13,
		}),
	}
})

const instances: Array<EmberClient> = []

export class EmberClient extends EventEmitter {
	tree = {}
	onConnected: (() => void) | undefined

	constructor() {
		super()

		setTimeout(() => {
			// simulate that we're connected
			this.emit('connected')
		}, 10)

		instances.push(this)
	}

	async connect() {
		this.emit('connected')
	}
	async disconnect() {
		this.emit('disconnected')
	}
	discard() {
		// empty block
	}

	async getDirectory() {
		return { response: Promise.resolve() }
	}
	async expand() {
		return {
			result: Promise.resolve(),
		}
	}
	async getElementByPath(p) {
		if (p === 'Ruby.Functions.RampMotorFader') {
			return {
				path: p,
				contents: {
					type: 'FUNCTION',
					value: 0,
				},
			}
		}
		return {
			path: p,
			contents: {
				type: 'PARAMETER',
				value: 0,
			},
		}
	}

	setValue = mockSetValue
	invoke = mockInvoke

	static get mockSetValue() {
		return mockSetValue
	}
	static get mockInvoke() {
		return mockInvoke
	}
	static get instances() {
		return instances
	}
}
