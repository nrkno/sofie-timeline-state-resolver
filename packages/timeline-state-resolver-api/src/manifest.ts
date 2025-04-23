import type { TSRActionSchema } from 'timeline-state-resolver-types'

export type TSRDevicesManifestEntry = {
	displayName: string
	configSchema: string
	actions?: TSRActionSchema[]
	mappingsSchemas: Record<string, string>
}
