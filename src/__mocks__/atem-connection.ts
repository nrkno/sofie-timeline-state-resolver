import {

} from '../../node_modules/atem-connection'
import { EventEmitter } from 'events'

export {
	Enums,
	VideoState,
	AtemState,
	Commands
} from '../../node_modules/atem-connection'

let instances = []

let setTimeoutOrg = setTimeout

export class Atem extends EventEmitter {

	constructor () {
		super()
		instances.push(this)
	}
	connect () {
		// mock a connection
		setTimeoutOrg(() => {
			this.emit('connected', true)
		}, 10)
	}
	get state () {
		return {
			info: {
				// apiVersion: VersionProps
				capabilities: { // AtemCapabilites
					MEs: 1,
					sources: 8,
					colorGenerators: 2,
					auxilliaries: 1,
					talkbackOutputs: 0,
					mediaPlayers: 2,
					serialPorts: 1,
					maxHyperdecks: 1,
					DVEs: 1,
					stingers: 1,
					superSources: 1
				}
				// model: Model
				// productIdentifier: string
			},
			video: {
				// ME: Array<MixEffect>
				downstreamKeyers: [{ // Array<DownstreamKeyer>
					sources: {
						fillSource: 1,
						cutSource: 2
					}
					// properties: DownstreamKeyerProperties,
					// onAir: boolean,
					// inTransition: boolean,
					// isAuto: boolean,
					// remainingFrames: number
				}],
				// auxilliaries: Array<number>
				superSourceBoxes: [{ // Array<SuperSourceBox>
					// enabled: boolean,
					// source: number,
					// x: number,
					// y: number,
					// size: number,
					// cropped: boolean,
					// cropTop: number,
					// cropBottom: number,
					// cropLeft: number,
					// cropRight: number
				}]
				// getMe(index: number): MixEffect
				// getDownstreamKeyer(index: number): DownstreamKeyer
			}
			// channels: Array<{
			// 	name: string
			// 	label: string
			// }>
			// tallies: Array<number>
			// audio: AtemAudioState
			// media: MediaState
			// inputs: Array<InputChannel>
		}
	}
}
