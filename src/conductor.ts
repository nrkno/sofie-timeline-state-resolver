import * as _ from "underscore"
import {Resolver} from "superfly-timeline"

import {Device, DeviceCommand} from "./devices/device"
import {CasparCGDevice} from "./devices/casparCG"

const LOOKAHEADTIME = 5000;

export interface TimelineContentObject extends TimelineObject {}

export interface Mapping {
	[layerName:string]: {
		device: string,
		[key:string]: any
	}
}

export interface Device {}

export interface ConductorOptions {
	devices: {
		[deviceName:string]: {
			type: DeviceTypes.CASPARCG
		}
	},
	initializeAsClear: true // don't do any initial checks with devices to determine state, instead assume that everything is clear, black and quiet
}

export enum DeviceTypes {
	CASPARCG=0
}


export class Conductor {

	private _timeline:Array<TimelineContentObject>;
	private _mapping:Mapping;

	private _options:ConductorOptions

	private devices:{[deviceName:string]: Device} = {};
	

	constructor(options:ConductorOptions) {
		
		//this.setTimeline(options.timeline||[]);
		//this.setMapping(options.mapping||{});

		this._options = options;

	}

	public init():Promise<any> {
		return this._initializeDevices();
	}

	public getCurrentTime() {
		// return a nice, synked time:

		// TODO: Implement time sync, NTP procedure etc...
		return Date.now()/1000;
	}

	
	get mapping():Mapping {
		return this._mapping;
	}
	set mapping(mapping:Mapping) {
		// Set mapping
		// re-resolve timeline
		this._mapping = mapping;
		this._resolveTimeline();
	}

	get timeline():Array<TimelineContentObject> {
		return this._timeline;
	}
	set timeline(timeline:Array<TimelineContentObject>) {
		// Set the updated timeline (will cause the timeline to re-resolve, and send appropriate commands)
		this._timeline = timeline;
		this._resolveTimeline();
	}


	private _initializeDevices():Promise<any> {

		const ps:Array<Promise<any>> = [];

		_.each(this._options.devices, (deviceOptions, deviceId) => {
			if (deviceOptions.type == DeviceTypes.CASPARCG) {
				// Add CasparCG device:

				this.devices[deviceId] = <Device> new CasparCGDevice(deviceId, {
					// TODO: Add options
				});


				ps.push(this.devices[deviceId].init());
				
			}
		});

		return Promise.all(ps);

	}

	private _resolveTimeline() {

		const now = this.getCurrentTime();

		const timelineWindow = Resolver.getTimelineInWindow(this.timeline, now, now + LOOKAHEADTIME);

		// Step 1: Filter out some interesting points in time:
		const nextEvents = Resolver.getNextEvents(timelineWindow, now, 10);
		const timesToEvaluate = [{ time: now }];

		_.each(nextEvents, (evt) => {
			timesToEvaluate.push({ time: evt.time });
		});

		// Step 2: evaluate the points in time (do we have to send any commands?)
		// TODO: use Resolver.getState() and casparcg-state
		const statesToSolve:Array<TimelineState> = [];
		const commands:Array<DeviceCommand> = [];

		_.each(timesToEvaluate, (time) => {
			const tlAroundTime = Resolver.getState(this.timeline, time.time);
			statesToSolve.push(tlAroundTime);
		})

		_.each(statesToSolve, (state:TimelineState) => {
			_.each(state.LLayers, (layerObject, layer) => {
				if (this._mapping[layer]) {
					// request mapping's device to resolve commands?
				}
			})
		})

		// Then we should distribute out the commands to the different devices
		// and let them handle it.


		this.sendCommandsToDevices(commands);
		
	}

	private sendCommandsToDevices(commands:Array<DeviceCommand>) {}
}