import {
	Datastore,
	Timeline,
	TimelineDatastoreReferences,
	TimelineDatastoreReferencesContent,
	TSRTimelineContent,
} from '.'

/**
 * Set a value on an object from a .-delimited path
 * @param obj The base object
 * @param path Path of the value to set
 * @param val The value to set
 */
const set = (obj: Record<string, any>, path: string, val: any) => {
	const p = path.split('.')
	p.slice(0, -1).reduce((a, b) => (a[b] ? a[b] : (a[b] = {})), obj)[p.slice(-1)[0]] = val
}
export function fillStateFromDatastore(state: Timeline.TimelineState<TSRTimelineContent>, datastore: Datastore) {
	// clone the state so we can freely manipulate it
	const filledState: typeof state = JSON.parse(JSON.stringify(state))

	Object.values<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(filledState.layers).forEach(
		({ content, instance }) => {
			if ((content as TimelineDatastoreReferencesContent).$references) {
				Object.entries<TimelineDatastoreReferences[0]>(
					(content as TimelineDatastoreReferencesContent).$references || {}
				).forEach(([path, ref]) => {
					const datastoreVal = datastore[ref.datastoreKey]

					if (datastoreVal !== undefined) {
						if (ref.overwrite) {
							// only use the datastore value if it was changed after the tl obj started
							if ((instance.originalStart || instance.start || 0) <= datastoreVal.modified) {
								set(content, path, datastoreVal.value)
							}
						} else {
							set(content, path, datastoreVal.value)
						}
					}
				})
			}
		}
	)

	return filledState
}
