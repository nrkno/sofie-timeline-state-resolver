import * as _ from 'underscore'
import * as Original from 'superfly-timeline'
import * as Local from '../superfly-timeline'

describe('superfly-timeline', () => {
	test('Enums', () => {
		_.each(Local.Enums as any, (e: any, enumName: string) => {
			let originalEnum = Original.Enums[enumName]

			expect(e).toBeTruthy()
			expect(originalEnum).toBeTruthy()

			_.each(e, (value: any, key: string) => {
				expect(value).toEqual(originalEnum[key])
			})
		})
	})
	test('Enumarable types', () => {
		_.each(Local, (type: any, typeName: string) => {
			let originalType = Original[typeName]
			if (_.isFunction(type)) {
				expect(_.isFunction(originalType)).toBeTruthy()
			} else {
				expect(type).toMatchObject(originalType)
			}
		})
	})
	test('Types', () => {
		function returnType<A> (): A {
			// nothing
			let a: any
			return a
		}
		// Note: these checks are not caught by the test, but by the linter

		// Check that types are the same:
		let a = [
			// Check that local interfaces matches original
			(): Original.TimelineTrigger => returnType<Local.TimelineTrigger>(),
			(): Original.TimelineObject => returnType<Local.TimelineObject>(),
			(): Original.TimelineGroup => returnType<Local.TimelineGroup>(),
			(): Original.TimelineEvent => returnType<Local.TimelineEvent>(),
			(): Original.TimelineKeyframe => returnType<Local.TimelineKeyframe>(),
			(): Original.TimelineResolvedObject => returnType<Local.TimelineResolvedObject>(),
			(): Original.TimelineResolvedKeyframe => returnType<Local.TimelineResolvedKeyframe>(),
			(): Original.ResolvedDetails => returnType<Local.ResolvedDetails>(),
			(): Original.ResolvedObjectId => returnType<Local.ResolvedObjectId>(),
			(): Original.ResolvedTimeline => returnType<Local.ResolvedTimeline>(),
			(): Original.DevelopedTimeline => returnType<Local.DevelopedTimeline>(),
			(): Original.TimelineState => returnType<Local.TimelineState>(),
			(): Original.ExternalFunctions => returnType<Local.ExternalFunctions>(),
			(): Original.UnresolvedTimeline => returnType<Local.UnresolvedTimeline>(),
			(): Original.ResolvedObjectsStore => returnType<Local.ResolvedObjectsStore>(),
			(): Original.ResolvedObjectTouches => returnType<Local.ResolvedObjectTouches>(),
			(): Original.ExpressionObj => returnType<Local.ExpressionObj>(),
			(): Original.Filter => returnType<Local.Filter>(),
			// interfaces
			(): Original.TimeMaybe => returnType<Local.TimeMaybe>(),
			(): Original.StartTime => returnType<Local.StartTime>(),
			(): Original.EndTime => returnType<Local.EndTime>(),
			(): Original.Duration => returnType<Local.Duration>(),
			(): Original.SomeTime => returnType<Local.SomeTime>(),
			(): Original.ObjectId => returnType<Local.ObjectId>(),
			(): Original.Expression => returnType<Local.Expression>(),

			// Check that original interfaces matches local
			(): Local.TimelineTrigger => returnType<Original.TimelineTrigger>(),
			(): Local.TimelineObject => returnType<Original.TimelineObject>(),
			(): Local.TimelineGroup => returnType<Original.TimelineGroup>(),
			(): Local.TimelineEvent => returnType<Original.TimelineEvent>(),
			(): Local.TimelineKeyframe => returnType<Original.TimelineKeyframe>(),
			(): Local.TimelineResolvedObject => returnType<Original.TimelineResolvedObject>(),
			(): Local.TimelineResolvedKeyframe => returnType<Original.TimelineResolvedKeyframe>(),
			(): Local.ResolvedDetails => returnType<Original.ResolvedDetails>(),
			(): Local.ResolvedObjectId => returnType<Original.ResolvedObjectId>(),
			(): Local.ResolvedTimeline => returnType<Original.ResolvedTimeline>(),
			(): Local.DevelopedTimeline => returnType<Original.DevelopedTimeline>(),
			(): Local.TimelineState => returnType<Original.TimelineState>(),
			(): Local.ExternalFunctions => returnType<Original.ExternalFunctions>(),
			(): Local.UnresolvedTimeline => returnType<Original.UnresolvedTimeline>(),
			(): Local.ResolvedObjectsStore => returnType<Original.ResolvedObjectsStore>(),
			(): Local.ResolvedObjectTouches => returnType<Original.ResolvedObjectTouches>(),
			(): Local.ExpressionObj => returnType<Original.ExpressionObj>(),
			(): Local.Filter => returnType<Original.Filter>(),
			// types
			(): Local.TimeMaybe => returnType<Original.TimeMaybe>(),
			(): Local.StartTime => returnType<Original.StartTime>(),
			(): Local.EndTime => returnType<Original.EndTime>(),
			(): Local.Duration => returnType<Original.Duration>(),
			(): Local.SomeTime => returnType<Original.SomeTime>(),
			(): Local.ObjectId => returnType<Original.ObjectId>(),
			(): Local.Expression => returnType<Original.Expression>()

		]
		a = a

		expect(1).toEqual(1)
	})
})
