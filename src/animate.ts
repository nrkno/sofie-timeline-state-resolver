/**
 * This file contains various classes that handles animations
 * The animators handle arrays of values, so both single magnitudes [opacity] and vectors (coordinates [x, y] or [x, y, z]) are supported
 */

/** Abstract class for Animators */
export abstract class Animator {
	protected positions: number[]

	constructor (startPositions: number[]) {
		this.positions = startPositions
	}
	protected clonePositions () {
		return [...this.positions] // clone
	}
	/** Cause the value to jump to the target value  */
	public jump (target: number[]): number[] {
		if (target.length !== this.positions.length) throw new Error(`Error in Animator.update: target has the wrong length (${target.length}), compared to internal positions (${this.positions.length})`)
		return []
	}
	/** This function is called on every iteraton (frame)
	 * @param target The target value the Animator is aiming towards
	 * @param _timeSinceLastUpdate The delta time since last call to .update()
	 */
	public update (target: number[], _timeSinceLastUpdate: number): number[] {
		if (target.length !== this.positions.length) throw new Error(`Error in Animator.update: target has the wrong length (${target.length}), compared to internal positions (${this.positions.length})`)
		return []
	}
	/** Calculate multi-dimensional distance between values */
	protected getTotalDistanceToTarget (toValue: number[], fromValue: number[]): number {
		return this.hypotenuse(
			fromValue.map((value, index) => {
				const targetPosition = toValue[index]
				return targetPosition - value
			})
		)
	}
	/** Calculate multi-dimensional hypotenuse of a vector */
	protected hypotenuse (vector: number[]): number {
		// Calculate hypotenuse in n dimensions:
		return Math.sqrt(
			vector.map((value) => {
				return Math.pow(value, 2)
			}).reduce((mem, value) => {
				return (mem || 0) + value
			})
		)
	}
}

