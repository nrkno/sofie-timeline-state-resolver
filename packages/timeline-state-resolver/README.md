
# Timeline State Resolver

## Abstract
This library orchestrates and controls different devices.
Its input is a [timeline](https://github.com/SuperFlyTV/supertimeline) data structure and a layer-to-device-map.
Using the input, it resolves the expected state, diffs the state against current state and sends commands to devices where necessary.

## Supported devices
* **[CasparCG](http://casparcg.com/)** - using the [casparcg-connection](https://github.com/SuperFlyTV/casparcg-connection) library
* **Blackmagic Design ATEM** vision mixers - using the [atem-connection](https://github.com/nrkno/tv-automation-atem-connection) library
* **Blackmagic Design Hyperdeck** record/playback devices - using the [hyperdeck-connection](https://github.com/nrkno/tv-automation-hyperdeck-connection) library
* **Lawo** audio mixers - using the [emberplus](https://github.com/nrkno/tv-automation-emberplus-connection) library
* **Panasoniz PTZ** cameras
* **Pharos** light control devices
* **[Sisyfos](https://github.com/olzzon/sisyfos-audio-controller)** audio controller
* **Quantel** video server
* **[vMix](https://www.vmix.com/)** software vision mixer
* **VizRT MediaSequencer** graphics system - using the [v-connection](https://github.com/olzzon/v-connection) library
* Arbitrary [OSC](https://en.wikipedia.org/wiki/Open_Sound_Control) compatible devices
* Arbitrary HTTP (REST) compatible devices
* Arbitrary TCP-socket compatible devices


## Development

TSR is primarily developed to be used in the [Playout Gateway](https://github.com/nrkno/tv-automation-playout-gateway) of the [Sofie project](https://github.com/nrkno/Sofie-TV-automation).

When developing support for new devices, a helpful tool for quickly trying out new functionality is the [Quick-TSR repo](https://github.com/nytamin/quickTSR).

## Installation instructions (for developers)

### Prerequisites

* Install yarn
	https://yarnpkg.com

* Install dependencies
	`yarn`

### Build and test

* Build:
	`yarn build`

* Run test & view coverage
	`yarn cov`

# Examples of timeline objects

Here follows some examples of valid mappings and timeline-objects to control devices with TSR.

## CasparCG

### Playing a video
Play the video clip "AMB" for 5 seconds

```typescript
// Mapping:
{
	myLayerCaspar: {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 1,
		layer: 10
	}
}
// Timeline:
{
	id: 'video0',
	enable: {
		start: 'now',
		duration: 5000
	},
	layer: 'myLayerCaspar',
	content: {
		deviceType: DeviceType.CASPARCG,
		type: TimelineContentTypeCasparCg.MEDIA,

		file: 'AMB'
	}
}
```
## Blackmagic Design ATEM

### Cut to source
Cut to source 2 on ME1
```typescript
// Mapping:
{
	myLayerME1: {
		device: DeviceType.ATEM,
		deviceId: 'myAtem',
		mappingType: MappingAtemType.MixEffect,
		index: 0
	}
}
// Timeline:
{
	id: 'source2',
	enable: {
		start: 'now'
	},
	layer: 'myLayerME1',
	content: {
		deviceType: DeviceType.ATEM,
		type: TimelineContentTypeAtem.ME,
		me: {
			input: 2,
			transition: AtemTransitionStyle.CUT
		}
	}
}

```

## Blackmagic Design Hyperdeck

### Record a clip
Start recording of a clip, and record it for 10 secods
```typescript
// Mapping:
{
	myLayerRecord: {
		device: DeviceType.ATEM,
		deviceId: 'myHyperdeck',
		mappingType: MappingAtemType.MixEffect,
		index: 0
	}
}
// Timeline:
{
	id: 'record0',
	enable: {
		start: 'now',
		duration: 10000
	},
	layer: 'myLayerRecord',
	content: {
		deviceType: DeviceType.HYPERDECK,
		type: TimelineContentTypeHyperdeck.TRANSPORT,

		status: TransportStatus.RECORD,
		recordFilename: 'sofie_recording1'
	}
}
```
## Lawo audio mixer

### Pull up a fader
Pull up a fader, and leave it there
```typescript
// Mapping:
{
	myLayerFader0: {
		device: DeviceType.LAWO,
		deviceId: 'myLawo',
		mappingType: MappingLawoType.SOURCE,
		identifier: 'BASE'
	}
}
// Timeline:
{
	id: 'lawofader0',
	enable: {
		start: 'now'
	},
	layer: 'myLayerFader0',
	content: {
		deviceType: DeviceType.LAWO,
		type: TimelineContentTypeLawo.SOURCE,

		faderValue: 0
	}
}

```

## Panasoniz PTZ

### Recall a preset
```typescript
// Mapping:
{
	myLayerCamera1: {
		device: DeviceType.PANASONIC_PTZ,
		deviceId: 'myPtz',
		mappingType: MappingPanasonicPtzType.PRESET
	}
}
// Timeline:
{
	id: 'ptzPreset1',
	enable: {
		start: 'now'
	},
	layer: 'myLayerCamera1',
	content: {
		deviceType: DeviceType.PANASONIC_PTZ,
		type: TimelineContentTypePanasonicPtz.PRESET,
		preset: 1
	}
}
```

## Pharos Light control

### Recall a scene

```typescript
// Mapping:
{
	myLayerLights: {
		device: DeviceType.PANASONIC_PTZ,
		deviceId: 'myPtz',
		mappingType: MappingPanasonicPtzType.PRESET
	}
}
// Timeline:
{
	id: 'scene1',
	enable: {
		start: 'now'
	},
	layer: 'myLayerLights',
	content: {
		deviceType: DeviceType.PHAROS,
		type: TimelineContentTypePharos.SCENE,

		scene: 1
	}
}
```

## Sisyfos audio controller

### Activate channel 3
Activate channel 3 on sisyfos pgm output
```typescript
// Mapping:
{
	myLayerSisyfosScene1: {
		device: DeviceType.SISYFOS,
		deviceId: 'mySisyfos',
		channel: 3
	}
}
// Timeline:
//ON:
{
	id: 'channel3',
	enable: {
		start: 'now'
	},
	layer: 'myLayerSisyfosScene1',
	content: {
		deviceType: DeviceType.SISYFOS,
		type: TimelineContentTypeSisyfos.SISYFOS,

		isPgm: 1 // 0 = OFF, 1 = Pgm level, 2 = VoiceOver level
	}
}
//FADERLEVEL:
{
	id: 'channel3',
	enable: {
		start: 'now'
	},
	layer: 'myLayerSisyfosScene1',
	content: {
		deviceType: DeviceType.SISYFOS,
		type: TimelineContentTypeSisyfos.SISYFOS,

		faderLevel: 0.75
	}
}
//LABEL:
{
	id: 'channel3',
	enable: {
		start: 'now'
	},
	layer: 'myLayerSisyfosScene1',
	content: {
		deviceType: DeviceType.SISYFOS,
		type: TimelineContentTypeSisyfos.SISYFOS,
		label: 'SERVER B'
	}
}
//VISIBLE: (shows or hide a fader)
{
	id: 'channel3',
	enable: {
		start: 'now'
	},
	layer: 'myLayerSisyfosScene1',
	content: {
		deviceType: DeviceType.SISYFOS,
		type: TimelineContentTypeSisyfos.SISYFOS,
		visible: false // false: hide - true: show
	}
}
```

## Quantel video server

### Play a video
Play a video for 10 seconds

```typescript
// Mapping:
{
	myLayerVideoA: {
		device: DeviceType.QUANTEL,
		deviceId: 'myQuantel',

		portId: 'sofie1',
		channelId: 2
	}
}
// Timeline:
{
	id: 'video0',
	enable: {
		start: 'now',
		duration: 10000
	},
	layer: 'myLayerVideoA',
	content: {
		deviceType: DeviceType.QUANTEL,

		title: 'myClipInQuantel'
		// guid: 'abcdef872832832a2b932c97d9b2eb9' // GUID works as well
	}
}
```

## Arbitrary HTTP-interface

### Send a POST request
Send a POST Request to a URL

```typescript
// Mapping:
{
	myLayerHTTP: {
		device: DeviceType.HTTPSEND,
		deviceId: 'myHTTP'
	}
}
// Timeline:
{
	id: 'video0',
	enable: {
		start: 'now'
	},
	layer: 'myLayerHTTP',
	content: {
		deviceType: DeviceType.HTTPSEND,
		type: TimelineContentTypeHttp.POST,

		url: 'http://superfly.tv/api/report',
		params: {
			someRandomParameter: 42,
			anotherFineParameter: 43
		}
	}
}
```

