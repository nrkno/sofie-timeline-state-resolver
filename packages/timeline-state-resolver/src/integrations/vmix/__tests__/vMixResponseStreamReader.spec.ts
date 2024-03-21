import { VMixResponseStreamReader } from '../vMixResponseStreamReader'

describe('VMixResponseStreamReader', () => {
	test('the helper uses byte length of strings', () => {
		// this is a meta-test for the helper used in unit tests below, to assert that the data length is in bytes (utf-8), not characters
		expect(makeXmlMessage('<vmix>abc</vmix>')).toBe('XML 18\r\n<vmix>abc</vmix>\r\n')
		expect(makeXmlMessage('<vmix>abc¾</vmix>')).toBe('XML 20\r\n<vmix>abc¾</vmix>\r\n')
		expect(makeXmlMessage('<vmix>abc🚀🚀</vmix>')).toBe('XML 26\r\n<vmix>abc🚀🚀</vmix>\r\n')
	})

	it('processes a complete message', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
	})

	it('processes two complete messages', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\n'))
		reader.processIncomingData(Buffer.from('FUNCTION OK Take\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'OK',
				message: 'Take',
			})
		)
	})

	it('processes a fragmented message #1', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION O'))
		reader.processIncomingData(Buffer.from('K 27.0.0.49\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
	})

	it('processes a fragmented message #2', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\n'))
		reader.processIncomingData(Buffer.from('FUNCTION'))
		reader.processIncomingData(Buffer.from(' ER Error message\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'ER',
				message: 'Error message',
			})
		)
	})

	it('processes a fragmented message #3', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49'))
		reader.processIncomingData(Buffer.from('\r\n'))
		reader.processIncomingData(Buffer.from('FUNCTION'))
		reader.processIncomingData(Buffer.from(' ER Error message\r'))
		reader.processIncomingData(Buffer.from('\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'ER',
				message: 'Error message',
			})
		)
	})

	it('processes combined messages #1', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\nFUNCTION ER Error message\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'ER',
				message: 'Error message',
			})
		)
	})

	it('processes combined messages #2', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\nFUNCTION E'))
		reader.processIncomingData(Buffer.from('R Error message\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'ER',
				message: 'Error message',
			})
		)
	})

	it('processes combined messages #3', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\nFUNCTION E'))
		reader.processIncomingData(Buffer.from('R Error message\r\nFUNCTION OK T'))
		reader.processIncomingData(Buffer.from('ake\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(3)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'ER',
				message: 'Error message',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'OK',
				message: 'Take',
			})
		)
	})

	it('processes a message with data', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix><version>27.0.0.49</version><edition>HD</edition><preset>C:\\preset.vmix</preset><inputs><inputs></vmix>'
		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString)))

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
	})

	it('processes a message with data containing multi-byte characters', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix><version>27.0.0.49</version><edition>HD</edition><preset>C:\\🚀\\preset3¾.vmix</preset><inputs><inputs></vmix>'
		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString)))

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
	})

	it('processes a fragmented message with data containing multi-byte characters, split mid-character', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString = '<vmix>🚀🚀</vmix>'
		const xmlMessage = `XML 23\r\n${xmlString}\r\n`
		const fullBuffer = Buffer.from(xmlMessage)

		const firstPart = fullBuffer.slice(0, 16)
		const secondPart = fullBuffer.slice(16)

		// sanity check that we did actually split mid-character
		expect(firstPart.toString('utf-8') + secondPart.toString('utf-8')).not.toBe(xmlMessage)

		reader.processIncomingData(firstPart)
		reader.processIncomingData(secondPart)

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
	})

	it('processes a multiline message with data', async () => {
		// note: I don't know if those can actually be encountered

		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix>\r\n<version>27.0.0.49</version>\r\n<edition>HD</edition>\r\n<preset>C:\\preset.vmix</preset>\r\n<inputs><inputs>\r\n</vmix>'
		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString)))

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
	})

	it('processes a fragmented message with data', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix><version>27.0.0.49</version><edition>HD</edition><preset>C:\\preset.vmix</preset><inputs><inputs></vmix>'
		const xmlMessage = makeXmlMessage(xmlString)
		splitAtIndices(xmlMessage, [2, 10, 25, 40]).forEach((fragment) => {
			expect(fragment.length).toBeGreaterThan(0)
			reader.processIncomingData(Buffer.from(fragment))
		})

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
	})

	it('processes combined messages with data', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix><version>27.0.0.49</version><edition>HD</edition><preset>C:\\preset.vmix</preset><inputs><inputs></vmix>'
		const xmlString2 = '<vmix><version>25.0.0.1</version><edition>4K</edition><inputs><inputs></vmix>'

		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString) + makeXmlMessage(xmlString2)))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString2,
			})
		)
	})

	it('processes separate messages with data', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix><version>27.0.0.49</version><edition>HD</edition><preset>C:\\preset.vmix</preset><inputs><inputs></vmix>'
		const xmlString2 = '<vmix><version>25.0.0.1</version><edition>4K</edition><inputs><inputs></vmix>'

		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString)))
		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString2)))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString,
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString2,
			})
		)
	})

	it('can be reset during incomplete message', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)

		const xmlString =
			'<vmix><version>27.0.0.49</version><edition>HD</edition><preset>C:\\preset.vmix</preset><inputs><inputs></vmix>'
		const xmlString2 = '<vmix><version>25.0.0.1</version><edition>4K</edition><inputs><inputs></vmix>'

		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString).substring(0, 44)))
		reader.reset()
		reader.processIncomingData(Buffer.from(makeXmlMessage(xmlString2)))

		expect(onMessage).toHaveBeenCalledTimes(1)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'XML',
				response: 'OK',
				body: xmlString2,
			})
		)
	})

	it('catches errors thrown in response handler', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn(() => {
			throw Error('Something went wrong')
		})
		reader.on('response', onMessage)
		const onError = jest.fn()
		reader.on('error', onError)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\n'))
		reader.processIncomingData(Buffer.from('FUNCTION OK Take\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'OK',
				message: 'Take',
			})
		)

		expect(onError).toHaveBeenCalledTimes(2)
	})

	it('rejects empty messages silently', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)
		const onError = jest.fn()
		reader.on('error', onError)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\n'))
		reader.processIncomingData(Buffer.from('\r\n'))
		reader.processIncomingData(Buffer.from('FUNCTION OK Take\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'OK',
				message: 'Take',
			})
		)

		expect(onError).toHaveBeenCalledTimes(0)
	})

	it('rejects invalid messages and emits error', async () => {
		const reader = new VMixResponseStreamReader()

		const onMessage = jest.fn()
		reader.on('response', onMessage)
		const onError = jest.fn()
		reader.on('error', onError)

		reader.processIncomingData(Buffer.from('VERSION OK 27.0.0.49\r\n'))
		reader.processIncomingData(Buffer.from('WASSUP\r\n'))
		reader.processIncomingData(Buffer.from('FUNCTION OK Take\r\n'))

		expect(onMessage).toHaveBeenCalledTimes(2)
		expect(onMessage).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				command: 'VERSION',
				response: 'OK',
			})
		)
		expect(onMessage).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				command: 'FUNCTION',
				response: 'OK',
				message: 'Take',
			})
		)

		expect(onError).toHaveBeenCalledTimes(1)
	})
})

function makeXmlMessage(xmlString: string): string {
	// the length of the data is in bytes, not characters!
	return `XML ${Buffer.byteLength(xmlString, 'utf-8') + 2}\r\n${xmlString}\r\n`
}

function splitAtIndices(text: string, indices: number[]) {
	const result: string[] = []
	let lastIndex = 0

	indices.forEach((index) => {
		if (index > lastIndex && index < text.length) {
			result.push(text.substring(lastIndex, index))
			lastIndex = index
		}
	})

	if (lastIndex < text.length) {
		result.push(text.substring(lastIndex))
	}

	return result
}
