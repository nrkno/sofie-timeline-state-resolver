import * as xml from 'xml-js'
import { TSR_INPUT_PREFIX, VMixInput, VMixInputAudio, VMixMix, VMixState } from './WMixStateDiffer'
import { InferredPartialInputStateKeys } from './connection'
import { VMixTransitionType } from 'timeline-state-resolver-types'

/**
 * Parses the state incoming from vMix into a TSR representation
 */
export class VMixXmlStateParser {
	parseVMixState(responseBody: string): VMixState {
		const preParsed = xml.xml2json(responseBody, { compact: true, spaces: 4 })
		const xmlState = JSON.parse(preParsed)
		let mixes = xmlState['vmix']['mix']
		mixes = Array.isArray(mixes) ? mixes : mixes ? [mixes] : []

		const existingInputs: Record<string, VMixInput> = {}
		const existingInputsAudio: Record<string, VMixInputAudio> = {}
		const inputsAddedByUs: Record<string, VMixInput> = {}
		const inputsAddedByUsAudio: Record<string, VMixInputAudio> = {}

		const inputKeysToNumbers: Record<string, number> = {}
		for (const input of xmlState['vmix']['inputs']['input'] as Omit<VMixInput, InferredPartialInputStateKeys>[]) {
			inputKeysToNumbers[input['_attributes']['key']] = Number(input['_attributes']['number'])
		}

		for (const input of xmlState['vmix']['inputs']['input'] as Omit<VMixInput, InferredPartialInputStateKeys>[]) {
			const title = input['_attributes']['title'] as string
			const inputNumber = Number(input['_attributes']['number'])
			const isAddedByUs = title.startsWith(TSR_INPUT_PREFIX)

			let fixedListFilePaths: VMixInput['listFilePaths'] = undefined
			if (input['_attributes']['type'] === 'VideoList' && input['list']['item'] != null) {
				fixedListFilePaths = this.ensureArray(input['list']['item']).map((item) => item['_text'])
			}

			const overlays: VMixInput['overlays'] = {}
			if (input['overlay'] != null) {
				this.ensureArray(input['overlay']).forEach(
					(item) =>
						(overlays[parseInt(item['_attributes']['index'], 10) + 1] = inputKeysToNumbers[item['_attributes']['key']])
				)
			}

			const result: VMixInput = {
				number: inputNumber,
				type: input['_attributes']['type'],
				name: isAddedByUs ? title : undefined,
				state: input['_attributes']['state'],
				playing: input['_attributes']['state'] === 'Running',
				position: Number(input['_attributes']['position']) || 0,
				duration: Number(input['_attributes']['duration']) || 0,
				loop: input['_attributes']['loop'] !== 'False',

				transform: {
					panX: Number(input['position'] ? input['position']['_attributes']['panX'] || 0 : 0),
					panY: Number(input['position'] ? input['position']['_attributes']['panY'] || 0 : 0),
					alpha: -1, // unavailable
					zoom: Number(input['position'] ? input['position']['_attributes']['zoomX'] || 1 : 1), // assume that zoomX==zoomY
				},
				overlays,
				listFilePaths: fixedListFilePaths!,
			}

			const resultAudio = {
				muted: input['_attributes']['muted'] !== 'False',
				volume: Number(input['_attributes']['volume'] || 100),
				balance: Number(input['_attributes']['balance'] || 0),
				solo: input['_attributes']['loop'] !== 'False',
				audioBuses: input['_attributes']['audiobusses'],
			}

			if (isAddedByUs) {
				inputsAddedByUs[title] = result
				inputsAddedByUsAudio[title] = resultAudio
			} else {
				existingInputs[inputNumber] = result
				existingInputsAudio[inputNumber] = resultAudio
				// TODO: how about we insert those under their titles too? That should partially lift the limitation of not being able to mix string and number input indexes
			}
		}

		// For what lies ahead I apologise - Tom
		return {
			version: xmlState['vmix']['version']['_text'],
			edition: xmlState['vmix']['edition']['_text'],
			existingInputs,
			existingInputsAudio,
			inputsAddedByUs,
			inputsAddedByUsAudio,
			overlays: (xmlState['vmix']['overlays']['overlay'] as Array<any>).map((overlay) => {
				return {
					number: Number(overlay['_attributes']['number']),
					input: overlay['_text'],
				}
			}),
			mixes: [
				{
					number: 1,
					program: Number(xmlState['vmix']['active']['_text']),
					preview: Number(xmlState['vmix']['preview']['_text']),
					transition: { effect: VMixTransitionType.Cut, duration: 0 },
				},
				...mixes.map((mix: any): VMixMix => {
					return {
						number: Number(mix['_attributes']['number']),
						program: Number(mix['active']['_text']),
						preview: Number(mix['preview']['_text']),
						transition: { effect: VMixTransitionType.Cut, duration: 0 },
					}
				}),
			],
			fadeToBlack: xmlState['vmix']['fadeToBlack']['_text'] === 'True',
			recording: xmlState['vmix']['recording']['_text'] === 'True',
			external: xmlState['vmix']['external']['_text'] === 'True',
			streaming: xmlState['vmix']['streaming']['_text'] === 'True',
			playlist: xmlState['vmix']['playList']['_text'] === 'True',
			multiCorder: xmlState['vmix']['multiCorder']['_text'] === 'True',
			fullscreen: xmlState['vmix']['fullscreen']['_text'] === 'True',
			audio: [
				{
					volume: Number(xmlState['vmix']['audio']['master']['_attributes']['volume']),
					muted: xmlState['vmix']['audio']['master']['_attributes']['muted'] === 'True',
					meterF1: Number(xmlState['vmix']['audio']['master']['_attributes']['meterF1']),
					meterF2: Number(xmlState['vmix']['audio']['master']['_attributes']['meterF2']),
					headphonesVolume: Number(xmlState['vmix']['audio']['master']['_attributes']['headphonesVolume']),
				},
			],
		}
	}

	private ensureArray<T>(value: T[] | T): T[] {
		return Array.isArray(value) ? value : [value]
	}
}
