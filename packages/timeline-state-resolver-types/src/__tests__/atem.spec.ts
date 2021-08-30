// eslint-disable-next-line node/no-extraneous-import
import { Enums as AtemStateEnums } from 'atem-state'
import { AtemTransitionStyle } from '../'

describe('Atem types', () => {
	test('Atem types: TransitionStyle', async () => {
		expect(AtemTransitionStyle).toEqual(AtemStateEnums.TransitionStyle)
	})
})
