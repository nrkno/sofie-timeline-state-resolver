import { ViscaCommand } from '../abstractCommand'

export class PresetDriveSpeedCommand extends ViscaCommand {
	memoryNumber: number
	speed: number

	serialize() {
		return Buffer.from([0x81, 0x01, 0x7e, 0x01, 0x0b, this.memoryNumber, this.speed, 0xff])
	}
}
