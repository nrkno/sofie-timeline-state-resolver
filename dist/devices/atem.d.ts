import { Device, DeviceOptions } from './device';
import { DeviceType } from './mapping';
import { TimelineState } from 'superfly-timeline';
import { State as DeviceState } from 'atem-state';
export interface AtemDeviceOptions extends DeviceOptions {
    options?: {
        commandReceiver?: (time: number, cmd: any) => void;
    };
}
export interface AtemOptions {
    host: string;
    port?: number;
}
export declare enum TimelineContentTypeAtem {
    ME = "me",
    DSK = "dsk",
    AUX = "aux",
    SSRC = "ssrc",
    MEDIAPLAYER = "mp"
}
export declare class AtemDevice extends Device {
    private _queue;
    private _device;
    private _state;
    private _initialized;
    private _connected;
    private _commandReceiver;
    constructor(deviceId: string, deviceOptions: AtemDeviceOptions, options: any);
    /**
     * Initiates the connection with the ATEM through the atem-connection lib.
     */
    init(options: AtemOptions): Promise<boolean>;
    terminate(): Promise<boolean>;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly connected: boolean;
    convertStateToAtem(state: TimelineState): DeviceState;
    readonly deviceType: DeviceType;
    readonly deviceName: string;
    readonly queue: any[];
    private _diffStates;
    private _getDefaultState;
    private _defaultCommandReceiver;
}
