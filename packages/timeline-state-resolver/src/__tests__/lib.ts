import { DeviceOptionsAnyInternal } from '../conductor'
import { ConnectionManager } from '../service/ConnectionManager'

/**
 * Just a wrapper to :any type, to be used in tests only
 */
export function getMockCall<T>(fcn: jest.Mock<T>, callIndex: number, paramIndex: number): any {
	return fcn.mock.calls[callIndex][paramIndex]
}
export async function addConnections(
	connManager: ConnectionManager,
	connections: Record<string, DeviceOptionsAnyInternal>,
	waitForInit = true
): Promise<void> {
	const connectionIds = Object.keys(connections)
	const addedConns: string[] = []

	let resolveAdded: undefined | (() => void) = undefined
	const psAdded = new Promise<void>((resolveCb) => (resolveAdded = resolveCb))
	const cb = (id: string) => {
		addedConns.push(id)

		if (resolveAdded && addedConns.length === connectionIds.length) {
			resolveAdded()
			if (waitForInit) {
				connManager.removeListener('connectionInitialised', cb)
			} else {
				connManager.removeListener('connectionAdded', cb)
			}
		}
	}
	if (waitForInit) {
		connManager.on('connectionInitialised', cb)
	} else {
		connManager.on('connectionAdded', cb)
	}

	connManager.setConnections(connections)

	await psAdded
}

export async function removeConnections(
	connManager: ConnectionManager,
	connections: Record<string, DeviceOptionsAnyInternal>,
	toBeRemoved: string[]
): Promise<void> {
	const addedConns: string[] = []

	let resolveAdded: undefined | (() => void) = undefined
	const psAdded = new Promise<void>((resolveCb) => (resolveAdded = resolveCb))
	connManager.on('connectionRemoved', (id) => {
		addedConns.push(id)

		if (resolveAdded && addedConns.length === toBeRemoved.length) resolveAdded()
	})

	connManager.setConnections(connections)

	await psAdded
}

export async function awaitNextRemoval(connManager: ConnectionManager): Promise<void> {
	return new Promise((resolve) => {
		connManager.once('connectionRemoved', () => {
			resolve()
		})
	})
}

// Excend jest.expect in functionality and typings
expect.extend({
	toBeCloseTo(received: number, target: number, diff: number) {
		const pass = Math.abs(received - target) <= diff
		return {
			message: () => `expected ${received} to be close to ${target} (within ${diff})`,
			pass: pass,
		}
	},
})
declare global {
	namespace jest {
		interface Expect {
			toBeCloseTo(target: number, diff: number): any
		}
	}
}
