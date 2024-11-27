import { FocusMode } from '../../enums'
import { ViscaInquiryCommand } from '../abstractCommand'

export class FocusModeInquiryCommand extends ViscaInquiryCommand {
	serialize() {
		return Buffer.from([0x81, 0x09, 0x04, 0x38, 0xff])
	}

	deserializeReply(payload: Buffer): FocusMode {
		return payload[2]
	}
}
