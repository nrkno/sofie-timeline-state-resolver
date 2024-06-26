import { CommandType } from '../enums'

export interface AbstractCommand {
	deserialize?(payload: Buffer): any
}

export abstract class AbstractCommand {
	abstract readonly commandType: CommandType

	abstract serialize(): Buffer
}

export abstract class ViscaCommand extends AbstractCommand {
	readonly commandType = CommandType.ViscaCommand
}

export abstract class ViscaInquiryCommand extends AbstractCommand {
	readonly commandType = CommandType.ViscaInquiry

	abstract deserialize(payload: Buffer): any
}

export abstract class ControlCommand extends AbstractCommand {
	readonly commandType = CommandType.ControlCommand
}
