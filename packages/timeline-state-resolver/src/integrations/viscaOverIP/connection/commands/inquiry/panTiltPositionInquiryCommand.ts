import { ViscaInquiryCommand } from '../abstractCommand'

export interface PanTiltPosition {
	panPosition: number
	tiltPosition: number
}

export class PanTiltPositionInquiryCommand extends ViscaInquiryCommand {
	serialize() {
		return Buffer.from([0x81, 0x09, 0x06, 0x12, 0xff])
	}

	deserializeReply(payload: Buffer): PanTiltPosition {
		const panPosition = this.from2sComplement(this.fromBigIntWithZeroes(payload.readBigInt64BE(2) >> 24n))
		const tiltPosition = this.from2sComplement(this.fromBigIntWithZeroes(payload.readBigInt64BE(4) & 0xffffffffffn))
		return { panPosition, tiltPosition }
	}
}
