export interface Mappings {
    [layerName: string]: Mapping;
}
export interface Mapping {
    device: DeviceType;
    deviceId: string;
    channel?: number;
    layer?: number;
}
export interface MappingCasparCG extends Mapping {
    device: DeviceType.CASPARCG;
    channel: number;
    layer: number;
}
export interface MappingAbstract extends Mapping {
    device: DeviceType.ABSTRACT;
    abstractPipe: number;
}
export interface MappingAtem extends Mapping {
    mappingType: MappingAtemType;
    index?: number;
}
export interface MappingLawo extends Mapping {
    path: Array<number>;
    defaults?: {
        [attrName: string]: boolean | string | number;
    };
}
export declare enum MappingAtemType {
    MixEffect = 0,
    DownStreamKeyer = 1,
    SuperSourceBox = 2,
    Auxilliary = 3,
    MediaPlayer = 4
}
export declare enum DeviceType {
    ABSTRACT = 0,
    CASPARCG = 1,
    ATEM = 2,
    LAWO = 3,
    HTTPSEND = 4
}
