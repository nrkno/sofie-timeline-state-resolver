import AtemActions = require('./integrations/atem/$schemas/actions.json')
import CasparCGActions = require('./integrations/casparCG/$schemas/actions.json')

export const manifest = {
	atem: {
		actions: AtemActions,
	},
	casparcg: {
		actions: CasparCGActions,
	},
}
