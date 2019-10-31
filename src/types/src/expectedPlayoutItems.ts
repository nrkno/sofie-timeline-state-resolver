export type ExpectedPlayoutItemContent = ExpectedPlayoutItemContentVizMSE

export interface ExpectedPlayoutItemContentVizMSE { // TODO: This is a temporary implementation, these types are to be moved later on
	/** Name of the element, or Pilot Element */
	templateName: string | number // if number, it's a vizPilot element
	/** Data fields of the element (for internal elements only) */
	templateData?: string[]
}
