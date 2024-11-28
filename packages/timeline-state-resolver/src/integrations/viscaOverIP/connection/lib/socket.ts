import { createSocket, Socket } from 'dgram'
import { EventEmitter } from 'events'
import { AbstractCommand } from '../commands/index'
import { ConnectionState, CommandType } from '../enums'
import { ResetSequenceNumberCommand } from '../commands/control/resetSeqNumberCommand'

interface QueuedCommand {
	packetId: number
	packet: Buffer
	promise: {
		resolve: (value?: any) => void
		reject: (value?: any) => void
	}
	command: AbstractCommand
}

export class ViscaUdpSocket extends EventEmitter {
	private _debug = false
	private _reconnectTimer: NodeJS.Timer | undefined
	private _retransmitTimer: NodeJS.Timer | undefined
	private _connectionState!: ConnectionState

	private _localPacketId = 0
	private _maxPacketID = 0xffffffff

	private _address
	private _port = 52381
	private _socket!: Socket
	private _reconnectInterval = 5000

	private _inFlightTimeout = 1000
	private _maxRetries = 5
	private _lastReceivedAt: number = Date.now()
	private _inFlight: (QueuedCommand & { lastSent: number; resent: number }) | undefined
	private _queue: Array<QueuedCommand> = []

	constructor(options: { address: string; port?: number; debug?: boolean; log?: (...args) => void }) {
		super()
		this._address = options.address || this._address
		this._port = options.port || this._port
		this._debug = options.debug || false
		this.log = options.log || this.log.bind(this)

		this._createSocket()
	}

	public connect(address?: string, port?: number) {
		if (!this._reconnectTimer) {
			this._reconnectTimer = setInterval(() => {
				if (this._lastReceivedAt + this._reconnectInterval > Date.now()) return
				if (this._connectionState === ConnectionState.Connected) {
					this._connectionState = ConnectionState.Closed
					this.emit('disconnected', null, null)
				}
				this._localPacketId = 0
				this.log('reconnecting')
				if (this._address && this._port) {
					this.sendCommand(new ResetSequenceNumberCommand()).catch((reason) => this.log(reason))
					this._connectionState = ConnectionState.Connecting
				}
			}, this._reconnectInterval)
		}
		if (!this._retransmitTimer) {
			this._retransmitTimer = setInterval(() => this._checkForRetransmit(), 50)
		}

		if (address) {
			this._address = address
		}
		if (port) {
			this._port = port
		}

		this.sendCommand(new ResetSequenceNumberCommand()).catch((reason) => this.log(reason))
		this._connectionState = ConnectionState.Connecting
	}

	public async disconnect() {
		return new Promise<void>((resolve) => {
			if (this._connectionState === ConnectionState.Connected) {
				this._socket.close(() => {
					clearInterval(this._retransmitTimer as NodeJS.Timer)
					clearInterval(this._reconnectTimer as NodeJS.Timer)
					this._retransmitTimer = undefined
					this._reconnectTimer = undefined

					this._connectionState = ConnectionState.Closed
					this._createSocket()
					this.emit('disconnected')

					resolve()
				})
			} else {
				resolve()
			}
		})
	}

	public log(..._args: any[]): void {
		// Will be re-assigned by the top-level class.
	}

	public async sendCommand<T extends AbstractCommand>(
		command: AbstractCommand
	): Promise<ReturnType<T['deserializeReply']>> {
		const buffer = Buffer.alloc(8)
		const payload = command.serialize()

		buffer.writeUInt16BE(command.commandType, 0)
		buffer.writeUInt16BE(payload.length, 2)
		buffer.writeUInt32BE(this._localPacketId, 4)

		const packet = Buffer.from([...buffer, ...payload])

		const queueObject: QueuedCommand = {
			command,
			packetId: this._localPacketId,
			packet,
			promise: {
				resolve: () => null,
				reject: () => null,
			},
		}
		const promise = new Promise<any>((resolve, reject) => {
			queueObject.promise = {
				resolve,
				reject,
			}
		})

		if (this._debug) this.log('QUEUE ', this._localPacketId, packet)
		this._queue.push(queueObject)

		this._sendNextPacket()

		this._localPacketId = this._localPacketId++ % this._maxPacketID

		return promise
	}

	private _createSocket() {
		this._socket = createSocket('udp4')
		this._socket.bind()
		this._socket.on('message', (packet, rinfo) => this._receivePacket(packet, rinfo))
		this._socket.on('close', () => this.emit('disconnect'))
	}

	private _receivePacket(packet: Buffer, rinfo: any) {
		if (this._debug) this.log('RECV ', packet.toString('hex'), rinfo, !!this._inFlight)
		this._lastReceivedAt = Date.now()

		const type = packet.readUInt16BE(0)
		const length = packet.readUInt32BE(4)

		if (this._debug) this.log('type', type, !!this._inFlight)
		if (type === CommandType.ViscaReply && this._inFlight) {
			// @todo: think about what resolves a command.
			if (length === 3 && packet.readUInt8(9) === 0x41) {
				// supposedly an ack
				return // completion resolves, and not ack so we skip
			} else if (length === 4 && packet.readUInt8(9) === 0x51) {
				// supposedly a completion
				this._inFlight.promise.resolve()
			} else if (length === 4 && packet.readUInt16BE(9) === 0x6002) {
				// supposedly a syntax error
				this._inFlight.promise.reject(new Error('Syntax Error'))
			} else if (length === 4 && packet.readUInt16BE(9) === 0x6141) {
				// supposedly not executable
				this._inFlight.promise.reject(new Error('Not executable'))
			} else {
				// maybe a inquisition reply?
				if (this._inFlight.command.deserializeReply) {
					this._inFlight.promise.resolve(this._inFlight.command.deserializeReply(packet.slice(8, 8 + length)))
				}
			}
		} else if (type === CommandType.ControlReply) {
			this._connectionState = ConnectionState.Connected
			this.emit('connected')
		}

		this._inFlight = undefined
		this._sendNextPacket()
	}

	private _sendNextPacket() {
		if (this._inFlight) return

		const packet = this._queue.shift()

		if (packet) {
			this._inFlight = {
				...packet,
				lastSent: Date.now(),
				resent: 0,
			}

			this._sendPacket(packet.packet)
		}
	}

	private _sendPacket(packet: Buffer) {
		if (this._debug) this.log('SEND ', packet)
		this._socket.send(packet, this._port, this._address)
	}

	private _checkForRetransmit() {
		if (this._inFlight && this._inFlight.lastSent + this._inFlightTimeout < Date.now()) {
			if (this._inFlight.resent <= this._maxRetries) {
				this._inFlight.lastSent = Date.now()
				this._inFlight.resent++
				this.log('RESEND: ', this._inFlight)
				this._sendPacket(this._inFlight.packet)
			} else {
				this.log('TIMED OUT: ', this._inFlight.packet)
				// @todo: we should probably break up the connection here.
				this._inFlight = undefined
				this._sendNextPacket()
			}
		}
	}
}
