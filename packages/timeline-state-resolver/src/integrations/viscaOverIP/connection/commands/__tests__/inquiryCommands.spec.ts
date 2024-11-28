import { FocusMode } from '../../enums'
import {
	FocusModeInquiryCommand,
	FocusPositionInquiryCommand,
	PanTiltPositionInquiryCommand,
	ZoomPositionInquiryCommand,
} from '../inquiry'

describe('Visca Inquiry Commands', () => {
	describe('FocusModeInquiryCommand', () => {
		it('should deserialize auto', () => {
			const command = new FocusModeInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x02, 0xff]))
			const expected = FocusMode.Auto

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize manual', () => {
			const command = new FocusModeInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x03, 0xff]))
			const expected = FocusMode.Manual

			expect(deserialized).toEqual(expected)
		})
	})

	describe('FocusPositionInquiryCommand', () => {
		it('should deserialize with zero position', () => {
			const command = new FocusPositionInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x01, 0x02, 0x03, 0x04, 0xff]))
			const expected = 0x1234

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize with 4-digit position', () => {
			const command = new FocusPositionInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x01, 0x02, 0x03, 0x04, 0xff]))
			const expected = 0x1234

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize with less than 4-digit position', () => {
			const command = new FocusPositionInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x00, 0x02, 0x03, 0x04, 0xff]))
			const expected = 0x0234

			expect(deserialized).toEqual(expected)
		})
	})

	describe('PanTiltPositionInquiryCommand', () => {
		it('should deserialize with zero positions', () => {
			const command = new PanTiltPositionInquiryCommand()
			const deserialized = command.deserializeReply(
				Buffer.from([0x90, 0x50, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff])
			)
			const expected = { panPosition: 0, tiltPosition: 0 }

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize with 4-digit positions', () => {
			const command = new PanTiltPositionInquiryCommand()
			const deserialized = command.deserializeReply(
				Buffer.from([0x90, 0x50, 0x01, 0x02, 0x03, 0x04, 0x05, 0x05, 0x0a, 0x0b, 0x0c, 0x0d, 0xff])
			)
			const expected = { panPosition: 0x12345, tiltPosition: 0x5abcd }

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize with less than 4-digit position', () => {
			const command = new PanTiltPositionInquiryCommand()
			const deserialized = command.deserializeReply(
				Buffer.from([0x90, 0x50, 0x00, 0x02, 0x03, 0x04, 0x05, 0x00, 0x00, 0x00, 0x0c, 0x0d, 0xff])
			)
			const expected = { panPosition: 0x02345, tiltPosition: 0x000cd }

			expect(deserialized).toEqual(expected)
		})

		it("should handle 2's complement", () => {
			const command = new PanTiltPositionInquiryCommand()
			const deserialized = command.deserializeReply(
				Buffer.from([0x90, 0x50, 0x0f, 0x06, 0x03, 0x05, 0x09, 0x0f, 0x0f, 0x0f, 0x08, 0x05, 0xff])
			)
			const expected = { panPosition: -40103, tiltPosition: -123 }

			expect(deserialized).toEqual(expected)
		})
	})

	describe('ZoomPositionInquiryCommand', () => {
		it('should deserialize with zero position', () => {
			const command = new ZoomPositionInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x00, 0x00, 0x00, 0x00, 0xff]))
			const expected = 0

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize with 4-digit position', () => {
			const command = new ZoomPositionInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x01, 0x02, 0x03, 0x04, 0xff]))
			const expected = 0x1234

			expect(deserialized).toEqual(expected)
		})

		it('should deserialize with less than 4-digit position', () => {
			const command = new ZoomPositionInquiryCommand()
			const deserialized = command.deserializeReply(Buffer.from([0x90, 0x50, 0x00, 0x02, 0x03, 0x04, 0xff]))
			const expected = 0x0234

			expect(deserialized).toEqual(expected)
		})
	})
})
