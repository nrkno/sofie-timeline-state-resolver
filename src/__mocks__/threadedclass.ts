// import { cluster } from 'cluster'

// import * as callsites from 'callsites'
// import * as path from 'path'
import { InitPropDescriptor } from 'threadedclass/dist/lib'

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

			let descriptor = Object.getOwnPropertyDescriptor(c, prop)
			let inProto: number = 0
			let proto = c.__proto__
			while (!descriptor) {
				if (!proto) break
				descriptor = Object.getOwnPropertyDescriptor(proto, prop)
				inProto++
				proto = proto.__proto__
			}

			if (!descriptor) descriptor = {}

			let descr: InitPropDescriptor = {
				// configurable:	!!descriptor.configurable,
				inProto: 		inProto,
				enumerable:		!!descriptor.enumerable,
				writable:		!!descriptor.writable,
				get:			!!descriptor.get,
				set:			!!descriptor.set,
				readable:		!!(!descriptor.get && !descriptor.get) // if no getter or setter, ie an ordinary property
			}
			
			if (typeof c[prop] === 'function') {
				if (descr.inProto) {
					// @ts-ignore prototype is not in typings
					proxy.__proto__[prop] = (...args) => new Promise(resolve => resolve(c[prop](...args)))
				} else {
					proxy[prop] = (...args) => new Promise(resolve => resolve(c[prop](...args)))
				}
			} else {
				// proxy[prop] = () => new Promise(resolve => resolve(c[prop]))
				let m: PropertyDescriptor = {
					configurable: 	true, // We do not support configurable properties
					enumerable: 	descr.enumerable
					// writable: // We handle everything through getters & setters instead
				}
				if (
					descr.get ||
					descr.readable
				) {
					m.get = function () {
						return Promise.resolve(c[prop])
					}
				}
				if (
					descr.set ||
					descr.writable
				) {
					m.set = function (newVal) {
						c[prop] = newVal
						return Promise.resolve()
					}
				}
				console.log(prop, descr)
				Object.defineProperty(proxy, prop, m)
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
