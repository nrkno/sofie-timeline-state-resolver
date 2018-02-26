

/*
	This is a base class for all the Device wrappers.
	The Device wrappers will
*/

export interface DeviceCommand {
	time: number,
	deviceId: string,
	command: any
}

export class Device {
	
	private _deviceId:string;

	constructor(deviceId:string) {
		this._deviceId = deviceId;
	}
	init():Promise<boolean> {
		// connect to the device, resolve the promise when ready.
		throw "This class method must be replaced by the Device class!";

		return Promise.resolve(true);
	}

	getCommands(newState, oldState):Array<DeviceCommand> {
		// Get a
		// The idea here is to do a comparison between the new and the old states, in order to 
		// come up with the commands needed to achieve the state
		// return an array of the commands needed
		throw "This class method must be replaced by the Device class!";
  }

}