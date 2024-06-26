import { ViscaInquiryCommand } from '../abstractCommand'

export class ZoomPositionCommand extends ViscaInquiryCommand {
	serialize() {
		return Buffer.from([0x81, 0x09, 0x04, 0x47, 0xff])
	}

	deserialize(payload: Buffer): number {
		let val = 0

		val += 1000 * payload[2]
		val += 100 * payload[3]
		val += 10 * payload[4]
		val += 1 * payload[5]

		return val
	}
}
