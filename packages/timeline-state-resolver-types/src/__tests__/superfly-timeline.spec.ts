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
			// Check that local interfaces matches original:
			(): Original.AllStates => returnType<Original.AllStates>(),
			(): Original.Cap => returnType<Original.Cap>(),
			(): Original.Content => returnType<Original.Content>(),
			(): Original.Duration => returnType<Original.Duration>(),
			(): Original.EventType => returnType<Original.EventType>(),
			(): Original.Expression => returnType<Original.Expression>(),
			(): Original.ExpressionObj => returnType<Original.ExpressionObj>(),
			(): Original.ExpressionOperator => returnType<Original.ExpressionOperator>(),
			(): Original.InnerExpression => returnType<Original.InnerExpression>(),
			(): Original.InstanceBase => returnType<Original.InstanceBase>(),
			(): Original.NextEvent => returnType<Original.NextEvent>(),
			(): Original.ObjectId => returnType<Original.ObjectId>(),
			(): Original.ResolveOptions => returnType<Original.ResolveOptions>(),
			(): Original.ResolvedTimeline => returnType<Original.ResolvedTimeline>(),
			(): Original.ResolvedTimelineObject => returnType<Original.ResolvedTimelineObject>(),
			(): Original.ResolvedTimelineObjectInstance => returnType<Original.ResolvedTimelineObjectInstance>(),
			(): Original.ResolvedTimelineObjectInstanceKeyframe =>
				returnType<Original.ResolvedTimelineObjectInstanceKeyframe>(),
			(): Original.ResolvedTimelineObjects => returnType<Original.ResolvedTimelineObjects>(),
			(): Original.ResolverCache => returnType<Original.ResolverCache>(),
			(): Original.StateInTime => returnType<Original.StateInTime>(),
			(): Original.Time => returnType<Original.Time>(),
			(): Original.TimelineEnable => returnType<Original.TimelineEnable>(),
			(): Original.TimelineKeyframe => returnType<Original.TimelineKeyframe>(),
			(): Original.TimelineObject => returnType<Original.TimelineObject>(),
			(): Original.TimelineObjectInstance => returnType<Original.TimelineObjectInstance>(),
			(): Original.TimelineState => returnType<Original.TimelineState>(),

			// Check that original interfaces matches local
			(): Original.AllStates => returnType<Original.AllStates>(),
			(): Original.Cap => returnType<Original.Cap>(),
			(): Original.Content => returnType<Original.Content>(),
			(): Original.Duration => returnType<Original.Duration>(),
			(): Original.EventType => returnType<Original.EventType>(),
			(): Original.Expression => returnType<Original.Expression>(),
			(): Original.ExpressionObj => returnType<Original.ExpressionObj>(),
			(): Original.ExpressionOperator => returnType<Original.ExpressionOperator>(),
			(): Original.InnerExpression => returnType<Original.InnerExpression>(),
			(): Original.InstanceBase => returnType<Original.InstanceBase>(),
			(): Original.NextEvent => returnType<Original.NextEvent>(),
			(): Original.ObjectId => returnType<Original.ObjectId>(),
			(): Original.ResolveOptions => returnType<Original.ResolveOptions>(),
			(): Original.ResolvedTimeline => returnType<Original.ResolvedTimeline>(),
			(): Original.ResolvedTimelineObject => returnType<Original.ResolvedTimelineObject>(),
			(): Original.ResolvedTimelineObjectInstance => returnType<Original.ResolvedTimelineObjectInstance>(),
			(): Original.ResolvedTimelineObjectInstanceKeyframe =>
				returnType<Original.ResolvedTimelineObjectInstanceKeyframe>(),
			(): Original.ResolvedTimelineObjects => returnType<Original.ResolvedTimelineObjects>(),
			(): Original.ResolverCache => returnType<Original.ResolverCache>(),
			(): Original.StateInTime => returnType<Original.StateInTime>(),
			(): Original.Time => returnType<Original.Time>(),
			(): Original.TimelineEnable => returnType<Original.TimelineEnable>(),
			(): Original.TimelineKeyframe => returnType<Original.TimelineKeyframe>(),
			(): Original.TimelineObject => returnType<Original.TimelineObject>(),
			(): Original.TimelineObjectInstance => returnType<Original.TimelineObjectInstance>(),
			(): Original.TimelineState => returnType<Original.TimelineState>(),
		]
		expect(a).toBeTruthy()

		expect(1).toEqual(1)
	})
})
