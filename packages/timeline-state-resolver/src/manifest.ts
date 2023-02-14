import { DeviceType } from 'timeline-state-resolver-types'
import AbstractActions = require('./integrations/abstract/$schemas/actions.json')
import AtemActions = require('./integrations/atem/$schemas/actions.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.json')
import HyperdeckActions = require('./integrations/hyperdeck/$schemas/actions.json')
import QuantelActions = require('./integrations/quantel/$schemas/actions.json')
import VizMSEActions = require('./integrations/vizMSE/$schemas/actions.json')

const stringifySchema = (action) => ({ ...action, payload: JSON.stringify(action.payload) })

export const manifest = {
	[DeviceType.ABSTRACT]: {
		actions: AbstractActions.actions.map(stringifySchema),
	},
	[DeviceType.ATEM]: {
		actions: AtemActions.actions.map(stringifySchema),
	},
	[DeviceType.CASPARCG]: {
		actions: CasparCGActions.actions.map(stringifySchema),
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
