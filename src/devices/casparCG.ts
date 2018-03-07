import * as _ from "underscore"
import {Device, DeviceCommand, DeviceCommandContainer} from "./device"

import { CasparCG, Command as CommandNS, AMCPUtil } from "casparcg-connection"
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
	private _queue:Array<any>;

	constructor(deviceId:string, mapping:Mapping, options) {
		super(deviceId, mapping);

		this._ccgState = new CasparCGState({externalLog: console.log});
		this._ccgState.initStateFromChannelInfo([{
			channelNo: 1,
			format: 'PAL',
			frameRate: 50
		}, {
			channelNo: 2,
			format: 'PAL',
			frameRate: 50
		}])

		setInterval(() => {this.checkCommandBus()}, 20);
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
		else
			oldCasparState = this._ccgState.getState();

		let commandsToAchieveState:Array<{
			cmds: Array<CommandNS.IAMCPCommandVO>;
			additionalLayerState?: StateNS.Layer;
		}> = this._ccgState.diffStates(oldCasparState || new StateNS.CasparCG(), newCasparState);

		let returnCommands = {
			time: newState.time, 
			deviceId: this.deviceId, 
			commands: []
		};
		_.each(commandsToAchieveState, (command) => {
			// returnCommands.push({ 
			// 	time: newState.time, 
			// 	deviceId: this.deviceId, 
			// 	commands: commandsToAchieveState
			// });
			_.each(command.cmds, (cmd) => {
				returnCommands.commands.push(cmd);
			})
		})

		return returnCommands;
	}

	handleCommands(commandContainer:DeviceCommandContainer) {
		if (commandContainer.deviceId == this.deviceId) {
			this._queue = commandContainer.commands;
			this.checkCommandBus();
		}
	}

	private casparStateFromTimelineState(timelineState: TimelineState):StateNS.CasparCG {

		const caspar = new StateNS.CasparCG();
		
		_.each(timelineState.LLayers, (layer, layerName) => {
			const mapping:Mapping = this._mapping[layerName];

			if (!mapping)
				return; // we got passed a LLayer that doesn't belong to this device.
			
			const channel = new StateNS.Channel();
			channel.channelNo = Number(mapping.channel) || 1;
			caspar.channels[channel.channelNo] = channel;

			const stateLayer = new StateNS.Layer();
			stateLayer.layerNo = Number(mapping.layer) || 0;

			switch (layer.content.type) {
				case 'video' :
					stateLayer.content = 'media';
					stateLayer.media = layer.content.attributes.file;
					stateLayer.looping = layer.content.attributes.loop === true;
					stateLayer.playing = true;
					stateLayer.playTime = layer.resolved.startTime;
					break;
			}

			channel.layers[mapping.layer] = stateLayer;
		})

		return caspar;

	}

	private checkCommandBus() {
		if (this._queue && this._queue.length) {
			while (this._queue[0].time < Date.now()/1000+.02) {
				let commandContainer = this._queue[0];
				this._queue.splice(0, 1);
				
				_.each(commandContainer.commands, (commandObj) => {
					let command = AMCPUtil.deSerialize(commandObj, 'id');
					this._ccg.do(command);
		
					console.log(Date.now()/1000, commandObj);
		
					this._ccgState.applyCommands([ { cmd: commandObj } ]);
				})
			}
		}
	}
}