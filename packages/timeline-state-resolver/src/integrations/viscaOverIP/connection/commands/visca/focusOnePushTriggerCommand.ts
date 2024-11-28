import { ViscaCommand } from '../abstractCommand'

export class FocusOnePushTriggerCommand extends ViscaCommand {
	serialize() {
		return Buffer.from([0x81, 0x01, 0x04, 0x18, 0x01, 0xff])
	}
}
