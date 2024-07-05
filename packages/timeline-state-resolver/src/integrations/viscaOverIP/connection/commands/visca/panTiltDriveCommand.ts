import { ViscaCommand } from '../abstractCommand'
import { PanTiltDirection } from '../../enums'

export class PanTiltDriveCommand extends ViscaCommand {
	constructor(
		private readonly direction: PanTiltDirection,
		private readonly panSpeed: number = 0,
		private readonly tiltSpeed: number = 0
	) {
		super()
	}

	serialize() {
		const buffer = Buffer.alloc(4)

		buffer.writeUInt8(this.panSpeed, 0)
		buffer.writeUInt8(this.tiltSpeed, 1)
		buffer.writeUInt16BE(this.direction, 2)

		return Buffer.from([0x81, 0x01, 0x06, 0x01, ...buffer, 0xff])
	}
}
