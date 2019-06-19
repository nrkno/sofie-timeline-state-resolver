jest.mock('request')

import * as _ from 'underscore'
import { QuantelGateway, Q } from '../quantelGateway'

const request = require('../../__mocks__/request')

const orgSetTimeout = setTimeout

type Params = {[key: string]: any}
function urlRoute (requestType: string, url: string, routes: {[route: string]: (params: Params) => object}): object {
	let body: object = {
		status: 404,
		message: `(Mock) Not found. Request ${requestType} ${url}`,
		stack: ''
	}

	const matchUrl = `${requestType} ${url}`
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
				body = callback(params)
				found = true
			}
		}
	})
	return body
}
function wait (time: number = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}
interface ErrorResponse {
	status: number
	message: string,
	stack: string
}
describe('QuantelGateway', () => {
	let requestReturnsOK = true
	let ISAServerIsUp = true
	function handleRequest (type: string, url: string, bodyData: any, callback) {
		orgSetTimeout(() => {

			try {
				const resource = url.match(/http:\/\/[^\/]+(.*)/)[1] || ''

				let body: object = {}
				let m: any

				body = urlRoute(type, resource, {
					'post /connect/:isaURL': (params) => {
						return {
							something: 1234
						}
					},
					'get /:zoneID/server': (params): Q.ServerInfo[] => {
						return [{
							type: 'Server',
							ident: 1100,
							down: !ISAServerIsUp,
							name: 'Dummy 1100',
							numChannels: 4,
							pools: [ 11 ],
							portNames: [],
							chanPorts: [ '', '', '', '' ]
						}, {
							type: 'Server',
							ident: 1200,
							down: !ISAServerIsUp,
							name: 'Dummy 1200',
							numChannels: 2,
							pools: [ 12 ],
							portNames: [],
							chanPorts: [ '', '' ]
						}, {
							type: 'Server',
							ident: 1300,
							down: !ISAServerIsUp,
							name: 'Dummy 1300',
							numChannels: 3,
							pools: [ 13 ],
							portNames: [],
							chanPorts: [ '', '', '' ]
						}]
					},
					// Create Port:
					'put /:zoneID/server/:serverID/port/:portID/channel/:channelID': (params): Q.PortInfo => {
						return {
							type: 'PortInfo',
							serverID: params.serverID,
							channelNo: params.channelID,
							audioOnly: false,
							portName:  params.portID,
							portID: 2,
							assigned: true
						}
					},
					// Release Port
					'delete /:zoneID/server/:serverID/port/:portID': (params): Q.ReleaseStatus => {
						return {
							type: 'ReleaseStatus',
							serverID: params.serverID,
							portName:  params.portID,
							released: true
						}
					},
					// Port info:
					'get /:zoneID/server/:serverID/port/:portID': (params): Q.PortStatus => {
						return {
							type: 'PortStatus',
							serverID: params.serverID,
							portName: 'fred',
							refTime: '14:47:31:00',
							portTime: '10:00:15:03',
							portID: params.portID,
							speed: 1,
							offset: 0,
							status: 'unknown',
							endOfData: 0,
							framesUnused: 0,
							channels: [ 1 ],
							outputTime: '00:00:00:00'
						}
					},
					// Search for clip:
					'get /:zoneID/clip?Title=:title': (params): Q.ClipDataSummary[] => {
						return _.filter([
							{
								type: 'ClipDataSummary',
								ClipID: 2,
								CloneID: 2,
								Completed: '2019-06-12T11:18:37.000Z',
								Created: '2019-06-12T11:18:37.000Z',
								Description: '',
								Frames: '1000',
								Owner: '',
								PoolID: 11,
								Title: 'Test0'
							}
						], (clip) => {
							return clip.Title === params.title
						})
					},
					// get clip info:
					'get /:zoneID/clip/:clipID': (params): Q.ClipData | ErrorResponse => {
						const clips = _.filter<Q.ClipData>([
							{
								type: 'ClipData',
								Category: '',
								ClipID: 2,
								CloneID: 2,
								CloneZone: 1000,
								Completed: '2019-06-12T11:18:37.000Z',
								Created: '2019-06-12T11:18:37.000Z',
								Description: '',
								Destination: null,
								Expiry: null,
								Frames: '1000',
								HasEditData: 0,
								Inpoint: null,
								JobID: null,
								Modified: null,
								NumAudTracks: 1,
								Number: null,
								NumVidTracks: 1,
								Outpoint: null,
								Owner: '',
								PlaceHolder: false,
								PlayAspect: '',
								PoolID: 11,
								PublishedBy: '',
								Register: '0',
								Tape: '',
								Template: 0,
								Title: 'Test0',
								UnEdited: 1,
								PlayMode: '',
								MosActive: false,
								Division: '',
								AudioFormats: '73',
								VideoFormats: '90',
								ClipGUID: '0b124a741fa84c3eb7a707d13cc1f5aa',
								Protection: '',
								VDCPID: '',
								PublishCompleted: '2019-06-12T11:18:37.000Z'
							}
						], (clip) => {
							return clip.ClipID + '' === params.clipID
						})
						if (clips[0]) return clips[0]

						return {
							status: 404,
							message: `Not found. A clip with identifier '${params.clipID}' was not found.`,
							stack: ''
						}
					},
					// get clip fragments:
					'get /:zoneID/clip/:clipID/fragments': (params): Q.ServerFragments | ErrorResponse => {
						if (params.clipID === '2') {
							const fragments: Q.ServerFragmentTypes[] = [
								{
									type: 'VideoFragment',
									trackNum: 0,
									start: 0,
									finish: 1000,
									rushID: '1bb281cdcb7c491085c1b2fac53e4db1',
									format: 90,
									poolID: 11,
									poolFrame: 5,
									skew: 0,
									rushFrame: 0
								},
								{
									type: 'EffectFragment',
									trackNum: 0,
									start: 0,
									finish: 20,
									effectID: 256
								},
								{
									type: 'EffectFragment',
									trackNum: 0,
									start: 20,
									finish: 1000,
									effectID: 256
								},
								{
									type: 'AudioFragment',
									trackNum: 0,
									start: 0,
									finish: 1000,
									rushID: '353a81482189451e8c56c5de72fdecac',
									format: 73,
									poolID: 11,
									poolFrame: 8960,
									skew: 0,
									rushFrame: 0
								}
							]
							return {
								type: 'ServerFragments',
								clipID: 2,
								fragments: fragments
							}
						}

						return {
							status: 404,
							message: `Not found. A clip with identifier '${params.clipID}' was not found.`,
							stack: ''
						}
					},
					// Load fragments onto port:
					'post /:zoneID/server/:serverID/port/:portID/fragments': (params): Q.PortStatus | ErrorResponse => {
						if (params.portID === 'my_port') {

							if (!_.isArray(bodyData)) throw new Error('Bad body data')

							return {
								type: 'PortStatus',
								serverID: params.serverID,
								portName: 'fred',
								refTime: '14:47:31:00',
								portTime: '10:00:15:03',
								portID: params.portID,
								speed: 1,
								offset: 0,
								status: 'unknown',
								endOfData: 0,
								framesUnused: 0,
								channels: [ 1 ],
								outputTime: '00:00:00:00'
							}
						}

						return {
							status: 404,
							message: `Wrong port id '${params.portID}'`,
							stack: ''
						}
					},
					'get /': (): Q.ZoneInfo[] => {
						return [
							{
								type: 'ZonePortal',
								zoneNumber: 1000,
								zoneName: 'default',
								isRemote: false
							}
						]
					}
				})

				callback(null, {
					statusCode: (requestReturnsOK ? 200 : 500),
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
		}, 1)
	}
	let onGet		= jest.fn((url, options, cb) => handleRequest('get',	url, options, cb))
	let onPost		= jest.fn((url, options, cb) => handleRequest('post',	url, options, cb))
	let onPut		= jest.fn((url, options, cb) => handleRequest('put',	url, options, cb))
	let onHead		= jest.fn((url, options, cb) => handleRequest('head',	url, options, cb))
	let onPatch		= jest.fn((url, options, cb) => handleRequest('patch',	url, options, cb))
	let onDel		= jest.fn((url, options, cb) => handleRequest('del',	url, options, cb))
	let onDelete	= jest.fn((url, options, cb) => handleRequest('delete',	url, options, cb))

	request.setMockGet(onGet)
	request.setMockPost(onPost)
	request.setMockPut(onPut)
	request.setMockHead(onHead)
	request.setMockPatch(onPatch)
	request.setMockDel(onDel)
	request.setMockDelete(onDelete)

	beforeEach(() => {
		// jest.useFakeTimers()
		// @ts-ignore
		// WebSocket.clearMockInstances()
		onGet.mockClear()
		onPost.mockClear()
		onPut.mockClear()
		onHead.mockClear()
		onPatch.mockClear()
		onDel.mockClear()
		onDelete.mockClear()
	})
	test('Connectivity', async () => {
		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init(
			'localhost:3000',
			'myISA:8000',
			undefined, // fallback to 'default'
			1100
		)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(onPost).toHaveBeenCalledWith('http://localhost:3000/connect/myISA%3A8000', undefined, expect.any(Function))

		expect(quantel.gatewayUrl).toEqual('http://localhost:3000')
		expect(quantel.ISAUrl).toEqual('myISA:8000')
		expect(quantel.zoneId).toEqual('default')
		expect(quantel.serverId).toEqual(1100)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Connection status', async () => {
		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init(
			'localhost:3000',
			'myISA:8000',
			undefined, // fallback to 'default'
			1100
		)
		const onStatusChange = jest.fn()
		quantel.checkStatusInterval = 300
		quantel.monitorServerStatus(onStatusChange)

		await wait(100)

		expect(quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(true, null)
		onStatusChange.mockClear()

		ISAServerIsUp = false
		await wait(quantel.checkStatusInterval)

		expect(!quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(false, 'Server 1100 is down')
		onStatusChange.mockClear()

		ISAServerIsUp = true
		await wait(quantel.checkStatusInterval)

		expect(quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(true, null)
		onStatusChange.mockClear()

	})
	test('Create a port', async () => {

		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init('localhost:3000', 'myISA:8000', undefined, 1100)
		await quantel.createPort('my_port', 3)

		expect(onPut).toHaveBeenCalledTimes(1)
		expect(onPut).toHaveBeenCalledWith('http://localhost:3000/default/server/1100/port/my_port/channel/3', undefined, expect.any(Function))

		await quantel.releasePort('my_port')
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledWith('http://localhost:3000/default/server/1100/port/my_port', undefined, expect.any(Function))

		expect(onError).toHaveBeenCalledTimes(0)

	})
	test('Load Clip onto a port', async () => {

		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init('localhost:3000', 'myISA:8000', undefined, 1100)
		const portInfo = await quantel.createPort('my_port', 3)

		expect(portInfo).toMatchObject({
			portID: expect.any(Number),
			portName: expect.stringContaining('my_port')
		})
		const portId = portInfo.portName

		const clipsSummary = await quantel.searchClip({ Title: 'Test0' })
		expect(clipsSummary).toHaveLength(1)
		const clipSummary = clipsSummary[0]

		expect(clipSummary).toMatchObject({
			ClipID: expect.any(Number)
		})

		const clip = await quantel.getClip(clipSummary.ClipID)
		expect(clip).toMatchObject({
			ClipID: clipSummary.ClipID,
			Title: 'Test0'
		})

		const fragmentInfo = await quantel.getClipFragments(clip.ClipID)

		expect(fragmentInfo.fragments).toHaveLength(4)

		const response = await quantel.loadFragmentsOntoPort(portId, fragmentInfo.fragments)
		expect(response).toMatchObject({
			portID: 'my_port'
		})

		expect(onError).toHaveBeenCalledTimes(0)

	})
})