/** Linear movement towards the target */
export class LinearMovement extends Animator {
	constructor (
		startPositions: number[],
		/** Speed of linear movement [units/ms] */
		private speed: number
	) {
		super(startPositions)
	}
	public jump (target: number[]): number[] {
		super.jump(target)
		this.positions = target
		return this.clonePositions()
	}
	public update (target: number[], timeSinceLastUpdate: number): number[] {
		super.update(target, timeSinceLastUpdate)

		const totalDistanceToTarget = this.getTotalDistanceToTarget(target, this.positions)
		if (totalDistanceToTarget > 0) {
			this.positions.forEach((position, index) => {
				const targetPosition = target[index]
				const distanceToTarget = Math.abs(targetPosition - position)
				const step = (
					this.speed *
					distanceToTarget / totalDistanceToTarget *
					timeSinceLastUpdate
				)
				if (distanceToTarget < step) {
					// The distance left is less than the step, just jump to it then:
					this.positions[index] = targetPosition
				} else {
					// Move towards the target:
					this.positions[index] += step * Math.sign(targetPosition - position)
				}
			})
		}
		return this.clonePositions()
	}
}
/** Simulate physical movement: Accelerate towards target until reaching max speed. Then decelerate in time to stop at target. */
export class PhysicalAcceleration extends Animator {
	private speed: number[]
	private directionChanges: number[]
	constructor (
		/** The starting positions */
		startPositions: number[],
		/** Accelerate towards target with this acceleration. [unit per ] */
		private acceleration: number,
		/** Maximal speed */
		private maxSpeed: number = 2147483648,
		/** Snap to target when distance is less than this value */
		private snapDistance: number = 0
	) {
		super(startPositions)
		this.speed = startPositions.map(() => 0)
		this.directionChanges = startPositions.map(() => 0)
	}
	public jump (target: number[]): number[] {
		super.jump(target)
		this.positions = target
		this.speed = this.speed.map(() => 0)
		return this.clonePositions()
	}
	/**
	 * Update the iteration
	 * @param target Target position(s)
	 * @param timeSinceLastUpdate Time since last update
	 */
	public update (target: number[], timeSinceLastUpdate: number): number[] {
		super.update(target, timeSinceLastUpdate)

		/** Position at next step, given current speed */
		const extrapolatedPositions = this.positions.map((position, index) => position + this.speed[index] * timeSinceLastUpdate * 1)

		const totalDistanceToTarget = this.getTotalDistanceToTarget(target, extrapolatedPositions)

		const totalSpeed = this.hypotenuse(this.speed)

		if (totalDistanceToTarget > 0) {
			let voteToSnap = 0
			extrapolatedPositions.forEach((position, index) => {
				const targetPosition = target[index]

				const distanceToTarget = Math.abs(targetPosition - position)
				/** What direction to accelerate towards */
				const directionToTarget = Math.sign(targetPosition - position)

				// Determine whether to accelerate or decelerate?

				const acceleration = (
					this.acceleration *
					distanceToTarget / totalDistanceToTarget
				)

				const maxSpeed = Math.abs(
					totalSpeed > 0 ?
					(
						this.maxSpeed *
						this.speed[index] / totalSpeed
					) :
					this.maxSpeed
				) || Infinity

				/** Distance to use as threshold for snapping to position */
				// const snapDistance = 4 * acceleration * timeSinceLastUpdate

				/** Absolute value of current speed */
				const speed = Math.abs(this.speed[index])

				/** The time it takes to decelerate to a full stop */
				const timeToStop = speed / acceleration

				/** Mininum distance it takes to decelerate to stop, at the current speed */
				const minimumDistanceToStop = (
					  speed * timeToStop
					- (acceleration * 0.9) * Math.pow(timeToStop, 2) / 2
				)

				const stepAcceleration = directionToTarget * acceleration * timeSinceLastUpdate

				/** Mininum distance it takes to decelerate to stop, at the speed after one step of acceleration */
				const minimumDistanceToStopAfterNextTick = (
					  speed * timeSinceLastUpdate
					+ Math.abs(speed + stepAcceleration) * timeToStop
					- acceleration * Math.pow(timeToStop, 2) / 2
				)

				if (distanceToTarget + Math.max(0, minimumDistanceToStop) <= this.snapDistance) {
					// Vote to snap to target:
					voteToSnap++
					// And decelerate, to prevent wobbling:
					this.speed[index] *= 0.8
				} else {
					if (
						minimumDistanceToStop > distanceToTarget &&
						Math.sign(this.speed[index]) === directionToTarget
					) {
						// Decelerate:
						const speedSign = Math.sign(this.speed[index])
						this.speed[index] -= stepAcceleration
						if (Math.sign(this.speed[index]) !== speedSign) this.speed[index] = 0
					} else if (
						minimumDistanceToStopAfterNextTick < distanceToTarget ||
						Math.sign(this.speed[index]) !== directionToTarget
					) {
						// Accelerate:
						// Apply cap, so that we don't accelerate past the target
						this.speed[index] += this._cap(distanceToTarget / timeSinceLastUpdate, stepAcceleration)
					} else {
						// Neither decelerate or accelerate
					}
				}
				if (
					Math.abs(this.positions[index] - target[index]) <= Math.abs(stepAcceleration) * 8
				) {
					// Apply extra friction when close, to decrease wobbling
					this.speed[index] *= 0.8
				}

				// Cap speed at maxSpeed and apply friction:
				this.speed[index] = this._cap(maxSpeed, this.speed[index])
				this.positions[index] += this.speed[index] * timeSinceLastUpdate

				if (
					this.snapDistance &&
					Math.abs(this.positions[index] - target[index]) <= this.snapDistance &&
					Math.abs(this.speed[index] * timeSinceLastUpdate) <= this.snapDistance * 2
				) {
					this.positions[index] = target[index]
					this.speed[index] = 0
				}

				const newDirectionToTarget = Math.sign(targetPosition - this.positions[index])

				if (Math.sign(directionToTarget) !== Math.sign(newDirectionToTarget)) {
					this.directionChanges[index]++
					// Vote to snap to target:
					// voteToSnap++
				} else {
					this.directionChanges[index] = 0
				}

				if (this.directionChanges[index] > 3) {
					this.positions[index] = target[index]
					this.speed[index] = 0

					this.directionChanges[index] = 0
				}
			})
			if (voteToSnap === this.positions.length) {
				// If everyone wants to snap, lets do that.
				this.positions.forEach((_position, index) => {
					this.positions[index] = target[index]
					this.speed[index] = 0

					this.directionChanges[index] = 0
				})
			}
		}
		return this.clonePositions()
	}
	private _cap (maxValue: number, value: number): number {
		return Math.min(maxValue,
			Math.max(-maxValue,
				value
			)
		)
	}
}
