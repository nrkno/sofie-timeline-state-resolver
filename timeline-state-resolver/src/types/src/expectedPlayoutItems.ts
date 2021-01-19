import { VIZMSEPlayoutItemContent } from './vizMSE'

export type ExpectedPlayoutItemContent = ExpectedPlayoutItemContentVizMSE

export interface ExpectedPlayoutItemContentBase {
	/** Id of the rundown the items comes from */
	rundownId: string
}
export type ExpectedPlayoutItemContentVizMSE = ExpectedPlayoutItemContentBase & VIZMSEPlayoutItemContent
