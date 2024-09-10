import { ControlCommand } from '../abstractCommand'

/** The IF_Clear command */
export class ResetSequenceNumberCommand extends ControlCommand {
	serialize() {
		return Buffer.from([0x88, 0x01, 0x00, 0x01, 0xff])
	}
}
