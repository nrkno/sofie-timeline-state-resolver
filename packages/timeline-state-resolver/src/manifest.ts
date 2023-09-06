import { DeviceType, TSRActionSchema } from 'timeline-state-resolver-types'
import AbstractActions = require('./integrations/abstract/$schemas/actions.deref.json')
import AbstractOptions = require('./integrations/abstract/$schemas/options.deref.json')
import AbstractMappings = require('./integrations/abstract/$schemas/mappings.deref.json')
import AtemActions = require('./integrations/atem/$schemas/actions.deref.json')
import AtemOptions = require('./integrations/atem/$schemas/options.deref.json')
import AtemMappings = require('./integrations/atem/$schemas/mappings.deref.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.deref.json')
import CasparCGOptions = require('./integrations/casparCG/$schemas/options.deref.json')
import CasparCGMappings = require('./integrations/casparCG/$schemas/mappings.deref.json')
import HTTPSendOptions = require('./integrations/httpSend/$schemas/options.deref.json')
import HTTPSendMappings = require('./integrations/httpSend/$schemas/mappings.deref.json')
import HTTPWatcherOptions = require('./integrations/httpWatcher/$schemas/options.deref.json')
import HTTPWatcherMappings = require('./integrations/httpWatcher/$schemas/mappings.deref.json')
import HyperdeckActions = require('./integrations/hyperdeck/$schemas/actions.deref.json')
import HyperdeckOptions = require('./integrations/hyperdeck/$schemas/options.deref.json')
import HyperdeckMappings = require('./integrations/hyperdeck/$schemas/mappings.deref.json')
import LawoOptions = require('./integrations/lawo/$schemas/options.deref.json')
import LawoMappings = require('./integrations/lawo/$schemas/mappings.deref.json')
import MultiOSCOptions = require('./integrations/multiOsc/$schemas/options.deref.json')
import MultiOSCMappings = require('./integrations/multiOsc/$schemas/mappings.deref.json')
import OBSOptions = require('./integrations/obs/$schemas/options.deref.json')
import OBSMappings = require('./integrations/obs/$schemas/mappings.deref.json')
import OSCOptions = require('./integrations/osc/$schemas/options.deref.json')
import OSCMappings = require('./integrations/osc/$schemas/mappings.deref.json')
import PanasonicPTZOptions = require('./integrations/panasonicPTZ/$schemas/options.deref.json')
import PanasonicPTZMappings = require('./integrations/panasonicPTZ/$schemas/mappings.deref.json')
import PharosOptions = require('./integrations/pharos/$schemas/options.deref.json')
import PharosMappings = require('./integrations/pharos/$schemas/mappings.deref.json')
import QuantelActions = require('./integrations/quantel/$schemas/actions.deref.json')
import QuantelOptions = require('./integrations/quantel/$schemas/options.deref.json')
import QuantelMappings = require('./integrations/quantel/$schemas/mappings.deref.json')
import ShotokuOptions = require('./integrations/shotoku/$schemas/options.deref.json')
import ShotokuMappings = require('./integrations/shotoku/$schemas/mappings.deref.json')
import SingularLiveOptions = require('./integrations/singularLive/$schemas/options.deref.json')
import SingularLiveMappings = require('./integrations/singularLive/$schemas/mappings.deref.json')
import SisyfosOptions = require('./integrations/sisyfos/$schemas/options.deref.json')
import SisyfosMappings = require('./integrations/sisyfos/$schemas/mappings.deref.json')
import SofieChefOptions = require('./integrations/sofieChef/$schemas/options.deref.json')
import SofieChefMappings = require('./integrations/sofieChef/$schemas/mappings.deref.json')
import TCPSendOptions = require('./integrations/tcpSend/$schemas/options.deref.json')
import TCPSendMappings = require('./integrations/tcpSend/$schemas/mappings.deref.json')
import TelemetricsOptions = require('./integrations/telemetrics/$schemas/options.deref.json')
import TelemetricsMappings = require('./integrations/telemetrics/$schemas/mappings.deref.json')
import TricasterOptions = require('./integrations/tricaster/$schemas/options.deref.json')
import TricasterMappings = require('./integrations/tricaster/$schemas/mappings.deref.json')
import HttpSendActions = require('./integrations/httpSend/$schemas/actions.deref.json')
import PharosActions = require('./integrations/pharos/$schemas/actions.deref.json')
import TcpSendActions = require('./integrations/tcpSend/$schemas/actions.deref.json')
import VizMSEActions = require('./integrations/vizMSE/$schemas/actions.deref.json')
import VizMSEOptions = require('./integrations/vizMSE/$schemas/options.deref.json')
import VizMSEMappings = require('./integrations/vizMSE/$schemas/mappings.deref.json')
import VMixOptions = require('./integrations/vmix/$schemas/options.deref.json')
import VMixMappings = require('./integrations/vmix/$schemas/mappings.deref.json')
import VMixActions = require('./integrations/vmix/$schemas/actions.deref.json')

import CommonOptions = require('./$schemas/common-options.json')
import { generateTranslation } from './lib'

const stringifyActionSchema = (action: Omit<TSRActionSchema, 'payload'> & { payload?: any }): TSRActionSchema => ({
	...action,
	payload: JSON.stringify(action.payload),
})
const stringifyMappingSchema = (schema: any): Record<string, string> =>
	Object.fromEntries(Object.entries<any>(schema.mappings).map(([id, sch]) => [id, JSON.stringify(sch)]))

export type TSRDevicesManifestEntry = {
	displayName: string
	configSchema: string
	actions?: TSRActionSchema[]
	mappingsSchemas: Record<string, string>
}

