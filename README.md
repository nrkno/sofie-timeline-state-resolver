# Sofie Timeline State Resolver (TSR)

[![Node CI](https://github.com/nrkno/sofie-timeline-state-resolver/actions/workflows/node.yaml/badge.svg)](https://github.com/nrkno/sofie-timeline-state-resolver/actions/workflows/node.yaml)
[![codecov](https://codecov.io/gh/nrkno/sofie-timeline-state-resolver/branch/master/graph/badge.svg)](https://codecov.io/gh/nrkno/sofie-timeline-state-resolver)

This is the _Timeline State Resolver (TSR)_ library, part of the [**Sofie** TV Automation System](https://github.com/nrkno/Sofie-TV-automation/). This library orchestrates and controls different devices. Its input is a [timeline](https://github.com/SuperFlyTV/supertimeline) data structure and a layer-to-device-map.
Using this input, it resolves the expected state, diffs the state against current state, and sends commands to devices where necessary.

## General Sofie System Information

- [_Sofie_ Documentation](https://nrkno.github.io/sofie-core/)
- [_Sofie_ Releases](https://nrkno.github.io/sofie-core/releases)
- [Contribution Guidelines](CONTRIBUTING.md)
- [License](LICENSE)

---

## Supported Devices

- **[CasparCG](http://casparcg.com/)** - using the [casparcg-connection](https://github.com/SuperFlyTV/casparcg-connection) library
- **Blackmagic Design ATEM** vision mixers - using the [atem-connection](https://github.com/nrkno/tv-automation-atem-connection) library
- **Blackmagic Design Hyperdeck** record/playback devices - using the [hyperdeck-connection](https://github.com/nrkno/tv-automation-hyperdeck-connection) library
- **Lawo** audio mixers - using the [emberplus](https://github.com/nrkno/tv-automation-emberplus-connection) library
- **[OBS Studio](https://obsproject.com/)** live video production software (currently not supporting v29)
- **Panasoniz PTZ** cameras
- **Pharos** light control devices
- **[Sisyfos](https://github.com/olzzon/sisyfos-audio-controller)** audio controller
- **Quantel** video server
- **[vMix](https://www.vmix.com/)** software vision mixer
- **VizRT MediaSequencer** graphics system - using the [v-connection](https://github.com/tv2/v-connection) library
- **Shotoku TR-XT** camera robotics
- **Singular Live Graphics**
- **[Sofie Chef](https://github.com/nrkno/sofie-chef)**
- **Telemetrics** camera robotics
- **Newtek Tricaster** video mixers
- **[VISCA over IP](https://en.wikipedia.org/wiki/VISCA_Protocol)** camera control
- Arbitrary [OSC](https://en.wikipedia.org/wiki/Open_Sound_Control) compatible devices
- Arbitrary HTTP (REST) compatible devices
- Arbitrary TCP-socket compatible devices

## Installation and Usage

This is a mono-repo containing the TSR library, and a separate typings-only library ([timeline-state-resolver-types](/packages/timeline-state-resolver-types)).
Contrary to what your editor might say, the typings-only library cannot use dependencies from the main library.

Check the main [timeline-state-resolver](/packages/timeline-state-resolver) package for instructions on using the library and more information

## Development

When creating features that span the timeline-state-resolver and timeline-state-resolver-types packages - such as when creating a PR for supporting a new device - you will need to link the two packages together. To do that, after checking out a branch run:

```
yarn
yarn lerna link
```

This will link the types package to the main library so that you can use your new type definitions during development.

Note, that your IDE may not pick up your new type definitions until you build the types package.

There is a test application [quick-tsr](/packages/quick-tsr) inside this repository which can be used to easily test changes made to this library.

### Working with Types

Types that need to be consumed by external systems that have no need to interact with the TSR library itself should be written in the timeline-state-resolver-types package. Some types will be generated from JSON schemas, the schemas are composed under the $schemas subfolder in the specific integration's subfolder. (See the abstract integration for an example). The types can be generated with the `yarn generate-schema-types` command. The schemas themselves must be exported from the `src/manifests.ts` file, so they can be used by external systems to validate payloads and generate UI's.

---

_The NRK logo is a registered trademark of Norsk rikskringkasting AS. The license does not grant any right to use, in any way, any trademarks, service marks or logos of Norsk rikskringkasting AS._
