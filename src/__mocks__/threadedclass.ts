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
	on: Function
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
export function threadedClass<T> (orgModule: string, orgClass: Function, constructorArgs: any[] ): Promise<ThreadedClass<T>> {

	return new Promise((resolve, reject) => {
		let c = Object.create(orgClass.prototype)
		c.constructor.call(this, ...constructorArgs)
		let proxy = new ProxyClass() as ThreadedClass<T>
		for (const prop of Object.getOwnPropertyNames(orgClass)) {
			if (!new Set(['constructor', 'prototype']).has(prop)) {
				proxy[prop] = (...args: any) => new Promise(resolve => {
					resolve(c[prop](...args))
				})
			}
		}
		for (const prop of Object.getOwnPropertyNames(orgClass.prototype)) {
			proxy[prop] = (...args: any) => new Promise(resolve => {
				resolve(orgClass.prototype[prop](...args))
			})
		}
		proxy.on = (...args) => c.on(...args)
		resolve(proxy)
	})
}