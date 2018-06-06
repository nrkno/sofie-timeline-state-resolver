import { EventEmitter } from 'events'
const mockData = require('./lawo-out.json')

export class DeviceTree extends EventEmitter {
	connect () {
		return new Promise((resolve) => resolve())
	}

	isConnected () {
		return true
	}

	getNodeByPath (path: Array<number>) {
		return new Promise((resolve) => resolve(new Node(path)))
	}

	setValue (node: Node, value: boolean | number | string) {
		return new Promise((resolve) => resolve())
	}
}

export class Node {
	node: any

	constructor (_path: Array<number>) {
		this.node = mockData.elements[0]
		const path = [..._path]
		path.shift()

		while (path.length > 0) {
			const index = path.shift()
			for (const node of this.node.children as Array<any>) {
				if (node.number === index) {
					this.node = node
				}
			}
		}
	}

	getChildren () {
		return this.node.children as Array<any>
	}
}
