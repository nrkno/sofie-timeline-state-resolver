import { TSRTransitionOptions } from 'timeline-state-resolver-types'
import * as _ from 'underscore'
import { Animator, LinearMovement, PhysicalAcceleration } from './animate'

interface TransitionHandler {
	values: number[]
	target: number[]
	groups: string[]

	calculatingGroups: {[groupId: string]: {
		animator: Animator
	}}

	activeIterator: NodeJS.Timeout | null
	lastUpdate: number
	updateCallback?: (newValues: number[]) => void
}
export class InternalTransitionHandler {
	private _transitions: {[identifier: string]: TransitionHandler} = {}

	public terminate () {
		// clearInterval(this._interval)
		_.each(this._transitions, (_transition, identifier) => {
			this.clearTransition(identifier)
		})
	}
	public getIdentifiers () {
		return Object.keys(this._transitions)
	}

	public clearTransition (identifier: string) {
		const t = this._transitions[identifier]
		if (t) {
			this._stopTransition(t)
			delete this._transitions[identifier]
		}
	}
	public stopAndSnapTransition (
		identifier: string,
		targetValues: number[]
	) {
		if (!this._transitions[identifier]) {
			this.initTransition(identifier, targetValues)
		}
		const t = this._transitions[identifier]

		this._stopTransition(t)

		t.values = targetValues
	}
	private initTransition (
		identifier: string,
		initialValues: number[]
	) {
		// Set initial values:
		this._transitions[identifier] = {

			values: initialValues,
			target: [], // filled in later
			groups: [], // filled in later

			activeIterator: null,
			lastUpdate: 0,

			calculatingGroups: {}
		}
	}
	public activateTransition (
		identifier: string,
		initialValues: number[],
		targetValues: number[],
		groups: string[],
		options: TSRTransitionOptions,
		animatorTypes: {[groupId: string]:
			{
				type: 'linear' | 'physical',
				options?: TSRTransitionOptions
			}
		},
		updateCallback: (newValues: number[]) => void
	) {

		if (!this._transitions[identifier]) {
			this.initTransition(identifier, initialValues)
		}
		const t = this._transitions[identifier]

		t.updateCallback = updateCallback
		t.groups = groups
		t.target = targetValues

		const getGroupValues = (values: number[], groups: string[], groupId: string) => {
			const vs: number[] = []
			_.each(groups, (g, i) => {
				if (g === groupId) vs.push(values[i])
			})
			return vs
		}
		const setGroupValues = (values: number[], groups: string[], groupId: string, newValues: number[]) => {
			let i2 = 0
			_.each(groups, (g, i) => {
				if (g === groupId) {
					values[i] = newValues[i2]
					i2++
				}
			})
		}

		if (!t.activeIterator) {
			_.each(_.uniq(t.groups), groupId => {
				if (!animatorTypes) animatorTypes = {}
				const animatorType = animatorTypes[groupId + ''] || {}
				const options2 = animatorType.options || options
				t.calculatingGroups[groupId + ''] = {
					animator: (
						animatorType.type === 'physical' ?
						new PhysicalAcceleration(
							getGroupValues(t.values, groups, groupId),
							options2.acceleration || 0.0001,
							options2.maxSpeed || 0.05,
							options2.snapDistance || 1 / 1920
						) :
						new LinearMovement(
							getGroupValues(t.values, groups, groupId),
							options2.linearSpeed || 1 / 1000
						)
					)
				}
			})
			const updateInterval = options.updateInterval || 1000 / 25

			const update = () => {
				let dt = 0
				if (t.lastUpdate) {
					dt = Date.now() - t.lastUpdate
				} else {
					dt = updateInterval
				}
				t.lastUpdate = Date.now()

				let somethingChanged = false
				_.each(_.uniq(t.groups), groupId => {

					const calculatingGroup = t.calculatingGroups[groupId + '']

					const values = getGroupValues(t.values, t.groups, groupId)
					const targetValues = getGroupValues(t.target, t.groups, groupId)
					const newValues = calculatingGroup.animator.update(targetValues, dt)

					if (!_.isEqual(newValues, values)) {
						somethingChanged = true
						setGroupValues(t.values, t.groups, groupId, newValues)
					}
				})
				if (somethingChanged) {
					// Send updateCommand:
					if (t.updateCallback) t.updateCallback(t.values)
				} else {
					// nothing changed
					this._stopTransition(t)
				}
			}

			// Start iterating:
			t.lastUpdate = 0
			t.activeIterator = setInterval(update, updateInterval)
		}
	}
	private _stopTransition (t: TransitionHandler) {
		if (t.activeIterator) {
			clearInterval(t.activeIterator)
			t.activeIterator = null
		}
	}
}
