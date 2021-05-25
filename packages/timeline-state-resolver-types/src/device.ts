import {
	DeviceType,
	AtemOptions,
	CasparCGOptions,
	HTTPSendOptions,
	HyperdeckOptions,
	OSCOptions,
	PharosOptions,
	QuantelOptions,
	SingularLiveOptions,
	SisyfosOptions,
	TCPSendOptions,
	AbstractOptions,
	LawoOptions,
	PanasonicPTZOptions,
	HTTPWatcherOptions,
	VizMSEOptions,
	VMixOptions,
} from '.'
import { ShotokuOptions } from './shotoku'

export interface DeviceOptionsBase<T> extends SlowReportOptions {
	type: DeviceType
	isMultiThreaded?: boolean
	reportAllCommands?: boolean
	threadUsage?: number
	disable?: boolean
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
	| DeviceOptionsOSC
	| DeviceOptionsHTTPWatcher
	| DeviceOptionsSisyfos
	| DeviceOptionsQuantel
	| DeviceOptionsSingularLive
	| DeviceOptionsVMix
	| DeviceOptionsVizMSE
	| DeviceOptionsShotoku

export type DeviceInitOptions =
	| AbstractOptions
	| CasparCGOptions
	| AtemOptions
	| LawoOptions
	| HTTPSendOptions
	| PanasonicPTZOptions
	| TCPSendOptions
	| HyperdeckOptions
	| PharosOptions
	| OSCOptions
	| HTTPWatcherOptions
	| SisyfosOptions
	| QuantelOptions
	| SingularLiveOptions
	| VMixOptions
	| VizMSEOptions

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
export interface DeviceOptionsHTTPSend extends DeviceOptionsBase<HTTPSendOptions> {
	type: DeviceType.HTTPSEND
}
export interface DeviceOptionsPanasonicPTZ extends DeviceOptionsBase<PanasonicPTZOptions> {
	type: DeviceType.PANASONIC_PTZ
}
export interface DeviceOptionsTCPSend extends DeviceOptionsBase<TCPSendOptions> {
	type: DeviceType.TCPSEND
}
export interface DeviceOptionsHyperdeck extends DeviceOptionsBase<HyperdeckOptions> {
	type: DeviceType.HYPERDECK
}
export interface DeviceOptionsPharos extends DeviceOptionsBase<PharosOptions> {
	type: DeviceType.PHAROS
}
export interface DeviceOptionsOSC extends DeviceOptionsBase<OSCOptions> {
	type: DeviceType.OSC
}
export interface DeviceOptionsHTTPWatcher extends DeviceOptionsBase<HTTPWatcherOptions> {
	type: DeviceType.HTTPWATCHER
}
export interface DeviceOptionsSisyfos extends DeviceOptionsBase<SisyfosOptions> {
	type: DeviceType.SISYFOS
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

export interface DeviceOptionsVMix extends DeviceOptionsBase<VMixOptions> {
	type: DeviceType.VMIX
}
