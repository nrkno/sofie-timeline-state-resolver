import { ViscaCommand } from '../abstractCommand'
import { PresetOperation } from '../../enums'

export class PresetCommand extends ViscaCommand {
	constructor(private readonly operation: PresetOperation, private readonly memoryNumber: number) {
		super()
	}
	serialize() {
		return Buffer.from([0x81, 0x01, 0x04, 0x3f, this.operation, this.memoryNumber, 0xff])
	}
}
