import { ViscaCommand } from '../abstractCommand'
import { FocusMode } from '../../enums'

export class FocusModeCommand extends ViscaCommand {
	constructor(private readonly mode: FocusMode) {
		super()
	}

	serialize() {
		return Buffer.from([0x81, 0x01, 0x04, 0x38, this.mode, 0xff])
	}
}
