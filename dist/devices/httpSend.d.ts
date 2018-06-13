import { Device, DeviceOptions } from './device';
import { DeviceType } from './mapping';
import { TimelineState } from 'superfly-timeline';
export interface HttpSendDeviceOptions extends DeviceOptions {
    options?: {
        commandReceiver?: (time: number, cmd: any) => void;
    };
}
export declare class HttpSendDevice extends Device {
    private _doOnTime;
    private _queue;
    private _commandReceiver;
    constructor(deviceId: string, deviceOptions: HttpSendDeviceOptions, options: any);
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init(): Promise<boolean>;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly connected: boolean;
    convertStateToHttpSend(state: TimelineState): TimelineState;
    readonly deviceType: DeviceType;
    readonly deviceName: string;
    readonly queue: any[];
    private _addToQueue;
    private _diffStates;
    private _defaultCommandReceiver;
}
