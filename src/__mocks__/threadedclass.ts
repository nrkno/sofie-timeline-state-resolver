// import { cluster } from 'cluster'

// import * as callsites from 'callsites'
// import * as path from 'path'

// TODO: change this as Variadic types are implemented in TS
// https://github.com/Microsoft/TypeScript/issues/5453
export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any

export type Promisify<T> = {
	[K in keyof T]: (...args: any[]) => Promise<ReturnType<T[K]>>
}

export interface IProxy {
	_destroyChild: Function
	_orgClass: Function
}
export class ProxyClass {
	public _destroyChild: Function
}

export type ThreadedClass<T> = IProxy & Promisify<T>

/**
 * Returns an asynchronous version of the provided class
 * @param orgModule Path to imported module (this is what is in the require('XX') function, or import {class} from 'XX'} )
 * @param orgClass The class to be threaded
 * @param constructorArgs An array of arguments to be fed into the class constructor
 */
export function threadedClass<T> (orgModule: string, orgClass: any, constructorArgs: any[]): Promise<ThreadedClass<T>> {

	return new Promise((resolve, reject) => {
		let c = new orgClass(...constructorArgs)
		let proxy = new ProxyClass() as ThreadedClass<T>
		proxy._orgClass = c

		let allProps = getAllProperties(c)
		allProps.forEach((prop: string) => {
			if ([
				'constructor',
				'windows',
				'constructor',
				'__defineGetter__',
				'__defineSetter__',
				'hasOwnProperty',
				'__lookupGetter__',
				'__lookupSetter__',
				'isPrototypeOf',
				'propertyIsEnumerable',
				'toString',
				'valueOf',
				'__proto__',
				'toLocaleString'
			].indexOf(prop) !== -1) return
			if (typeof c[prop] === 'function') {
				proxy[prop] = (...args) => new Promise(resolve => resolve(c[prop](...args)))
			} else {
				// proxy[prop] = () => new Promise(resolve => resolve(c[prop]))
				Object.defineProperty(proxy, prop, {
					get: function () {
						return Promise.resolve(c[prop])
					},
					set: function (val) {
						c[prop] = val
						return Promise.resolve()
					},
					configurable: true
				})
			}
		})

		resolve(proxy)
	})
}

function getAllProperties (obj: Object) {
	let props: Array<string> = []

	do {
		props = props.concat(Object.getOwnPropertyNames(obj))
		obj = Object.getPrototypeOf(obj)
	} while (obj)
	return props
}
