import { TimelineState } from 'superfly-timeline';
import { Mapping } from '../conductor';


/*
	This is a base class for all the Device wrappers.
	The Device wrappers will
*/

export interface DeviceCommand {
	time: number,
	deviceId: string,
	command: any
}

export interface DeviceCommandContainer {
	deviceId: string,
	commands: Array<DeviceCommand>
}

export class Device {
	
	private _deviceId:string;
	public state:TimelineState;
	public _mapping:Mapping;

	constructor(deviceId:string, mapping:Mapping) {
		this._deviceId = deviceId;
		this._mapping = mapping;
	}
	init():Promise<boolean> {
		// connect to the device, resolve the promise when ready.
		throw "This class method must be replaced by the Device class!";

		return Promise.resolve(true);
	}

	generateCommandsAgainstState(newState:TimelineState, oldState:TimelineState):Array<DeviceCommand> {
		// Get a
		// The idea here is to do a comparison between the new and the old states, in order to 
		// come up with the commands needed to achieve the state
		// return an array of the commands needed
		throw "This class method must be replaced by the Device class!";
	}

	get deviceId() {
		return this._deviceId;
	}
	set deviceId(deviceId) {
		this._deviceId = deviceId;
	}

}