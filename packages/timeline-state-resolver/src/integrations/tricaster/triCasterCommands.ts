import { CommandWithContext } from '../../service/device'

/**
 * Values in this enum correspond to actual shortcut names or their suffixes
 */
export enum CommandName {
	// preview / program or effect layers
	ROW = '_row',
	ROW_NAMED_INPUT = '_row_named_input',
	TOGGLE_MIX_EFFECT_MODE = '_toggle_mix_effect_mode',
	// transitions
	TAKE = '_take',
	AUTO = '_auto',
	SELECT_INDEX = '_select_index',
	SET_MIX_EFFECT_BIN_INDEX = '_set_mix_effect_bin_index',
	SPEED = '_speed',
	DELEGATE = '_delegate',
	// dsk
	VALUE = '_value',
	SELECT_NAMED_INPUT = '_select_named_input',
	// positioning
	POSITION_X = '_position_x',
	POSITION_Y = '_position_y',
	SCALE_X = '_scale_x',
	SCALE_Y = '_scale_y',
	ROTATION_X = '_rotation_x',
	ROTATION_Y = '_rotation_y',
	ROTATION_Z = '_rotation_z',
	CROP_LEFT_VALUE = '_crop_left_value',
	CROP_RIGHT_VALUE = '_crop_right_value',
	CROP_UP_VALUE = '_crop_up_value',
	CROP_DOWN_VALUE = '_crop_down_value',
	FEATHER_VALUE = '_feather_value',
	POSITIONING_AND_CROP_ENABLE = '_positioning_and_crop_enable',
	// input
	VIDEO_SOURCE = '_video_source',
	VIDEO_ACT_AS_ALPHA = '_video_act_as_alpha',
	// audio
	VOLUME = '_volume',
	MUTE = '_mute',
	// recording
	RECORD_TOGGLE = 'record_toggle',
	// streaming
	STREAMING_TOGGLE = 'streaming_toggle',
	// outputs
	OUTPUT_SOURCE = '_output_source',
	CROSSPOINT_SOURCE = '_crosspoint_source',
	SET_OUTPUT_CONFIG_VIDEO_SOURCE = 'set_output_config_video_source',
}

export type ValueTypes = boolean | number | string

interface Command<NameType extends CommandName> {
	name: NameType
}

interface CommandWithValue<NameType extends CommandName, ValueType extends ValueTypes> extends Command<NameType> {
	value: ValueType
}

interface CommandWithTarget<NameType extends CommandName> extends Command<NameType> {
	target: string
}

interface CommandWithValueAndTarget<NameType extends CommandName, ValueType extends ValueTypes>
	extends Command<NameType> {
	value: ValueType
	target: string
}

type RowCommand = CommandWithValueAndTarget<CommandName.ROW, number>
type RowNamedInputCommand = CommandWithValueAndTarget<CommandName.ROW_NAMED_INPUT, string>

type TakeCommand = CommandWithTarget<CommandName.TAKE>
type AutoCommand = CommandWithTarget<CommandName.AUTO>
type SelectIndexCommand = CommandWithValueAndTarget<CommandName.SELECT_INDEX, number>
type SetMixEffectBinIndexCommand = CommandWithValueAndTarget<CommandName.SET_MIX_EFFECT_BIN_INDEX, number>
type SpeedCommand = CommandWithValueAndTarget<CommandName.SPEED, number>
type DelegateCommand = CommandWithValueAndTarget<CommandName.DELEGATE, string>

type ValueCommand = CommandWithValueAndTarget<CommandName.VALUE, number>
type SelectNamedInputCommand = CommandWithValueAndTarget<CommandName.SELECT_NAMED_INPUT, string>

