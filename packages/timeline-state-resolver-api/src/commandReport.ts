export interface SlowSentCommandInfo {
	added: number
	prepareTime: number
	plannedSend: number
	send: number
	queueId: string
	args: string
	sendDelay: number
	addedDelay: number
	internalDelay: number
}
export interface SlowFulfilledCommandInfo {
	added: number
	prepareTime: number
	plannedSend: number
	send: number
	queueId: string
	fullfilled: number
	fulfilledDelay: number
	args: string
}

export interface CommandReport {
	/** The time the command is planned to execute */
	plannedSend: number
	/** The queue the command is put into */
	queueId: string
	/** Command is added to list of planned (future) events */
	added: number
	/** Command is picked from list of events and put into queue for immediade execution  */
	prepareTime: number
	/** Command is starting to exeute */
	send: number
	/** Command has finished executing */
	fullfilled: number
	/** Arguments of command */
	args: any
}
