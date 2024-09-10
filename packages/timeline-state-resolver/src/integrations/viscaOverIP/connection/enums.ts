export enum CommandType {
	ViscaCommand = 0x0100,
	ViscaInquiry = 0x0110,
	ViscaReply = 0x0111,
	ControlCommand = 0x0200,
	ControlReply = 0x0201,
}

export enum FocusDirection {
	Stop = 0x00,
	FarStandard = 0x02,
	NearStandard = 0x03,
	FarVariable = 0x20,
	NearVariable = 0x30,
}

export enum FocusMode {
	Auto = 0x02,
	Manual = 0x03,
}

export enum PanTiltDirection {
	Up = 0x0301,
	Down = 0x0302,
	Left = 0x0103,
	Right = 0x0203,
	UpLeft = 0x0101,
	UpRight = 0x0201,
	DownLeft = 0x0102,
	DownRight = 0x0202,
	Stop = 0x0303,
}

export enum ZoomDirection {
	Stop = 0x00,
	TeleStandard = 0x02,
	WideStandard = 0x03,
	TeleVariable = 0x20,
	WideVariable = 0x30,
}

export enum PresetOperation {
	Reset = 0x00,
	Set = 0x01,
	Recall = 0x02,
}

export enum ConnectionState {
	Closed,
	Connecting,
	Connected,
}
