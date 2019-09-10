import * as _ from 'underscore'
const request = require('../../__mocks__/request')
// const orgSetTimeout = setTimeout

/*
	This file mocks the server-side part of VMIX
*/

export function setupVmixMock () {
	const vmixServer: VmixServerMockOptions = {
		// add any vmix mocking of server-state here
		repliesAreGood: true,
		serverIsUp: true
	}

	// @ts-ignore: not logging
	const onRequest = jest.fn((type: string, url: string) => {
		// console.log('onRequest', type, url)
	})

	const onRequestRaw = jest.fn((type: string, url: string) => {
		onRequest(type, url)
	})

	const onGet		= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'get',	url, options, cb))
	const onPost	= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'post',	url, options, cb))
	const onPut		= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'put',	url, options, cb))
	const onHead	= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'head',	url, options, cb))
	const onPatch	= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'patch',url, options, cb))
	const onDel		= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'del',	url, options, cb))
	const onDelete	= jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'delete',url, options, cb))

	request.setMockGet(onGet)
	request.setMockPost(onPost)
	request.setMockPut(onPut)
	request.setMockHead(onHead)
	request.setMockPatch(onPatch)
	request.setMockDel(onDel)
	request.setMockDelete(onDelete)

	return {
		vmixServer,
		onRequest,
		onRequestRaw,
		onGet,
		onPost,
		onPut,
		onHead,
		onPatch,
		onDel,
		onDelete
	}
}

type Params = {[key: string]: any}
interface VmixServerMockOptions {
	repliesAreGood: boolean
	serverIsUp: boolean
}

function urlRoute (requestType: string, url: string, routes: {[route: string]: (params: Params) => object}): object {
	let body: any = {
		status: 404,
		message: `(Mock) Not found. Request ${requestType} ${url}`,
		stack: ''
	}

	const matchUrl = `${requestType} ${url}`
	let reroutedParams: any = null

	let found = false
	let routeKeys = Object.keys(routes).sort((a,b) => {
		if (a.length < b.length) return 1
		if (a.length > b.length) return -1
		return 0
	})
	routeKeys.forEach((route) => {
		if (!found) {
			const callback = routes[route]

			const paramList = route.match(/(:[^\/]+)/g) || []

			route = route.replace(/\?/g, '\\?')

			paramList.forEach((param) => {
				route = route.replace(param, '([^\\/&]+)')
			})
			const m = matchUrl.match(new RegExp(route))
			if (m) {
				const params: Params = {}
				paramList.forEach((param, index: number) => {
					const p = param.slice(1) // remove the prepended ':'
					params[p] = m[index + 1]
				})

				body = callback(reroutedParams || params)

				if (body.__reroute === true) {
					// reroute to another other route
					if (!reroutedParams) reroutedParams = params
				} else {
					found = true
				}
			}
		}
	})
	return body
}
function handleRequest (vmixServer: VmixServerMockOptions, triggerFcn: Function, type: string, url: string, bodyData: any, callback: (err: Error | null, value?: any) => void) {
	process.nextTick(() => {

		triggerFcn(type, url)

		try {
			const resource = (url.match(/http:\/\/[^\/]+(.*)/) || [])[1] || ''

			let body: object = {}

			if (!vmixServer.repliesAreGood) throw new Error('Bad mock reply')

			body = urlRoute(type, resource, {

				'post /my/little/path/:param0': (params) => {
					return {
						something: params.param0
					}
				}
			})

			callback(null, {
				statusCode: 200,
				body: JSON.stringify(body)
			})
		} catch (e) {
			callback(null, {
				statusCode: 500,
				body: JSON.stringify({
					status: 500,
					message: e.toString(),
					stack: e.stack || ''
				})
			})
		}
	})
}
