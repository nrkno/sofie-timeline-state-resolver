import { ExpectedPlayoutItemContent } from 'timeline-state-resolver-types'

export interface ExpectedPlayoutItemContentBase {
	/** Id of the rundown the items comes from */
	rundownId: string
	/** Id of the rundown playlist the items comes from */
	playlistId: string
	/** Is created for studio/rundown baseline */
	baseline?: 'rundown' | 'studio'
}

export type ExpectedPlayoutItem = ExpectedPlayoutItemContent & ExpectedPlayoutItemContentBase
