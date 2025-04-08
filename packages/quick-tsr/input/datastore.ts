import { Datastore } from 'timeline-state-resolver-types'
import { literal } from 'timeline-state-resolver/dist/lib'
import { TSRInput } from '../src'

export const input: TSRInput = {
	datastore: literal<Datastore>({
		scale: {
			value: 0.7,
			modified: Date.now(),
		},
	}),
}
