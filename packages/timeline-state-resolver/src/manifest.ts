import { DeviceType, SingleActionSchema } from 'timeline-state-resolver-types'
import AbstractActions = require('./integrations/abstract/$schemas/actions.json')
import AbstractOptions = require('./integrations/abstract/$schemas/options.json')
import AtemActions = require('./integrations/atem/$schemas/actions.json')
import AtemOptions = require('./integrations/atem/$schemas/options.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.json')
import CasparCGOptions = require('./integrations/casparCG/$schemas/options.json')
import HyperdeckActions = require('./integrations/hyperdeck/$schemas/actions.json')
import QuantelActions = require('./integrations/quantel/$schemas/actions.json')
import VizMSEActions = require('./integrations/vizMSE/$schemas/actions.json')

import CommonOptions = require('./$schemas/common-options.json')

const stringifySchema = (action: SingleActionSchema & { payload?: any }): SingleActionSchema => ({
	...action,
	payload: JSON.stringify(action.payload),
})

export type TSRDeviceManifest<T extends string | number = string | number> = {
	[deviceType in T]: {
		configSchema?: string
		actions?: SingleActionSchema[]
	}
}

export interface TSRManifest {
	commonOptions: string
	subdevices: TSRDeviceManifest
}

export const manifest: TSRDeviceManifest = {
	[DeviceType.ABSTRACT]: {
		actions: AbstractActions.actions.map(stringifySchema),
		configSchema: JSON.stringify(AbstractOptions),
	},
	[DeviceType.ATEM]: {
		actions: AtemActions.actions.map(stringifySchema),
		configSchema: JSON.stringify(AtemOptions),
	},
	[DeviceType.CASPARCG]: {
		actions: CasparCGActions.actions.map(stringifySchema),
		configSchema: JSON.stringify(CasparCGOptions),
	},
	[DeviceType.HYPERDECK]: {
		actions: HyperdeckActions.actions.map(stringifySchema),
	},
	[DeviceType.QUANTEL]: {
		actions: QuantelActions.actions.map(stringifySchema),
	},
	[DeviceType.VIZMSE]: {
		actions: VizMSEActions.actions.map(stringifySchema),
	},
}

export const manifest2: TSRManifest = {
	commonOptions: JSON.stringify(CommonOptions),
	subdevices: manifest,
}
