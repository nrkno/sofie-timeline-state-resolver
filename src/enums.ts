export type TimelineContentTypeAny =
	// TimelineContentTypeOther |
	TimelineContentTypeCasparCg |
	TimelineContentTypeLawo |
	TimelineContentTypeAtem |
	TimelineContentTypeHttp |
	TimelineContentTypeHyperdeck |
	TimelineContentTypePanasonicPtz

export enum TimelineContentTypeAtem { //  Atem-state
	ME = 'me',
	DSK = 'dsk',
	AUX = 'aux',
	SSRC = 'ssrc',
	SSRCPROPS = 'ssrcProps',
	MEDIAPLAYER = 'mp'
}

export enum TimelineContentTypeCasparCg { //  CasparCG-state
	VIDEO = 'video', // to be deprecated & replaced by MEDIA
	AUDIO = 'audio', // to be deprecated & replaced by MEDIA
	MEDIA = 'media',
	IP = 'ip',
	INPUT = 'input',
	TEMPLATE = 'template',
	HTMLPAGE = 'htmlpage',
	ROUTE = 'route',
	RECORD = 'record'
}

export enum TimelineContentTypeHttp {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete'
}

export enum TimelineContentTypeHyperdeck {
	TRANSPORT = 'transport'
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource' // a general content type, possibly to be replaced by specific ones later?
}

export enum TimelineContentTypePanasonicPtz {
	PRESET = 'presetMem',
	SPEED = 'presetSpeed',
	ZOOM_SPEED = 'zoomSpeed',
	ZOOM = 'zoom'
}
