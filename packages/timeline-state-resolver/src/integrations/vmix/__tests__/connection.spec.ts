/* eslint-disable @typescript-eslint/unbound-method */
import { mock } from 'jest-mock-extended'
import { VMixCommandSender, VMixConnection } from '../connection'
import { VMixCommand } from 'timeline-state-resolver-types'

function createTestee() {
	const mockConnection = mock<VMixConnection>()
	const sender = new VMixCommandSender(mockConnection)
	return { mockConnection, sender }
}

describe('VMixCommandSender', () => {
	it('sends layer input', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SET_LAYER_INPUT,
			index: 2,
			input: 5,
			value: 7,
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SetMultiViewOverlay', {
			input: 5,
			value: '2,7',
		})
	})

	it('sends layer crop', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SET_LAYER_CROP,
			index: 2,
			input: 5,
			cropLeft: 0.1,
			cropTop: 0.2,
			cropRight: 0.3,
			cropBottom: 0.4,
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SetLayer2Crop', {
			input: 5,
			value: '0.1,0.2,0.3,0.4',
		})
	})

	it('sends layer zoom', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SET_LAYER_ZOOM,
			index: 3,
			input: 6,
			value: 1.5,
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SetLayer3Zoom', {
			input: 6,
			value: 1.5,
		})
	})

	it('sends layer panX', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SET_LAYER_PAN_X,
			index: 3,
			input: 6,
			value: 1.5,
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SetLayer3PanX', {
			input: 6,
			value: 1.5,
		})
	})

	it('sends layer panY', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SET_LAYER_PAN_Y,
			index: 3,
			input: 6,
			value: 1.5,
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SetLayer3PanY', {
			input: 6,
			value: 1.5,
		})
	})

	it('sets text', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SET_TEXT,
			input: 5,
			value: 'Foo',
			fieldName: 'myTitle.Text',
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SetText', {
			input: 5,
			value: 'Foo',
			selectedName: 'myTitle.Text',
		})
	})

	it('sends url', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.BROWSER_NAVIGATE,
			input: 5,
			value: 'https://example.com',
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('BrowserNavigate', {
			input: 5,
			value: 'https%3A%2F%2Fexample.com',
		})
	})
	it('selects index', async () => {
		const { sender, mockConnection } = createTestee()
		await sender.sendCommand({
			command: VMixCommand.SELECT_INDEX,
			input: 5,
			value: 3,
		})

		expect(mockConnection.sendCommandFunction).toHaveBeenCalledTimes(1)
		expect(mockConnection.sendCommandFunction).toHaveBeenLastCalledWith('SelectIndex', {
			input: 5,
			value: 3,
		})
	})
})
