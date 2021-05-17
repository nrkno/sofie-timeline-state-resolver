import * as _ from 'underscore'
import { LinearMovement, PhysicalAcceleration } from '../devices/transitions/animate'

describe('Animate', () => {
	test('LinearMovement', () => {
		{
			// Single
			const animator = new LinearMovement([0], 1)

			const target = [1000]

			const vs: number[][] = []
			const deltaT = 100
			for (let time = 0; time < 1000; time += deltaT) {
				vs.push(animator.update(target, deltaT))
			}
			expect(_.last(vs)).toEqual([1000])
			expect(vs).toMatchSnapshot()

			expect(animator.jump([42])).toEqual([42])
		}
		{
			// x, y
			const animator = new LinearMovement([10, 10], 1)

			const target = [414, 382]

			const vs: number[][] = []
			const deltaT = 25
			for (let i = 0; i < 100; i++) {
				const v = animator.update(target, deltaT)
				vs.push(v)
				if (v[0] === 414) break
			}
			expect(_.last(vs)).toEqual([414, 382])
			expect(vs).toMatchSnapshot()
		}
	})
	test('PhysicalAcceleration', () => {
		{
			// Single
			const animator = new PhysicalAcceleration([0], 0.001, 10000, 1)

			const target = [1000]

			const vs: number[] = []
			const deltaT = 25
			for (let i = 0; i < 300; i++) {
				const v = animator.update(target, deltaT)[0]
				vs.push(v)
				if (v === 1000) break
			}
			expect(vs).toMatchSnapshot()
			expect(_.last(vs)).toEqual(1000)

			expect(animator.jump([42])).toEqual([42])
		}
		{
			// x, y
			const animator = new PhysicalAcceleration([10, 10], 0.001, 1000, 1)

			const target0 = [414, 382]
			const target1 = [-414, 401]

			const vs: number[][] = []
			const deltaT = 25
			for (let i = 0; i < 100; i++) {
				const target = i < 8 ? target0 : target1
				const v = animator.update(target, deltaT)
				vs.push(v)
				if (v[0] === -414 && v[1] === 401) break
			}
			expect(_.last(vs)).toEqual([-414, 401])
			expect(vs).toMatchSnapshot()
		}
	})
})
