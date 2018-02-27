import * as _ from "underscore"
import {Device, DeviceCommand} from "./device"

import { CasparCG, Command as CommandNS } from "casparcg-connection"
import { Mapping } from '../conductor';
import { TimelineState } from 'superfly-timeline';
import { CasparCGState, StateObject as StateNS } from "casparcg-state";


/*
	This is a wrapper for a CasparCG device. All commands will be sent through this
*/
export class CasparCGDevice extends Device {

	private _ccg:CasparCG;
	private _state:TimelineState;
	private _ccgState:CasparCGState;

	constructor(deviceId:string, mapping:Mapping, options) {
		super(deviceId, mapping);

		this._ccgState = new CasparCGState({externalLog: console.log});
		this._ccgState.initStateFromChannelInfo([])
		console.log(this._ccgState)
	}

	init():Promise<boolean> {

		return new Promise((resolve/*, reject*/) => {

			

			this._ccg = new CasparCG({
				// TODO: add options
			})

			
			this._ccg.onConnected = () => {
				resolve(true);

				//this._ccg.do('test')
			};


			// TODO:


		});
	}

	generateCommandsAgainstState(newState:TimelineState, oldState?:TimelineState):Array<DeviceCommand> {
		let newCasparState = this.casparStateFromTimelineState(newState);
		let oldCasparState;

		if (oldState) 
			oldCasparState = this.casparStateFromTimelineState(oldState);

		let commandsToAchieveState:Array<{
			cmds: Array<CommandNS.IAMCPCommandVO>;
			additionalLayerState?: StateNS.Layer;
		}> = this._ccgState.diffStates(oldCasparState || new StateNS.CasparCG(), newCasparState);

		let returnCommands = [];
		_.each(commandsToAchieveState, (command) => {
			returnCommands.push({ time: newState.time, deviceId: this._deviceId, cmd: command });
		})

		return returnCommands;
	}

	private casparStateFromTimelineState(timelineState: TimelineState):StateNS.CasparCG {

		const caspar = new StateNS.CasparCG();
		
		_.each(timelineState.LLayers, (layer, layerName) => {
			const mapping:Mapping = this._mapping[layerName];

			if (!mapping)
				throw 'Mapping not found: we can\'t handle this error (yet?)';
			
			const channel = new StateNS.Channel();
			channel.channelNo = mapping.channel || 1;
			caspar.channels[channel.channelNo] = channel;

			const stateLayer = new StateNS.Layer();

			switch (layer.content.type) {
				case 'video' :
					stateLayer.media = layer.content.attributes.file;
					stateLayer.looping = layer.content.attributes.loop === true;
			}

			channel.layers[mapping.layer] = layer;
		})

		return caspar;

	}
}