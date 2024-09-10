import { ViscaInquiryCommand } from '../abstractCommand'

export class FocusPositionInquiryCommand extends ViscaInquiryCommand {
	serialize() {
		return Buffer.from([0x81, 0x09, 0x04, 0x48, 0xff])
	}

	deserializeReply(payload: Buffer): number {
		const position = payload.readUint32BE(2)

		return this.fromIntWithZeroes(position)
	}
}
