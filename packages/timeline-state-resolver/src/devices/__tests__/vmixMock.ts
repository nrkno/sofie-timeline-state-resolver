import * as net from '../../__mocks__/net'

jest.mock('net', () => net)

// const orgSetTimeout = setTimeout

/*
	This file mocks the server-side part of VMIX
*/

const COMMAND_REGEX = /^(?<command>\w+)(?:\s+(?<function>[\w\d]+)?(?:\s+(?<args>.+))?)?$/

const vmixMockState = `<vmix>
<version>21.0.0.55</version>
<edition>HD</edition>
<preset>C:\\Users\\server\\AppData\\Roaming\\last.vmix</preset>
<inputs>
<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="1" type="Capture" title="Cam 1" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>
<input key="1a50938d-c653-4eae-bc4c-24d9c12fa773" number="2" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="True" volume="100" balance="0" solo="False" audiobusses="M,C" meterF1="0.0007324442" meterF2="0.0007629627"></input>
</inputs>
<overlays>
<overlay number="1"/>
<overlay number="2"/>
<overlay number="3"/>
<overlay number="4"/>
<overlay number="5"/>
<overlay number="6"/>
</overlays>
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
</audio>
</vmix>`

export function setupVmixMock() {
	const vmixServer: VmixServerMockOptions = {
		// add any vmix mocking of server-state here
		repliesAreGood: true,
		serverIsUp: true,
	}

	const onFunction = jest.fn((_funcName: string, _funcArgs: string) => {
		// noop
	})

	const onData = jest.fn((data, encoding, socket: net.Socket) => {
		handleData(data, encoding, socket, onFunction)
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
		onData,
		onFunction,
		onConnect,
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
	clb: (funcName: string, funcArgs: string) => void
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
				sendData(socket, buildResponse('XML', undefined, vmixMockState.replace(/[\r\n]/g, '')))
				break
			default:
				if (funcName) clb(funcName, funcArgs ?? '')
				sendData(socket, buildResponse(command, 'OK', funcName))
				break
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

	result.push(firstLine)
	if (hasData && dataOrMessage) result.push(dataOrMessage)

	return result
}

function sendData(socket: net.Socket, response: string | string[]) {
	const dataStr = Array.isArray(response) ? response.join('\r\n') : response
	const dataBuf = Buffer.from(dataStr, 'utf-8')

	process.nextTick(() => {
		socket.mockData(dataBuf)
	})
}
