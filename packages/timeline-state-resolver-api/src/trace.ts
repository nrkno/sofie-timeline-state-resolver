export interface Trace {
	/** id of this trace, should be formatted as namespace:id */
	measurement: string
	/** timestamp of when trace was started */
	start: number
	/** Tags to differentiate data sources */
	tags?: Record<string, string>
}
export interface FinishedTrace extends Trace {
	/** timestamp of when trace was ended */
	ended: number
	/** duration of the trace */
	duration: number
}
