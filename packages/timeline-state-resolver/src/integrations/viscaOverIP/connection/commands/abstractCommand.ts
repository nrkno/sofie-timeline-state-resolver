import { CommandType } from '../enums'

export interface AbstractCommand {
	deserializeReply(payload: Buffer): any
}

export abstract class AbstractCommand {
	abstract readonly commandType: CommandType

	abstract serialize(): Buffer
}

export abstract class ViscaCommand extends AbstractCommand {
	readonly commandType = CommandType.ViscaCommand

	protected toIntWithZeroes(n: number) {
		n = n & 0xffff
		let result = 0

		for (let i = 0; i < 4; i++) {
			const chunk = (n >> (4 * i)) & 0xf
			result |= chunk << (8 * i + 4)
		}

		return result >>> 4
	}

	protected toBigIntWithZeroes(n: number): bigint {
		const b = BigInt(n & 0xfffff)
		let result = 0n

		for (let i = 0n; i < 5; i++) {
			const chunk = (b >> (4n * i)) & 0xfn
			result |= chunk << (8n * i + 4n)
		}

		return result >> 4n
	}
}

export abstract class ViscaInquiryCommand extends AbstractCommand {
	readonly commandType = CommandType.ViscaInquiry

	abstract deserializeReply(payload: Buffer): unknown

	protected fromIntWithZeroes(n: number): number {
		n = n << 4

		let result = 0

		for (let i = 0; i < 4; i++) {
			const chunk = (n >> (8 * i + 4)) & 0xf
			result |= chunk << (4 * i)
		}

		return result & 0xffff
	}

	protected fromBigIntWithZeroes(x: bigint): number {
		x = x << 4n

		let result = 0n

		for (let i = 0n; i < 5; i++) {
			const chunk = (x >> (8n * i + 4n)) & 0xfn
			result |= chunk << (4n * i)
		}

		return Number(result & 0xfffffn)
	}

	protected from2sComplement(x: number): number {
		return x & 0x80000 ? x - (1 << 20) : x
	}
}

export abstract class ControlCommand extends AbstractCommand {
	readonly commandType = CommandType.ControlCommand
}
