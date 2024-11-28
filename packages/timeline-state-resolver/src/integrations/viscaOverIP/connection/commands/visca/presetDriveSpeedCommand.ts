import { ViscaCommand } from '../abstractCommand'

export class PresetDriveSpeedCommand extends ViscaCommand {
	constructor(private readonly memoryNumber: number, private readonly speed: number) {
		super()
	}

	serialize() {
		return Buffer.from([0x81, 0x01, 0x7e, 0x01, 0x0b, this.memoryNumber, this.speed, 0xff])
	}
}
