type ResolveFn = (value: boolean) => void

/**
 * A WaitGroup is used to wait for a number of operations to complete, or timeout
 */
export class WaitGroup {
	#store: Map<string, Map<number, ResolveFn>> = new Map()
	#nextId = 0

	/**
	 * Resolve all waiting operations for a key, with success
	 */
	clearAllForKey(key: string): void {
		const callbacks = this.#store.get(key)
		if (!callbacks) return

		this.#store.delete(key)

		for (const resolve of callbacks.values()) {
			resolve(true)
		}
	}

	/**
	 * Wait for a key to be resolved (true), or timeout (false)
	 */
	async waitOnKey(key: string, delay: number): Promise<boolean> {
		let callbacks = this.#store.get(key)
		if (!callbacks) {
			callbacks = new Map()
			this.#store.set(key, callbacks)
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
