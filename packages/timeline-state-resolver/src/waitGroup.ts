type ResolveFn = (value: boolean) => void

export class WaitGroup {
	#store: Map<string, Map<number, ResolveFn>> = new Map()
	#nextId = 0

	clearAllForKey(key: string): void {
		const callbacks = this.#store.get(key)
		if (!callbacks) return

		this.#store.delete(key)

		for (const resolve of callbacks.values()) {
			resolve(true)
		}
	}

	async waitOnKey(portId: string, delay: number): Promise<boolean> {
		let callbacks = this.#store.get(portId)
		if (!callbacks) {
			callbacks = new Map()
			this.#store.set(portId, callbacks)
		}
		const callbacks2 = callbacks

		const id = this.#nextId++

		return new Promise((resolve) => {
			const callbackWithCleanup = (value: boolean) => {
				callbacks2.delete(id)

				resolve(value)
			}

			callbacks2.set(id, callbackWithCleanup)
			setTimeout(() => callbackWithCleanup(false), delay || 0)
		})
	}
}
