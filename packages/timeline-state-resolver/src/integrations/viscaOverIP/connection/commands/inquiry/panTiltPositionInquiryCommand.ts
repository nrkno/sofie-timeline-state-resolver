import { ViscaInquiryCommand } from '../abstractCommand'

export class PanTiltPositionInquiryCommand extends ViscaInquiryCommand {
	serialize() {
		return Buffer.from([0x81, 0x09, 0x06, 0x12, 0xff])
	}

	deserializeReply(payload: Buffer): { panPosition: number; tiltPosition: number } {
		const panPosition = this.fromBigIntWithZeroes(payload.readBigInt64BE(2) >> 24n)
		const tiltPosition = this.fromBigIntWithZeroes(payload.readBigInt64BE(4) & 0xffffffffffn)
		return { panPosition, tiltPosition }
	}
}
