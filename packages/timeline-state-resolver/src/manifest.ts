import { DeviceType, TSRActionSchema } from 'timeline-state-resolver-types'
import AbstractActions = require('./integrations/abstract/$schemas/actions.json')
import AbstractOptions = require('./integrations/abstract/$schemas/options.json')
import AtemActions = require('./integrations/atem/$schemas/actions.json')
import AtemOptions = require('./integrations/atem/$schemas/options.json')
import AtemMappings = require('./integrations/atem/$schemas/mappings.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.json')
import CasparCGOptions = require('./integrations/casparCG/$schemas/options.json')
import HTTPSendOptions = require('./integrations/httpSend/$schemas/options.json')
import HTTPWatcherOptions = require('./integrations/httpWatcher/$schemas/options.json')
import HyperdeckOptions = require('./integrations/hyperdeck/$schemas/options.json')
import LawoOptions = require('./integrations/lawo/$schemas/options.json')
import OBSOptions = require('./integrations/obs/$schemas/options.json')
import OSCOptions = require('./integrations/osc/$schemas/options.json')
import PanasonicPTZOptions = require('./integrations/panasonicPTZ/$schemas/options.json')
import PharosOptions = require('./integrations/pharos/$schemas/options.json')
import HyperdeckActions = require('./integrations/hyperdeck/$schemas/actions.json')
import QuantelActions = require('./integrations/quantel/$schemas/actions.json')
import QuantelOptions = require('./integrations/quantel/$schemas/options.json')
import ShotokuOptions = require('./integrations/shotoku/$schemas/options.json')
import SingularLiveOptions = require('./integrations/singularLive/$schemas/options.json')
import SisyfosOptions = require('./integrations/sisyfos/$schemas/options.json')
import SofieChefOptions = require('./integrations/sofieChef/$schemas/options.json')
import TCPSendOptions = require('./integrations/tcpSend/$schemas/options.json')
import TelemetricsOptions = require('./integrations/telemetrics/$schemas/options.json')
import VizMSEActions = require('./integrations/vizMSE/$schemas/actions.json')
import VizMSEOptions = require('./integrations/vizMSE/$schemas/options.json')
import VMixOptions = require('./integrations/vmix/$schemas/options.json')

import CommonOptions = require('./$schemas/common-options.json')

const stringifySchema = (action: TSRActionSchema & { payload?: any }): TSRActionSchema => ({
	...action,
	payload: JSON.stringify(action.payload),
})

export type TSRDevicesManifest = {
	[deviceType in DeviceType]: {
		displayName: string
		configSchema: string
		actions?: TSRActionSchema[]
		mappingSchema?: string // TODO - make required
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
			displayName: 'Abstract',
			actions: AbstractActions.actions.map(stringifySchema),
			configSchema: JSON.stringify(AbstractOptions),
		},
		[DeviceType.ATEM]: {
			displayName: 'Blackmagic ATEM',
			actions: AtemActions.actions.map(stringifySchema),
			configSchema: JSON.stringify(AtemOptions),
			mappingSchema: JSON.stringify(AtemMappings),
		},
		[DeviceType.CASPARCG]: {
			displayName: 'CasparCG',
			actions: CasparCGActions.actions.map(stringifySchema),
			configSchema: JSON.stringify(CasparCGOptions),
		},
		[DeviceType.HTTPSEND]: {
			displayName: 'HTTP Send',
			configSchema: JSON.stringify(HTTPSendOptions),
		},
		[DeviceType.HTTPWATCHER]: {
			displayName: 'HTTP Watcher',
			configSchema: JSON.stringify(HTTPWatcherOptions),
		},
		[DeviceType.HYPERDECK]: {
			displayName: 'Blackmagic Hyperdeck',
			actions: HyperdeckActions.actions.map(stringifySchema),
			configSchema: JSON.stringify(HyperdeckOptions),
		},
		[DeviceType.LAWO]: {
			displayName: 'Lawo',
			configSchema: JSON.stringify(LawoOptions),
		},
		[DeviceType.OBS]: {
			displayName: 'OBS Studio',
			configSchema: JSON.stringify(OBSOptions),
		},
		[DeviceType.OSC]: {
			displayName: 'OSC',
			configSchema: JSON.stringify(OSCOptions),
		},
		[DeviceType.PANASONIC_PTZ]: {
			displayName: 'Panasonic PTZ',
			configSchema: JSON.stringify(PanasonicPTZOptions),
		},
		[DeviceType.PHAROS]: {
			displayName: 'Pharos',
			configSchema: JSON.stringify(PharosOptions),
		},
		[DeviceType.QUANTEL]: {
			displayName: 'Quantel',
			actions: QuantelActions.actions.map(stringifySchema),
			configSchema: JSON.stringify(QuantelOptions),
		},
		[DeviceType.SHOTOKU]: {
			displayName: 'Shotoku',
			configSchema: JSON.stringify(ShotokuOptions),
		},
		[DeviceType.SINGULAR_LIVE]: {
			displayName: 'Singular Live',
			configSchema: JSON.stringify(SingularLiveOptions),
		},
		[DeviceType.SISYFOS]: {
			displayName: 'Sisyfos',
			configSchema: JSON.stringify(SisyfosOptions),
		},
		[DeviceType.SOFIE_CHEF]: {
			displayName: 'Sofie Chef',
			configSchema: JSON.stringify(SofieChefOptions),
		},
		[DeviceType.TCPSEND]: {
			displayName: 'TCP Send',
			configSchema: JSON.stringify(TCPSendOptions),
		},
		[DeviceType.TELEMETRICS]: {
			displayName: 'Telemetrics',
			configSchema: JSON.stringify(TelemetricsOptions),
		},
		[DeviceType.VIZMSE]: {
			displayName: 'Viz MSE',
			actions: VizMSEActions.actions.map(stringifySchema),
			configSchema: JSON.stringify(VizMSEOptions),
		},
		[DeviceType.VMIX]: {
			displayName: 'VMix',
			configSchema: JSON.stringify(VMixOptions),
		},
	},
}
