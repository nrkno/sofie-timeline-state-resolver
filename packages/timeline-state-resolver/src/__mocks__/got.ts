// import * as orgGot from 'got'

import { OptionsOfTextResponseBody } from 'got/dist/source'

// orgGot.default([
// 	asdf
// ])

// type Callback = (error: Error, result: any) => void

let _mockGet: (url: string | Options, options?: Options) => Promise<any>
let _mockPost: (url: string | Options, options?: Options) => Promise<any>
let _mockPut: (url: string | Options, options?: Options) => Promise<any>
let _mockHead: (url: string | Options, options?: Options) => Promise<any>
let _mockPatch: (url: string | Options, options?: Options) => Promise<any>
let _mockDel: (url: string | Options, options?: Options) => Promise<any>
let _mockDelete: (url: string | Options, options?: Options) => Promise<any>

type Options = Pick<OptionsOfTextResponseBody, 'url' | 'method' | 'json' | 'timeout' | 'responseType'>

const gotMethods = {
	// mock functions:
	setMockGet: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockGet = fcn
	},
	setMockPost: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockPost = fcn
	},
	setMockPut: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockPut = fcn
	},
	setMockHead: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockHead = fcn
	},
	setMockPatch: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockPatch = fcn
	},
	setMockDel: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockDel = fcn
	},
	setMockDelete: (fcn: (url: string | Options, options?: Options) => Promise<any>) => {
		_mockDelete = fcn
	},
	// ------------------
	// default: (url: string | Options, options?: Options) => {

	// },
	get: async (url: string | Options, options?: Options) => {
		return _mockGet(url, options)
	},
	post: async (url: string | Options, options?: Options) => {
		return _mockPost(url, options)
	},
	put: async (url: string | Options, options?: Options) => {
		return _mockPut(url, options)
	},
	head: async (url: string | Options, options?: Options) => {
		return _mockHead(url, options)
	},
	patch: async (url: string | Options, options?: Options) => {
		return _mockPatch(url, options)
	},
	del: async (url: string | Options, options?: Options) => {
		return _mockDel(url, options)
	},
	delete: async (url: string | Options, options?: Options) => {
		return _mockDelete(url, options)
	},
}
const got: any = (url: string | Options, options?: Options) => {
	const method = options?.method || (typeof url === 'object' && url.method) || 'GET'
	if (method === 'POST') return gotMethods.post(url, options)
	else if (method === 'GET') return gotMethods.get(url, options)
	else if (method === 'PUT') return gotMethods.put(url, options)
	else if (method === 'DELETE') return gotMethods.delete(url, options)
	else return 'ERROR: method not supported'
}
Object.keys(gotMethods).forEach((key) => {
	got[key] = gotMethods[key]
})
export default got