type PositionXCommand = CommandWithValueAndTarget<CommandName.POSITION_X, number>
type PositionYCommand = CommandWithValueAndTarget<CommandName.POSITION_Y, number>
type ScaleXCommand = CommandWithValueAndTarget<CommandName.SCALE_X, number>
type ScaleYCommand = CommandWithValueAndTarget<CommandName.SCALE_Y, number>
type RotationXCommand = CommandWithValueAndTarget<CommandName.ROTATION_X, number>
type RotationYCommand = CommandWithValueAndTarget<CommandName.ROTATION_Y, number>
type RotationZCommand = CommandWithValueAndTarget<CommandName.ROTATION_Z, number>
type CropLeftCommand = CommandWithValueAndTarget<CommandName.CROP_LEFT_VALUE, number>
type CropRightCommand = CommandWithValueAndTarget<CommandName.CROP_RIGHT_VALUE, number>
type CropUpCommand = CommandWithValueAndTarget<CommandName.CROP_UP_VALUE, number>
type CropDownCommand = CommandWithValueAndTarget<CommandName.CROP_DOWN_VALUE, number>
type FeatherCommand = CommandWithValueAndTarget<CommandName.FEATHER_VALUE, number>
type PositioningAndCropEnableCommand = CommandWithValueAndTarget<CommandName.POSITIONING_AND_CROP_ENABLE, boolean>

type VideoSource = CommandWithValueAndTarget<CommandName.VIDEO_SOURCE, string>
type VideoActAsAlpha = CommandWithValueAndTarget<CommandName.VIDEO_ACT_AS_ALPHA, boolean>

type VolumeCommand = CommandWithValueAndTarget<CommandName.VOLUME, number>
type MuteCommand = CommandWithValueAndTarget<CommandName.MUTE, boolean>

type RecordToggle = CommandWithValue<CommandName.RECORD_TOGGLE, number>
type StreamingToggle = CommandWithValue<CommandName.STREAMING_TOGGLE, number>

type OutputSource = CommandWithValueAndTarget<CommandName.OUTPUT_SOURCE, string>
type CrosspointSource = CommandWithValueAndTarget<CommandName.CROSSPOINT_SOURCE, string>
interface OutputMeClean extends Command<CommandName.SET_OUTPUT_CONFIG_VIDEO_SOURCE> {
	output_index: number
	me_clean: boolean
}

export type TriCasterCommand =
	| RowCommand
	| RowNamedInputCommand
	| TakeCommand
	| AutoCommand
	| SelectIndexCommand
	| SetMixEffectBinIndexCommand
	| SpeedCommand
	| DelegateCommand
	| ValueCommand
	| SelectNamedInputCommand
	| PositionXCommand
	| PositionYCommand
	| ScaleXCommand
	| ScaleYCommand
	| RotationXCommand
	| RotationYCommand
	| RotationZCommand
	| CropLeftCommand
	| CropRightCommand
	| CropUpCommand
	| CropDownCommand
	| FeatherCommand
	| PositioningAndCropEnableCommand
	| VideoSource
	| VideoActAsAlpha
	| VolumeCommand
	| MuteCommand
	| RecordToggle
	| StreamingToggle
	| OutputSource
	| CrosspointSource
	| OutputMeClean

type TriCasterGenericNumberCommand = Extract<
	TriCasterCommand,
	CommandWithValueAndTarget<CommandName, number> | CommandWithValue<CommandName, number>
>
type TriCasterGenericStringCommand = Extract<
	TriCasterCommand,
	CommandWithValueAndTarget<CommandName, string> | CommandWithValue<CommandName, string>
>
type TriCasterGenericBooleanCommand = Extract<
	TriCasterCommand,
	CommandWithValueAndTarget<CommandName, boolean> | CommandWithValue<CommandName, boolean>
>

export type TriCasterGenericCommand =
	| TriCasterGenericNumberCommand
	| TriCasterGenericStringCommand
	| TriCasterGenericBooleanCommand

export type TriCasterGenericCommandName<T> = T extends boolean
	? TriCasterGenericBooleanCommand['name']
	: T extends string
	? TriCasterGenericStringCommand['name']
	: T extends number
	? TriCasterGenericNumberCommand['name']
	: never

export interface TriCasterCommandWithContext extends CommandWithContext<TriCasterCommand, string> {
	temporalPriority: number
}

export function serializeToWebSocketMessage(command: TriCasterCommand): string {
	const name = `name=${'target' in command ? command.target : ''}${command.name}`
	const values = Object.keys(command)
		.filter((key) => key !== 'target' && key !== 'name')
		.map((key) => `&${key}=${command[key]}`)
		.join('')
	return name + values
}
