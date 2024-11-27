import { FocusDirection, FocusMode, PanTiltDirection, PresetOperation, ZoomDirection } from '../../enums'
import {
	FocusCommand,
	FocusModeCommand,
	FocusOnePushTriggerCommand,
	PanTiltDriveCommand,
	PresetCommand,
	PresetDriveSpeedCommand,
	ZoomCommand,
	ZoomDirectCommand,
} from '../visca'
import { FocusDirectCommand } from '../visca/focusDirectCommand'
import { PanTiltDriveAbsoluteCommand } from '../visca/panTiltDriveAbsoluteCommand'

describe('Visca Commands', () => {
	describe('FocusCommand', () => {
		it('should serialize with default speed', () => {
			const command = new FocusCommand(FocusDirection.NearStandard)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x08, FocusDirection.NearStandard, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with variable speed (far)', () => {
			const direction = FocusDirection.FarVariable
			const speed = 5
			const command = new FocusCommand(direction, speed)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x08, direction + speed, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with variable speed (near)', () => {
			const direction = FocusDirection.NearVariable
			const speed = 3
			const command = new FocusCommand(direction, speed)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x08, direction + speed, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should handle zero speed correctly', () => {
			const command = new FocusCommand(FocusDirection.FarVariable, 0)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x08, FocusDirection.FarVariable, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('FocusDirectCommand', () => {
		it('should serialize a 4-digit position correctly', () => {
			const position = 0x1234
			const command = new FocusDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x48, 0x01, 0x02, 0x03, 0x04, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize a 0 position correctly', () => {
			const position = 0
			const command = new FocusDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x48, 0x00, 0x00, 0x00, 0x00, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize a position with leading zeros correctly', () => {
			const position = 0x0056
			const command = new FocusDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x48, 0x00, 0x00, 0x05, 0x06, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should handle positions shorter than 4 digits correctly', () => {
			const position = 0x0789
			const command = new FocusDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x48, 0x00, 0x07, 0x08, 0x09, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize the maximum 4-digit position correctly', () => {
			const position = 0xffff
			const command = new FocusDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x48, 0x0f, 0x0f, 0x0f, 0x0f, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('FocusModeCommand', () => {
		it('should serialize with auto focus mode', () => {
			const command = new FocusModeCommand(FocusMode.Auto)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x38, FocusMode.Auto, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with manual focus mode', () => {
			const command = new FocusModeCommand(FocusMode.Manual)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x38, FocusMode.Manual, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('FocusOnePushTriggerCommand', () => {
		it('should serialize the one-push focus trigger command', () => {
			const command = new FocusOnePushTriggerCommand()
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x18, 0x01, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('PanTiltDriveCommand', () => {
		it('should serialize with default pan and tilt speeds', () => {
			const command = new PanTiltDriveCommand(PanTiltDirection.Stop)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x06, 0x01, 0x00, 0x00, 0x03, 0x03, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with specified pan and tilt speeds', () => {
			const panSpeed = 5
			const tiltSpeed = 7
			const command = new PanTiltDriveCommand(PanTiltDirection.Down, panSpeed, tiltSpeed)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x06, 0x01, 0x05, 0x07, 0x03, 0x02, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with maximum pan and tilt speeds', () => {
			const panSpeed = 24
			const tiltSpeed = 24
			const command = new PanTiltDriveCommand(PanTiltDirection.DownRight, panSpeed, tiltSpeed)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x06, 0x01, 0x18, 0x18, 0x02, 0x02, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should handle zero pan and tilt speeds correctly', () => {
			const command = new PanTiltDriveCommand(PanTiltDirection.Left, 0, 0)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x06, 0x01, 0x00, 0x00, 0x01, 0x03, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('PanTiltDriveAbsoluteCommand', () => {
		it('should serialize correctly for given pan and tilt positions and speeds', () => {
			const panPosition = 0x12345
			const tiltPosition = 0x89abc
			const panSpeed = 0x05
			const tiltSpeed = 0x06
			const command = new PanTiltDriveAbsoluteCommand(panPosition, tiltPosition, panSpeed, tiltSpeed)
			const serialized = command.serialize()

			const expected = Buffer.from([
				0x81,
				0x01,
				0x06,
				0x01,
				panSpeed,
				tiltSpeed,
				0x01,
				0x02,
				0x03,
				0x04,
				0x05,
				0x08,
				0x09,
				0x0a,
				0x0b,
				0x0c,
				0xff,
			])

			expect(serialized).toEqual(expected)
		})
	})

	describe('PresetCommand', () => {
		it('should serialize with a recall operation and memory number', () => {
			const command = new PresetCommand(PresetOperation.Recall, 1)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x3f, PresetOperation.Recall, 1, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with a set operation and memory number', () => {
			const command = new PresetCommand(PresetOperation.Set, 2)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x3f, PresetOperation.Set, 2, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with a reset operation and memory number', () => {
			const command = new PresetCommand(PresetOperation.Reset, 3)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x3f, PresetOperation.Reset, 3, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('PresetDriveSpeedCommand', () => {
		it('should serialize with specified memory number and speed', () => {
			const memoryNumber = 1
			const speed = 5
			const command = new PresetDriveSpeedCommand(memoryNumber, speed)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x7e, 0x01, 0x0b, memoryNumber, speed, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with minimum memory number and speed', () => {
			const memoryNumber = 0
			const speed = 0
			const command = new PresetDriveSpeedCommand(memoryNumber, speed)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x7e, 0x01, 0x0b, memoryNumber, speed, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with maximum memory number and speed', () => {
			const memoryNumber = 99
			const speed = 24
			const command = new PresetDriveSpeedCommand(memoryNumber, speed)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x7e, 0x01, 0x0b, 0x63, 0x18, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('ZoomCommand', () => {
		it('should serialize with default speed', () => {
			const command = new ZoomCommand(ZoomDirection.WideStandard)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x07, ZoomDirection.WideStandard, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with specified variable speed (tele)', () => {
			const command = new ZoomCommand(ZoomDirection.TeleVariable, 5)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x07, ZoomDirection.TeleVariable + 5, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize with specified variable speed (wide)', () => {
			const command = new ZoomCommand(ZoomDirection.WideVariable, 3)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x07, ZoomDirection.WideVariable + 3, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should handle zero speed correctly', () => {
			const command = new ZoomCommand(ZoomDirection.TeleStandard, 0)
			const serialized = command.serialize()
			const expected = Buffer.from([0x81, 0x01, 0x04, 0x07, ZoomDirection.TeleStandard, 0xff])

			expect(serialized).toEqual(expected)
		})
	})

	describe('ZoomDirectCommand', () => {
		it('should serialize a 4-digit position correctly', () => {
			const position = 0x1234
			const command = new ZoomDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x47, 0x01, 0x02, 0x03, 0x04, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize a 0 position correctly', () => {
			const position = 0
			const command = new ZoomDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x47, 0x00, 0x00, 0x00, 0x00, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize a position with leading zeros correctly', () => {
			const position = 0x0056
			const command = new ZoomDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x47, 0x00, 0x00, 0x05, 0x06, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should handle positions shorter than 4 digits correctly', () => {
			const position = 0x0789
			const command = new ZoomDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x47, 0x00, 0x07, 0x08, 0x09, 0xff])

			expect(serialized).toEqual(expected)
		})

		it('should serialize the maximum 4-digit position correctly', () => {
			const position = 0xffff
			const command = new ZoomDirectCommand(position)
			const serialized = command.serialize()

			const expected = Buffer.from([0x81, 0x01, 0x04, 0x47, 0x0f, 0x0f, 0x0f, 0x0f, 0xff])

			expect(serialized).toEqual(expected)
		})
	})
})
