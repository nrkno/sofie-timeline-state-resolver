export type ExpectedPlayoutItemContent = ExpectedPlayoutItemContentVizMSE

export interface ExpectedPlayoutItemContentVizMSE { // TODO: This is a temporary implementation, these types are to be moved later on
	templateName: string
	elementName: string | number // if number, it's a vizPilot element
	dataFields: string[]
}
