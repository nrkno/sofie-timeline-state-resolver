import { FocusDirection } from '../../enums'
import { ViscaCommand } from '../abstractCommand'

export class FocusCommand extends ViscaCommand {
	direction: FocusDirection
	speed: number

	serialize() {
		let data = this.direction

		if (data > FocusDirection.NearStandard) data = data + this.speed

		return Buffer.from([0x81, 0x01, 0x04, 0x08, data, 0xff])
	}
}
