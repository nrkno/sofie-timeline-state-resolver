import { DeviceType, TSRActionSchema } from 'timeline-state-resolver-types'
import AbstractActions = require('./integrations/abstract/$schemas/actions.json')
import AbstractOptions = require('./integrations/abstract/$schemas/options.json')
import AbstractMappings = require('./integrations/abstract/$schemas/mappings.json')
import AtemActions = require('./integrations/atem/$schemas/actions.json')
import AtemOptions = require('./integrations/atem/$schemas/options.json')
import AtemMappings = require('./integrations/atem/$schemas/mappings.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.json')
import CasparCGOptions = require('./integrations/casparCG/$schemas/options.json')
import CasparCGMappings = require('./integrations/casparCG/$schemas/mappings.json')
import HTTPSendOptions = require('./integrations/httpSend/$schemas/options.json')
import HTTPSendMappings = require('./integrations/httpSend/$schemas/mappings.json')
import HTTPWatcherOptions = require('./integrations/httpWatcher/$schemas/options.json')
import HTTPWatcherMappings = require('./integrations/httpWatcher/$schemas/mappings.json')
import HyperdeckActions = require('./integrations/hyperdeck/$schemas/actions.json')
import HyperdeckOptions = require('./integrations/hyperdeck/$schemas/options.json')
import HyperdeckMappings = require('./integrations/hyperdeck/$schemas/mappings.json')
import LawoOptions = require('./integrations/lawo/$schemas/options.json')
import LawoMappings = require('./integrations/lawo/$schemas/mappings.json')
import MultiOSCOptions = require('./integrations/multiOsc/$schemas/options.json')
import MultiOSCMappings = require('./integrations/multiOsc/$schemas/mappings.json')
import OBSOptions = require('./integrations/obs/$schemas/options.json')
import OBSMappings = require('./integrations/obs/$schemas/mappings.json')
import OSCOptions = require('./integrations/osc/$schemas/options.json')
import OSCMappings = require('./integrations/osc/$schemas/mappings.json')
import PanasonicPTZOptions = require('./integrations/panasonicPTZ/$schemas/options.json')
import PanasonicPTZMappings = require('./integrations/panasonicPTZ/$schemas/mappings.json')
import PharosOptions = require('./integrations/pharos/$schemas/options.json')
import PharosMappings = require('./integrations/pharos/$schemas/mappings.json')
import QuantelActions = require('./integrations/quantel/$schemas/actions.json')
import QuantelOptions = require('./integrations/quantel/$schemas/options.json')
import QuantelMappings = require('./integrations/quantel/$schemas/mappings.json')
import ShotokuOptions = require('./integrations/shotoku/$schemas/options.json')
import ShotokuMappings = require('./integrations/shotoku/$schemas/mappings.json')
import SingularLiveOptions = require('./integrations/singularLive/$schemas/options.json')
import SingularLiveMappings = require('./integrations/singularLive/$schemas/mappings.json')
import SisyfosOptions = require('./integrations/sisyfos/$schemas/options.json')
import SisyfosMappings = require('./integrations/sisyfos/$schemas/mappings.json')
import SofieChefOptions = require('./integrations/sofieChef/$schemas/options.json')
import SofieChefMappings = require('./integrations/sofieChef/$schemas/mappings.json')
import TCPSendOptions = require('./integrations/tcpSend/$schemas/options.json')
import TCPSendMappings = require('./integrations/tcpSend/$schemas/mappings.json')
import TelemetricsOptions = require('./integrations/telemetrics/$schemas/options.json')
import TelemetricsMappings = require('./integrations/telemetrics/$schemas/mappings.json')
import TricasterOptions = require('./integrations/tricaster/$schemas/options.json')
import TricasterMappings = require('./integrations/tricaster/$schemas/mappings.json')
import VizMSEActions = require('./integrations/vizMSE/$schemas/actions.json')
import VizMSEOptions = require('./integrations/vizMSE/$schemas/options.json')
import VizMSEMappings = require('./integrations/vizMSE/$schemas/mappings.json')
import VMixOptions = require('./integrations/vmix/$schemas/options.json')
import VMixMappings = require('./integrations/vmix/$schemas/mappings.json')

import CommonOptions = require('./$schemas/common-options.json')
import { generateTranslation } from './lib'

const stringifyActionSchema = (action: Omit<TSRActionSchema, 'payload'> & { payload?: any }): TSRActionSchema => ({
	...action,
	payload: JSON.stringify(action.payload),
})
const stringifyMappingSchema = (schema: any): Record<string, string> =>
	Object.fromEntries(Object.entries(schema.mappings).map(([id, sch]) => [id, JSON.stringify(sch)]))

export type TSRDevicesManifest = {
	[deviceType in DeviceType]: {
		displayName: string
		configSchema: string
		actions?: TSRActionSchema[]
		mappingsSchemas: Record<string, string>
	}
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
			configSchema: JSON.stringify(VMixOptions),
			mappingsSchemas: stringifyMappingSchema(VMixMappings),
		},
	},
}
