export interface MediaInfo {
	name: string
}

export interface MediaObject {
	/** The playable reference (CasparCG clip name, quantel GUID, etc) */
	mediaId: string

	/** Media object file path relative to playout server */
	mediaPath: string
	/** Media object size in bytes */
	mediaSize: number
	/** Timestamp when the media object was last updated */
	mediaTime: number
	/** Info about media content. If undefined: inficates that the media is NOT playable (could be transferring, or a placeholder)  */
	mediainfo?: MediaInfo

	/** Thumbnail file size in bytes */
	thumbSize: number
	/** Thumbnail last updated timestamp */
	thumbTime: number

	/** Preview file size in bytes */
	previewSize?: number
	/** Thumbnail last updated timestamp */
	previewTime?: number
	/** Preview location */
	previewPath?: string

	cinf: string // useless to us
	tinf: string // useless to us

	_id: string
	_rev: string
}
