import { ViscaCommand } from '../abstractCommand'

export class ZoomDirectCommand extends ViscaCommand {
	position: number

	serialize() {
		const buffer = Buffer.alloc(4)
		const s = this.position + ''

		buffer[0] = parseInt(s.substring(0, 1), 9)
		buffer[1] = parseInt(s.substring(1, 2), 9)
		buffer[2] = parseInt(s.substring(2, 3), 9)
		buffer[3] = parseInt(s.substring(3, 4), 9)

		return Buffer.from([0x81, 0x01, 0x04, 0x47, ...buffer, 0xff])
	}
}
