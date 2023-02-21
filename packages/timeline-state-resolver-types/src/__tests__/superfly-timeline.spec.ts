// eslint-disable-next-line node/no-extraneous-import
import * as _ from 'underscore'
// eslint-disable-next-line node/no-extraneous-import
import * as Original from 'superfly-timeline'
import * as Local from '../superfly-timeline'

const LocalEnums = {
	EventType: Local.EventType,
}
const OriginalEnums = {
	EventType: Original.EventType,
}
describe('superfly-timeline', () => {
	test('Enums', () => {
		_.each(LocalEnums as any, (e: any, enumName: string) => {
			const originalEnum = (OriginalEnums as any)[enumName]

			expect(e).toBeTruthy()
			expect(originalEnum).toBeTruthy()

			_.each(e, (value: any, key: string) => {
				expect(value).toEqual(originalEnum[key])
			})
		})
	})
	test('Enumarable types', () => {
		_.each(Local, (type: any, typeName: string) => {
			const originalType = (Original as any)[typeName]
			if (_.isFunction(type)) {
				// eslint-disable-next-line jest/no-conditional-expect
				expect(_.isFunction(originalType)).toBeTruthy()
			} else {
				// eslint-disable-next-line jest/no-conditional-expect
				expect(type).toMatchObject(originalType)
			}
		})
	})
	test('Types', () => {
		function returnType<A>(): A {
			// nothing
			let a: any
			return a
		}
		// Note: these checks are not caught by the test, but by the type-check

		// Check that types are the same:
		const a = [
			// Check that local interfaces matches original

			(): Original.Time => returnType<Local.Time>(),
			(): Original.Duration => returnType<Local.Duration>(),
			(): Original.TimeMaybe => returnType<Local.TimeMaybe>(),
			(): Original.DurationMaybe => returnType<Local.DurationMaybe>(),
			(): Original.ObjectId => returnType<Local.ObjectId>(),
			(): Original.Times => returnType<Local.Times>(),
			(): Original.ResolveOptions => returnType<Local.ResolveOptions>(),
			(): Original.TimelineObject => returnType<Local.TimelineObject<Original.Content>>(),
			// (): Original.Content => returnType<Local.Content>(),
			(): Original.TimelineEnable => returnType<Local.TimelineEnable>(),
			(): Original.TimelineKeyframe => returnType<Local.TimelineKeyframe>(),
			// (): Original.TimelineObjectKeyframe => returnType<Local.TimelineObjectKeyframe>(),
			(): Original.ResolvedTimeline => returnType<Local.ResolvedTimeline<Original.Content>>(),
			(): Original.ResolvedTimelineObjects => returnType<Local.ResolvedTimelineObjects<Original.Content>>(),
			(): Original.ResolvedTimelineObject => returnType<Local.ResolvedTimelineObject<Original.Content>>(),
			(): Original.TimelineObjectInstance => returnType<Local.TimelineObjectInstance>(),
			(): Original.Cap => returnType<Local.Cap>(),
			(): Original.ValueWithReference => returnType<Local.ValueWithReference>(),
			(): Original.InstanceEvent => returnType<Local.InstanceEvent>(),
			(): Original.Expression => returnType<Local.Expression>(),
			(): Original.ExpressionObj => returnType<Local.ExpressionObj>(),
			(): Original.ResolvedTimelineObjectInstance =>
				returnType<Local.ResolvedTimelineObjectInstance<Original.Content>>(),
			(): Original.NextEvent => returnType<Local.NextEvent>(),
			(): Original.ResolvedTimelineObjectInstanceKeyframe =>
				returnType<Local.ResolvedTimelineObjectInstanceKeyframe<Original.Content>>(),
			(): Original.AllStates => returnType<Local.AllStates<Original.Content>>(),
			(): Original.StateInTime => returnType<Local.StateInTime<Original.Content>>(),
			(): Original.TimeEvent => returnType<Local.TimeEvent>(),

			// Check that original interfaces matches local
			(): Local.Time => returnType<Original.Time>(),
			(): Local.Duration => returnType<Original.Duration>(),
			(): Local.TimeMaybe => returnType<Original.TimeMaybe>(),
			(): Local.DurationMaybe => returnType<Original.DurationMaybe>(),
			(): Local.ObjectId => returnType<Original.ObjectId>(),
			(): Local.Times => returnType<Original.Times>(),
			(): Local.ResolveOptions => returnType<Original.ResolveOptions>(),
			(): Local.TimelineObject => returnType<Original.TimelineObject>(),
			// (): Local.Content => returnType<Original.Content>(),
			(): Local.TimelineEnable => returnType<Original.TimelineEnable>(),
			(): Local.TimelineKeyframe => returnType<Original.TimelineKeyframe>(),
			// (): Local.TimelineObjectKeyframe => returnType<Original.TimelineObjectKeyframe>(),
			(): Local.ResolvedTimeline => returnType<Original.ResolvedTimeline>(),
			(): Local.ResolvedTimelineObjects => returnType<Original.ResolvedTimelineObjects>(),
			(): Local.ResolvedTimelineObject => returnType<Original.ResolvedTimelineObject>(),
			(): Local.TimelineObjectInstance => returnType<Original.TimelineObjectInstance>(),
			(): Local.Cap => returnType<Original.Cap>(),
			(): Local.ValueWithReference => returnType<Original.ValueWithReference>(),
			(): Local.InstanceEvent => returnType<Original.InstanceEvent>(),
			(): Local.Expression => returnType<Original.Expression>(),
			(): Local.ExpressionObj => returnType<Original.ExpressionObj>(),
			(): Local.ResolvedTimelineObjectInstance => returnType<Original.ResolvedTimelineObjectInstance>(),
			(): Local.NextEvent => returnType<Original.NextEvent>(),
			(): Local.ResolvedTimelineObjectInstanceKeyframe => returnType<Original.ResolvedTimelineObjectInstanceKeyframe>(),
			(): Local.AllStates => returnType<Original.AllStates>(),
			(): Local.StateInTime => returnType<Original.StateInTime>(),
			(): Local.TimeEvent => returnType<Original.TimeEvent>(),
		]
		expect(a).toBeTruthy()

		expect(1).toEqual(1)
	})
})
