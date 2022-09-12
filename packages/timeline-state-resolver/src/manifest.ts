import { DeviceType } from 'timeline-state-resolver-types'
import AbstractActions = require('./integrations/abstract/$schemas/actions.json')
import AtemActions = require('./integrations/atem/$schemas/actions.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.json')

const stringifySchema = (action) => ({ ...action, payload: JSON.stringify(action.payload) })

export const manifest = {
	[DeviceType.ABSTRACT]: {
		actions: AbstractActions.map(stringifySchema),
	},
	[DeviceType.ATEM]: {
		actions: AtemActions.map(stringifySchema),
	},
	[DeviceType.CASPARCG]: {
		actions: CasparCGActions.map(stringifySchema),
	},
}
