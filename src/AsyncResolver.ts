import { Resolver,
	TimelineObject,
	TimelineState,
	TimelineResolvedObject,
	UnresolvedTimeline,
	StartTime,
	EndTime,
	ResolvedTimeline,
	TimelineEvent,
	SomeTime,
	TraceLevel,
	ExternalFunctions,
	DevelopedTimeline,
	ExpressionObj,
	Expression,
	objAttributeFunction,
	TimelineKeyframe
} from 'superfly-timeline'

export class AsyncResolver {

	public setTraceLevel (levelName: string | TraceLevel): void {
		return Resolver.setTraceLevel(levelName)
	}
	public getTraceLevel (): TraceLevel {
		return Resolver.getTraceLevel()
	}
	public getState (data: UnresolvedTimeline | ResolvedTimeline, time: SomeTime, externalFunctions?: ExternalFunctions): TimelineState {
		return Resolver.getState(data, time, externalFunctions)
	}
	public getNextEvents (data: ResolvedTimeline, time: SomeTime, count?: number): TimelineEvent[] {
		return Resolver.getNextEvents(data, time, count)
	}
	public getTimelineInWindow (data: UnresolvedTimeline, startTime?: StartTime, endTime?: EndTime): ResolvedTimeline {
		return Resolver.getTimelineInWindow(data, startTime, endTime)
	}
	public getObjectsInWindow (data: UnresolvedTimeline, startTime: SomeTime, endTime?: SomeTime): DevelopedTimeline {
		return Resolver.getObjectsInWindow(data, startTime, endTime)
	}
	public interpretExpression (strOrExpr: string | number | Expression, isLogical?: boolean): string | number | ExpressionObj | null {
		return Resolver.interpretExpression(strOrExpr, isLogical)
	}
	public resolveExpression (strOrExpr: string | number | Expression, getObjectAttribute?: objAttributeFunction): StartTime {
		return Resolver.resolveExpression(strOrExpr, getObjectAttribute)
	}
	public resolveLogicalExpression (expressionOrString: Expression | null, obj?: TimelineResolvedObject, returnExpl?: boolean, currentState?: TimelineState): boolean {
		return Resolver.resolveLogicalExpression(expressionOrString, obj, returnExpl, currentState)
	}
	public developTimelineAroundTime (tl: ResolvedTimeline, time: SomeTime): DevelopedTimeline {
		return Resolver.developTimelineAroundTime(tl, time)
	}
	public decipherLogicalValue (str: string | number, obj: TimelineObject | TimelineKeyframe, currentState: TimelineState, returnExpl?: boolean): boolean | string {
		return Resolver.decipherLogicalValue(str, obj, currentState, returnExpl)
	}

}
