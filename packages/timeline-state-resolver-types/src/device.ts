import {
	DeviceType,
	AtemOptions,
	CasparCGOptions,
	HttpSendOptions,
	HyperdeckOptions,
	ObsOptions,
	OscOptions,
	PharosOptions,
	QuantelOptions,
	SingularLiveOptions,
	SisyfosOptions,
	SofieChefOptions,
	TcpSendOptions,
	AbstractOptions,
	LawoOptions,
	PanasonicPTZOptions,
	HttpWatcherOptions,
	VizMSEOptions,
	VmixOptions,
	ShotokuOptions,
	TelemetricsOptions,
	TriCasterOptions,
	MultiOscOptions,
	ViscaOverIPOptions,
	WebsocketClientOptions,
} from '.'
import { DeviceCommonOptions } from './generated/common-options'

export enum StatusCode {
	UNKNOWN = 0, // Status unknown
	GOOD = 1, // All good and green
	WARNING_MINOR = 2, // Everything is not OK, operation is not affected
	WARNING_MAJOR = 3, // Everything is not OK, operation might be affected
	BAD = 4, // Operation affected, possible to recover
	FATAL = 5, // Operation affected, not possible to recover without manual interference
}
export interface DeviceStatus {
	statusCode: StatusCode
	messages: Array<string>
	active: boolean
}

export interface DeviceOptionsBase<T> extends SlowReportOptions, DeviceCommonOptions {
	type: DeviceType
	isMultiThreaded?: boolean
	reportAllCommands?: boolean
	options?: T
}

export interface SlowReportOptions {
	/** If set, report back that a command was slow if not sent at this time */
	limitSlowSentCommand?: number
	/** If set, report back that a command was slow if not fullfilled (sent + ack:ed) at this time */
	limitSlowFulfilledCommand?: number
}

export type DeviceOptionsAny =
	| DeviceOptionsAbstract
	| DeviceOptionsCasparCG
	| DeviceOptionsAtem
	| DeviceOptionsLawo
	| DeviceOptionsHTTPSend
	| DeviceOptionsPanasonicPTZ
	| DeviceOptionsTCPSend
	| DeviceOptionsHyperdeck
	| DeviceOptionsPharos
	| DeviceOptionsOBS
	| DeviceOptionsOSC
	| DeviceOptionsHTTPWatcher
	| DeviceOptionsSisyfos
	| DeviceOptionsSofieChef
	| DeviceOptionsQuantel
	| DeviceOptionsSingularLive
	| DeviceOptionsVMix
	| DeviceOptionsVizMSE
	| DeviceOptionsShotoku
	| DeviceOptionsTelemetrics
	| DeviceOptionsTriCaster
	| DeviceOptionsMultiOSC
	| DeviceOptionsViscaOverIP
	| DeviceOptionsWebSocketClient

export interface DeviceOptionsAbstract extends DeviceOptionsBase<AbstractOptions> {
	type: DeviceType.ABSTRACT
}
export interface DeviceOptionsCasparCG extends DeviceOptionsBase<CasparCGOptions> {
	type: DeviceType.CASPARCG
}
export interface DeviceOptionsAtem extends DeviceOptionsBase<AtemOptions> {
	type: DeviceType.ATEM
}
export interface DeviceOptionsLawo extends DeviceOptionsBase<LawoOptions> {
	type: DeviceType.LAWO
}
export interface DeviceOptionsHTTPSend extends DeviceOptionsBase<HttpSendOptions> {
	type: DeviceType.HTTPSEND
}
export interface DeviceOptionsPanasonicPTZ extends DeviceOptionsBase<PanasonicPTZOptions> {
	type: DeviceType.PANASONIC_PTZ
}
export interface DeviceOptionsTCPSend extends DeviceOptionsBase<TcpSendOptions> {
	type: DeviceType.TCPSEND
}
export interface DeviceOptionsHyperdeck extends DeviceOptionsBase<HyperdeckOptions> {
	type: DeviceType.HYPERDECK
}
export interface DeviceOptionsPharos extends DeviceOptionsBase<PharosOptions> {
	type: DeviceType.PHAROS
}
export interface DeviceOptionsOBS extends DeviceOptionsBase<ObsOptions> {
	type: DeviceType.OBS
}
export interface DeviceOptionsOSC extends DeviceOptionsBase<OscOptions> {
	type: DeviceType.OSC
}
export interface DeviceOptionsHTTPWatcher extends DeviceOptionsBase<HttpWatcherOptions> {
	type: DeviceType.HTTPWATCHER
}
export interface DeviceOptionsSisyfos extends DeviceOptionsBase<SisyfosOptions> {
	type: DeviceType.SISYFOS
}
export interface DeviceOptionsSofieChef extends DeviceOptionsBase<SofieChefOptions> {
	type: DeviceType.SOFIE_CHEF
}
export interface DeviceOptionsQuantel extends DeviceOptionsBase<QuantelOptions> {
	type: DeviceType.QUANTEL
}
export interface DeviceOptionsVizMSE extends DeviceOptionsBase<VizMSEOptions> {
	type: DeviceType.VIZMSE
}
export interface DeviceOptionsSingularLive extends DeviceOptionsBase<SingularLiveOptions> {
	type: DeviceType.SINGULAR_LIVE
}
export interface DeviceOptionsShotoku extends DeviceOptionsBase<ShotokuOptions> {
	type: DeviceType.SHOTOKU
}
export interface DeviceOptionsVMix extends DeviceOptionsBase<VmixOptions> {
	type: DeviceType.VMIX
}
export interface DeviceOptionsTelemetrics extends DeviceOptionsBase<TelemetricsOptions> {
	type: DeviceType.TELEMETRICS
}
export interface DeviceOptionsTriCaster extends DeviceOptionsBase<TriCasterOptions> {
	type: DeviceType.TRICASTER
}
export interface DeviceOptionsMultiOSC extends DeviceOptionsBase<MultiOscOptions> {
	type: DeviceType.MULTI_OSC
}
export interface DeviceOptionsViscaOverIP extends DeviceOptionsBase<ViscaOverIPOptions> {
	type: DeviceType.VISCA_OVER_IP
}

export interface DeviceOptionsWebSocketClient extends DeviceOptionsBase<WebsocketClientOptions> {
	type: DeviceType.WEBSOCKET_CLIENT
}
