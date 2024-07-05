import { ViscaCommand } from '../abstractCommand'

export class PanTiltDriveAbsoluteCommand extends ViscaCommand {
	constructor(
		private readonly panPosition: number,
		private readonly tiltPosition: number,
		private readonly panSpeed: number,
		private readonly tiltSpeed: number
	) {
		super()
	}

	serialize() {
		const buffer = Buffer.alloc(16)

		buffer.writeBigUInt64BE(this.toBigIntWithZeroes(this.tiltPosition), 8)
		buffer.writeBigUInt64BE(this.toBigIntWithZeroes(this.panPosition), 3)

		return Buffer.from([0x81, 0x01, 0x06, 0x01, this.panSpeed, this.tiltSpeed, ...buffer.slice(6), 0xff])
	}
}
