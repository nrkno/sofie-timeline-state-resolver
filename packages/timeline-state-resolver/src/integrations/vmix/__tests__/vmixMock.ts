import * as net from '../../../__mocks__/net'

jest.mock('net', () => net)

const orgSetImmediate = setImmediate

/*
	This file mocks the server-side part of VMIX
*/

const COMMAND_REGEX = /^(?<command>\w+)(?:\s+(?<function>\w+)?(?:\s+(?<args>.+))?)?$/

export function makeMockVMixXmlState(inputs?: string[]): string {
	const defaultInputs = `<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="1" type="Capture" title="Cam 1" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>\r\n
	<input key="1a50938d-c653-4eae-bc4c-24d9c12fa773" number="2" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="True" volume="100" balance="0" solo="False" audiobusses="M,C" meterF1="0.0007324442" meterF2="0.0007629627"></input>`
	return `<vmix>\r\n
<version>21.0.0.55</version>\r\n
<edition>HD</edition>\r\n
<preset>C:\\Users\\server\\AppData\\Roaming\\last.vmix</preset>\r\n
<inputs>\r\n
${inputs?.join('\r\n') ?? defaultInputs}\r\n
</inputs>\r\n
<overlays>\r\n
<overlay number="1"/>\r\n
<overlay number="2"/>\r\n
<overlay number="3"/>\r\n
<overlay number="4"/>\r\n
<overlay number="5"/>\r\n
<overlay number="6"/>\r\n
</overlays>\r\n
<preview>2</preview>
<active>1</active>
<fadeToBlack>False</fadeToBlack>
<transitions>
<transition number="1" effect="Fade" duration="500"/>
<transition number="2" effect="Merge" duration="1000"/>
<transition number="3" effect="Wipe" duration="1000"/>
<transition number="4" effect="CubeZoom" duration="1000"/>
</transitions>
<recording duration="25519">True</recording>
<external>True</external>
<streaming>True</streaming>
<playList>False</playList>
<multiCorder>False</multiCorder>
<fullscreen>False</fullscreen>
<audio>
<master volume="100" muted="False" meterF1="0.04211706" meterF2="0.04211706" headphonesVolume="74.80521"/>
<busA volume="100" muted="False" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
<busB volume="78.07491" muted="False" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
<busC volume="100" muted="False" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
<busD volume="100" muted="False" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
<busE volume="100" muted="True" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
<busF volume="100" muted="False" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
<busG volume="100" muted="False" meterF1="0" meterF2="0" solo="False" sendToMaster="False"/>
</audio>
</vmix>\r\n`
}

export function setupVmixMock() {
	const vmixServer: VmixServerMockOptions = {
		// add any vmix mocking of server-state here
		repliesAreGood: true,
		serverIsUp: true,
	}

	const onFunction = jest.fn((_funcName: string, _funcArgs: string | null) => {
		// noop
	})

	const onXML = jest.fn(() => {
		// noop
	})

	const onData = jest.fn((data, encoding, socket: net.Socket) => {
		handleData(data, encoding, socket, onFunction, onXML)
	})

	const onConnect = jest.fn((_port: number, _host: string) => {
		// noop
	})

	net.Socket.mockOnNextSocket((socket) => {
		socket.onConnect = onConnect
		socket.onWrite = (data, encoding) => onData(data, encoding, socket)
	})

	const disconnectAll = () => {
		for (const socket of net.Socket.mockSockets()) {
			socket.mockClose()
		}
	}

	return {
		vmixServer,
		onConnect,
		onData,
		onFunction,
		onXML,
		disconnectAll,
	}
}

interface VmixServerMockOptions {
	repliesAreGood: boolean
	serverIsUp: boolean
}

function handleData(
	data: Buffer,
	encoding: BufferEncoding,
	socket: net.Socket,
	funcClb: (funcName: string, funcArgs: string | null) => void,
	xmlClb: () => void
) {
	const lines = data.toString(encoding).split('\r\n')

	for (const line of lines) {
		const match = line.match(COMMAND_REGEX)
		if (!match) continue
		const command = match.groups?.['command']
		const funcName = match.groups?.['function']
		const funcArgs = match.groups?.['args']
		if (!command) continue

		switch (command) {
			case 'XML':
				xmlClb()
				sendData(socket, buildResponse('XML', undefined, makeMockVMixXmlState()))
				break
			case 'FUNCTION':
				if (!funcName) throw new Error('Empty function name!')
				funcClb(funcName, funcArgs ?? null)
				sendData(socket, buildResponse(command, 'OK', funcName))
				break
			default:
				throw new Error(`Unknown command: "${command}"`)
		}
	}
}

function buildResponse(command: string, state?: 'OK' | 'ER', dataOrMessage?: string): string[] {
	const result: string[] = []

	let firstLine = command
	let hasData = false
	if (state) {
		firstLine += ` ${state}`
		if (dataOrMessage) firstLine += ` ${dataOrMessage}`
	} else if (dataOrMessage) {
		firstLine += ` ${dataOrMessage?.length}`
		hasData = true
	}

	firstLine += '\r\n'

	result.push(firstLine)
	if (hasData && dataOrMessage) {
		result.push(dataOrMessage)
	}

	return result
}

// send every item in the array in a separate `data` event/packet
function sendData(socket: net.Socket, response: string[]) {
	for (const packet of response) {
		orgSetImmediate(() => {
			socket.mockData(packet)
		})
	}
}
