/// <reference types="node" />
import { TimelineState } from 'superfly-timeline';
import { Mappings, DeviceType } from './mapping';
import { EventEmitter } from 'events';
export interface DeviceCommand {
    time: number;
    deviceId: string;
    command: any;
}
export interface DeviceCommandContainer {
    deviceId: string;
    commands: Array<DeviceCommand>;
}
export interface DeviceOptions {
    type: DeviceType;
    options?: {};
}
export declare class Device extends EventEmitter {
    private _getCurrentTime;
    private _deviceId;
    private _deviceOptions;
    private _states;
    private _mappings;
    constructor(deviceId: string, deviceOptions: DeviceOptions, options: any);
    init(connectionOptions: any): Promise<boolean>;
    terminate(): Promise<boolean>;
    getCurrentTime(): number;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly connected: boolean;
    getStateBefore(time: number): TimelineState | null;
    setState(state: any): void;
    cleanUpStates(removeBeforeTime: any, removeAfterTime: any): void;
    clearStates(): void;
    mapping: Mappings;
    deviceId: string;
    readonly deviceName: string;
    readonly deviceType: DeviceType;
    readonly deviceOptions: DeviceOptions;
}
