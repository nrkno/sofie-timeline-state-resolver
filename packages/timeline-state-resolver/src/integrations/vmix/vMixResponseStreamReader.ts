import { EventEmitter } from 'eventemitter3'

type ResponseStreamReaderEvents = {
	response: [response: Response]
	error: [error: Error]
}

export interface Response {
	command: string
	response: 'OK' | 'ER'
	message: string
	body?: string
}

const RESPONSE_REGEX = /^(?<command>\w+)\s+(?<response>OK|ER|\d+)(\s+(?<responseMsg>.*))?/i

/**
 * A receiver for vMix responses
 */
export class VMixResponseStreamReader extends EventEmitter<ResponseStreamReaderEvents> {
	private _unprocessedLines: string[] = []
	private _lineRemainder = ''

	reset() {
		this._unprocessedLines = []
		this._lineRemainder = ''
	}

	processIncomingData(data: Buffer) {
		const string = this._lineRemainder + data.toString('utf-8')
		this._lineRemainder = ''
		const lines = string.split('\r\n')

		if (lines[lines.length - 1] === '') {
			// the data ends with a newline
			this._unprocessedLines.push(...lines)
		} else {
			const incompleteLine = lines.pop()
			this._unprocessedLines.push(...lines)
			// we need to keep the remaining incomplete line
			if (incompleteLine != null) {
				this._lineRemainder = incompleteLine
			}
		}

		let lineToProcess: string | undefined

		while ((lineToProcess = this._unprocessedLines.shift()) != null) {
			const result = RESPONSE_REGEX.exec(lineToProcess)

			if (result && result.groups?.['response']) {
				const responseLen = parseInt(result?.groups?.['response'])

				// create a response object
				const response: Response = {
					command: result.groups?.['command'],
					response: (Number.isNaN(responseLen) ? result.groups?.['response'] : 'OK') as Response['response'],
					message: result.groups?.['responseMsg'],
					body: undefined as undefined | string,
				}

				// parse payload data if there is any
				if (!Number.isNaN(responseLen)) {
					const payloadData = this.processPayloadData(responseLen)
					if (payloadData == null) {
						this._unprocessedLines.unshift(lineToProcess)
						break
					} else {
						response.body = payloadData
					}
				}

				// now do something with response
				try {
					this.emit('response', response)
				} catch (e) {
					this.emit('error', e instanceof Error ? e : new Error(`Couldn't process the response: "${lineToProcess}"`))
				}
			} else if (lineToProcess.length > 0) {
				// there is some data, but we can't recognize it, emit an error
				this.emit('error', new Error(`Unknown response from vMix: "${lineToProcess}"`))
			} else {
				// empty lines we silently ignore
			}
		}
	}

	private processPayloadData(responseLen: number): string | null {
		const processedLines: string[] = []

		while (responseLen > 0) {
			const line = this._unprocessedLines[processedLines.length]
			if (line == null) {
				// we have not received all the data from server, break line processing and wait for more data
				return null
			}

			processedLines.push(line)
			responseLen -= line.length + 2
		}
		this._unprocessedLines.splice(0, processedLines.length)
		return processedLines.join('\r\n')
	}
}
