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
		const newLines = string.split('\r\n')

		if (newLines[newLines.length - 1] === '') {
			// we're lucky and the data ends with a newline
			this._unprocessedLines.push(...newLines)
		} else {
			const incompleteLine = newLines.pop()
			this._unprocessedLines.push(...newLines)
			// we need to keep the remaining incomplete line
			if (incompleteLine != null) {
				this._lineRemainder += incompleteLine
			}
		}

		lineProcessing: while (this._unprocessedLines.length > 0) {
			const firstLine = this._unprocessedLines[0]
			const result = RESPONSE_REGEX.exec(firstLine)
			let processedLines = 0

			if (result && result.groups?.['response']) {
				// create a response object
				// Add 2 to account for the space between `command` and `response` as well as the newline after `response`.
				const responseHeaderLength = result.groups?.['command'].length + result.groups?.['response'].length + 2
				if (Number.isNaN(responseHeaderLength)) {
					break lineProcessing
				}
				const responseLen = parseInt(result?.groups?.['response']) - responseHeaderLength
				const response: Response = {
					command: result.groups?.['command'],
					response: (Number.isNaN(responseLen) ? result.groups?.['response'] : 'OK') as Response['response'],
					message: result.groups?.['responseMsg'],
					body: undefined as undefined | string,
				}
				processedLines++

				// parse payload data if there is any
				if (!Number.isNaN(responseLen)) {
					let len = responseLen
					const lines: string[] = []

					while (len > 0) {
						const l = this._unprocessedLines[lines.length + 1] // offset of 1 because first line is not data
						if (l === undefined) {
							// we have not received all the data from server, break line processing and wait for more data
							break lineProcessing
						}

						len -= l.length + 2
						lines.push(l)
					}
					response.body = lines.join('')
					processedLines += lines.length
				}

				// now do something with response
				try {
					this.emit('response', response)
				} catch (e) {
					this.emit('error', e instanceof Error ? e : new Error(`Couldn't process the response: "${firstLine}"`))
				}
			} else if (firstLine.length > 0) {
				// there is some data, but we can't recognize it, emit an error
				this.emit('error', new Error(`Unknown response from vMix: "${firstLine}"`))
				processedLines++
			} else {
				// empty lines we silently ignore
				processedLines++
			}

			// remove processed lines
			this._unprocessedLines.splice(0, processedLines)
		}
	}
}
