import { ExpectedPlayoutItemContent } from './types/src'

export interface ExpectedPlayoutItemContentBase {
	/** Id of the rundown the items comes from */
	rundownId: string
	/** Id of the rundown playlist the items comes from */
	playlistId: string
}

export type ExpectedPlayoutItem = ExpectedPlayoutItemContent & ExpectedPlayoutItemContentBase
