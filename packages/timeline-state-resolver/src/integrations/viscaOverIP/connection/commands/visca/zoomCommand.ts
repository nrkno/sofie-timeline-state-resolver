import { ViscaCommand } from '../abstractCommand'
import { ZoomDirection } from '../../enums'

export class ZoomCommand extends ViscaCommand {
	constructor(private readonly direction: ZoomDirection, private readonly speed: number = 0) {
		super()
	}

	serialize() {
		let data = this.direction

		if (data > ZoomDirection.WideStandard) data = data + this.speed

		return Buffer.from([0x81, 0x01, 0x04, 0x07, data, 0xff])
	}
}