export type TSRDevicesManifest = {
	[deviceType in DeviceType]: TSRDevicesManifestEntry
}

export interface TSRManifest {
	commonOptions: string
	subdevices: TSRDevicesManifest
}

export const manifest: TSRManifest = {
	commonOptions: JSON.stringify(CommonOptions),
	subdevices: {
		[DeviceType.ABSTRACT]: {
			displayName: generateTranslation('Abstract'),
			actions: AbstractActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(AbstractOptions),
			mappingsSchemas: stringifyMappingSchema(AbstractMappings),
		},
		[DeviceType.ATEM]: {
			displayName: generateTranslation('Blackmagic ATEM'),
			actions: AtemActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(AtemOptions),
			mappingsSchemas: stringifyMappingSchema(AtemMappings),
		},
		[DeviceType.CASPARCG]: {
			displayName: generateTranslation('CasparCG'),
			actions: CasparCGActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(CasparCGOptions),
			mappingsSchemas: stringifyMappingSchema(CasparCGMappings),
		},
		[DeviceType.HTTPSEND]: {
			displayName: generateTranslation('HTTP Send'),
			actions: HttpSendActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(HTTPSendOptions),
			mappingsSchemas: stringifyMappingSchema(HTTPSendMappings),
		},
		[DeviceType.HTTPWATCHER]: {
			displayName: generateTranslation('HTTP Watcher'),
			configSchema: JSON.stringify(HTTPWatcherOptions),
			mappingsSchemas: stringifyMappingSchema(HTTPWatcherMappings),
		},
		[DeviceType.HYPERDECK]: {
			displayName: generateTranslation('Blackmagic Hyperdeck'),
			actions: HyperdeckActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(HyperdeckOptions),
			mappingsSchemas: stringifyMappingSchema(HyperdeckMappings),
		},
		[DeviceType.LAWO]: {
			displayName: generateTranslation('Lawo'),
			configSchema: JSON.stringify(LawoOptions),
			mappingsSchemas: stringifyMappingSchema(LawoMappings),
		},
		[DeviceType.MULTI_OSC]: {
			displayName: generateTranslation('Multi OSC'),
			configSchema: JSON.stringify(MultiOSCOptions),
			mappingsSchemas: stringifyMappingSchema(MultiOSCMappings),
		},
		[DeviceType.OBS]: {
			displayName: generateTranslation('OBS Studio'),
			configSchema: JSON.stringify(OBSOptions),
			mappingsSchemas: stringifyMappingSchema(OBSMappings),
		},
		[DeviceType.OSC]: {
			displayName: generateTranslation('OSC'),
			configSchema: JSON.stringify(OSCOptions),
			mappingsSchemas: stringifyMappingSchema(OSCMappings),
		},
		[DeviceType.PANASONIC_PTZ]: {
			displayName: generateTranslation('Panasonic PTZ'),
			configSchema: JSON.stringify(PanasonicPTZOptions),
			mappingsSchemas: stringifyMappingSchema(PanasonicPTZMappings),
		},
		[DeviceType.PHAROS]: {
			displayName: generateTranslation('Pharos'),
			actions: PharosActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(PharosOptions),
			mappingsSchemas: stringifyMappingSchema(PharosMappings),
		},
		[DeviceType.QUANTEL]: {
			displayName: generateTranslation('Quantel'),
			actions: QuantelActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(QuantelOptions),
			mappingsSchemas: stringifyMappingSchema(QuantelMappings),
		},
		[DeviceType.SHOTOKU]: {
			displayName: generateTranslation('Shotoku'),
			configSchema: JSON.stringify(ShotokuOptions),
			mappingsSchemas: stringifyMappingSchema(ShotokuMappings),
		},
		[DeviceType.SINGULAR_LIVE]: {
			displayName: generateTranslation('Singular Live'),
			configSchema: JSON.stringify(SingularLiveOptions),
			mappingsSchemas: stringifyMappingSchema(SingularLiveMappings),
		},
		[DeviceType.SISYFOS]: {
			displayName: generateTranslation('Sisyfos'),
			configSchema: JSON.stringify(SisyfosOptions),
			mappingsSchemas: stringifyMappingSchema(SisyfosMappings),
		},
		[DeviceType.SOFIE_CHEF]: {
			displayName: generateTranslation('Sofie Chef'),
			configSchema: JSON.stringify(SofieChefOptions),
			mappingsSchemas: stringifyMappingSchema(SofieChefMappings),
		},
		[DeviceType.TCPSEND]: {
			displayName: generateTranslation('TCP Send'),
			actions: TcpSendActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(TCPSendOptions),
			mappingsSchemas: stringifyMappingSchema(TCPSendMappings),
		},
		[DeviceType.TELEMETRICS]: {
			displayName: generateTranslation('Telemetrics'),
			configSchema: JSON.stringify(TelemetricsOptions),
			mappingsSchemas: stringifyMappingSchema(TelemetricsMappings),
		},
		[DeviceType.TRICASTER]: {
			displayName: generateTranslation('Tricaster'),
			configSchema: JSON.stringify(TricasterOptions),
			mappingsSchemas: stringifyMappingSchema(TricasterMappings),
		},
		[DeviceType.VIZMSE]: {
			displayName: generateTranslation('Viz MSE'),
			actions: VizMSEActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(VizMSEOptions),
			mappingsSchemas: stringifyMappingSchema(VizMSEMappings),
		},
		[DeviceType.VMIX]: {
			displayName: generateTranslation('VMix'),
			actions: VMixActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(VMixOptions),
			mappingsSchemas: stringifyMappingSchema(VMixMappings),
		},
	},
}
