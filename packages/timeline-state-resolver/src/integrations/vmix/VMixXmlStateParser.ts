import * as xml from 'xml-js'
import { TSR_INPUT_PREFIX, VMixInput, VMixMix, VMixState } from './VMixStateDiffer'
import { InferredPartialInputStateKeys } from './connection'
import { VMixTransitionType } from 'timeline-state-resolver-types'
import _ = require('underscore')

/**
 * Parses the state incoming from vMix
 */
export class VMixXmlStateParser {
	parseVMixState(responseBody: string): VMixState {
		const preParsed = xml.xml2json(responseBody, { compact: true, spaces: 4 })
		const xmlState = JSON.parse(preParsed)
		let mixes = xmlState['vmix']['mix']
		mixes = Array.isArray(mixes) ? mixes : mixes ? [mixes] : []

		const fixedInputs: VMixInput[] = []
		const inputsAddedByUs: VMixInput[] = []

		for (const input of xmlState['vmix']['inputs']['input'] as Omit<VMixInput, InferredPartialInputStateKeys>[]) {
			const title = input['_attributes']['title'] as string
			const isAddedByUs = title.startsWith(TSR_INPUT_PREFIX)

			let fixedListFilePaths: VMixInput['listFilePaths'] = undefined
			if (input['_attributes']['type'] === 'VideoList') {
				if (Array.isArray(input['list']['item'])) {
					// Handles the case where there is more than one item in the list.
					fixedListFilePaths = input['list']['item'].map((item) => item['_text'])
				} else if (input['list']['item']) {
					// Handles the case where there is exactly one item in the list.
					fixedListFilePaths = [input['list']['item']['_text']]
				}
			}

			let fixedOverlays: VMixInput['overlays'] = undefined
			if (Array.isArray(input['overlay'])) {
				// Handles the case where there is more than one item in the list.
				fixedOverlays = input['overlay'].map((item) => parseInt(item['_attributes']['index'], 10))
			} else if (input['overlay']) {
				// Handles the case where there is exactly one item in the list.
				fixedOverlays = [parseInt(input['overlay']['_attributes']['index'], 10)]
			}

			const result: VMixInput = {
				number: Number(input['_attributes']['number']),
				type: input['_attributes']['type'],
				name: isAddedByUs ? title : undefined,
				state: input['_attributes']['state'],
				playing: input['_attributes']['state'] === 'Running',
				position: Number(input['_attributes']['position']) || 0,
				duration: Number(input['_attributes']['duration']) || 0,
				loop: input['_attributes']['loop'] !== 'False',
				muted: input['_attributes']['muted'] !== 'False',
				volume: Number(input['_attributes']['volume'] || 100),
				balance: Number(input['_attributes']['balance'] || 0),
				solo: input['_attributes']['loop'] !== 'False',
				audioBuses: input['_attributes']['audiobusses'],
				transform: {
					panX: Number(input['position'] ? input['position']['_attributes']['panX'] || 0 : 0),
					panY: Number(input['position'] ? input['position']['_attributes']['panY'] || 0 : 0),
					alpha: -1, // unavailable
					zoom: Number(input['position'] ? input['position']['_attributes']['zoomX'] || 1 : 1), // assume that zoomX==zoomY
				},
				overlays: fixedOverlays!,
				listFilePaths: fixedListFilePaths!,
			}

			if (isAddedByUs) {
				inputsAddedByUs.push(result)
			} else {
				fixedInputs.push(result)
			}
		}

		// For what lies ahead I apologise - Tom
		return {
			version: xmlState['vmix']['version']['_text'],
			edition: xmlState['vmix']['edition']['_text'],
			existingInputs: _.indexBy(fixedInputs, 'number'),
			inputsAddedByUs: _.indexBy(inputsAddedByUs, 'name'),
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
}
