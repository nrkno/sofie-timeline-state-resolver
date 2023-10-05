import { Datastore } from 'timeline-state-resolver'
import { literal } from 'timeline-state-resolver/dist/devices/device'
import { TSRInput } from '../src'

export const input: TSRInput = {
	datastore: literal<Datastore>({
		scale: {
			value: 0.7,
			modified: Date.now(),
		},
	}),
}
