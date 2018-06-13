import { Device, DeviceOptions } from './device';
import { DeviceType, Mappings } from './mapping';
import { TimelineState } from 'superfly-timeline';
export interface LawoOptions extends DeviceOptions {
    options?: {
        commandReceiver?: (time: number, cmd: any) => void;
        host?: string;
        port?: number;
    };
}
export declare class LawoDevice extends Device {
    private _queue;
    private _device;
    private _resolveMappingsOnConnect;
    private _mappingToAttributes;
    private _savedNodes;
    private _sourceNames;
    private _commandReceiver;
    constructor(deviceId: string, deviceOptions: LawoOptions, options: any);
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init(): Promise<boolean>;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly connected: boolean;
    convertStateToLawo(state: TimelineState): {
        [path: string]: {
            [attrName: string]: string | number | boolean | object;
        };
    };
    readonly deviceType: DeviceType;
    readonly deviceName: string;
    readonly queue: any[];
    mapping: Mappings;
    private _diffStates;
    private _defaultCommandReceiver;
    private _getNodeByPath;
    private _resolveMappings;
    private _enforceDeviceState;
}
