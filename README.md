
# Timeline State Resolver

[![Node CI](https://github.com/nrkno/tv-automation-state-timeline-resolver/actions/workflows/node.yaml/badge.svg)](https://github.com/nrkno/tv-automation-state-timeline-resolver/actions/workflows/node.yaml)
[![codecov](https://codecov.io/gh/nrkno/tv-automation-state-timeline-resolver/branch/master/graph/badge.svg)](https://codecov.io/gh/nrkno/tv-automation-state-timeline-resolver)

This is a part of the [**Sofie** TV News Studio Automation System](https://github.com/nrkno/Sofie-TV-automation/).

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

## Installation and Usage

This is a mono-repo containing the TSR library, and a separate typings-only library ([timeline-state-resolver-types](/packages/timeline-state-resolver-types)).
Contrary to what your editor might say, the typings-only library cannot use dependencies from the main library.

Check the main [timeline-state-resolver](/packages/timeline-state-resolver) package for instructions on using the library and more information

## Development

When creating features that span the timeline-state-resolver and timeline-state-resolver-types packages - such as when creating a PR for supporting a new device - you will need to link the two packages together. To do that, after checking out a branch run:

```
yarn
yarn learna link
```

This will link the types package to the main library so that you can use your new type definitions during development.