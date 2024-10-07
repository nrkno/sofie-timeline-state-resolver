# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [9.2.0-release52](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.1.0...9.2.0-release52) (2024-08-19)

## [9.2.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.2.0-alpha.0...9.2.0) (2024-10-07)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.2.0-alpha.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.1.0...9.2.0-alpha.0) (2024-09-09)

### Features

- allow sequential executionMode to paralelize multiple queues of Commands ([84a53cd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/84a53cd5f1ee0978767d46ad766c01841559983d))

## [9.1.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.2...9.1.0) (2024-08-19)

### Features

- add "returnData" to action schema ([529bcb3](https://github.com/nrkno/sofie-timeline-state-resolver/commit/529bcb3157f2e583c077dd54787d0c3ea4a25905))
- atem color generator support SOFIE-2968 ([#322](https://github.com/nrkno/sofie-timeline-state-resolver/issues/322)) ([b7ceb69](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b7ceb6950c875ff123dcc9bdd58a45c7922045d2))
- **EAV-243:** add OAuth (Client Credentials grant) and Bearer Token to HTTPSend ([8fef807](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8fef807e31c7b65d1017d772ba2e0a441f899226))
- **EAV-243:** add oauth token path option for a broader support ([76592f2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/76592f29d53b1ce5b64ddd1c283f7f045c155da3))
- **EAV-269:** add vMix input layers props and commands ([1bcf056](https://github.com/nrkno/sofie-timeline-state-resolver/commit/1bcf056a70ed7932c1c5588fdad17f1c25d32832))
- **httpSend:** Proxy support ([6dc4c59](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6dc4c59424242b1ea6681c27c0647a9afaae7c17))
- **HTTPSend:** return response data from HTTP SendCommand action ([#334](https://github.com/nrkno/sofie-timeline-state-resolver/issues/334)) ([d220c78](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d220c786ea3ae139a690d741dcfdf9d8f0c8511f))
- refactor pharos device SOFIE-2488 ([#333](https://github.com/nrkno/sofie-timeline-state-resolver/issues/333)) ([d57812c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d57812c2b2519635cadb7279803601f06918f91c))
- support timeline v9 ([3ccc759](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3ccc759f6d2d64cc2f3ca861634d96b427076490))

### Bug Fixes

- add missing typings for atem dve ([#305](https://github.com/nrkno/sofie-timeline-state-resolver/issues/305)) ([1758ffc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/1758ffc229e8162efad5261dad8a83d69cf61747))
- CasparCG: add listMedia action (wip) ([f4277ad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f4277ad5515d13803f9850b61b5110f7b8573706))
- **EAV-269:** default to vMix layers instead of deprecated overlays ([dc719c8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dc719c8b105d88faf085daf059faef5b17dd03d0))
- missing httpsend enums ([920da05](https://github.com/nrkno/sofie-timeline-state-resolver/commit/920da0506cd9f2142d0edabfd9894ccd88d288cf))
- suppress quantel disconnect shortly ([9b6621d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9b6621dff7d358e8d7870af304678beb3c197987))
- update casparcg-connection dependency ([e209ba8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e209ba822f9f026018a51d70498e0feb3a94473e))

## [9.0.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.1...9.0.2) (2024-08-15)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0...9.0.1) (2024-04-02)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.8...9.0.0) (2024-02-23)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0-release50.8](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.4...9.0.0-release50.8) (2024-02-02)

## [9.0.0-release50.7](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.0...9.0.0-release50.7) (2023-11-17)

### Features

- changes the logic for setting a pollInterval ([a482e57](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a482e57e2a647de9421898df3fb061cf28c74408)), closes [#277](https://github.com/nrkno/sofie-timeline-state-resolver/issues/277)

### Bug Fixes

- remove unused casparcg useScheduling option ([#294](https://github.com/nrkno/sofie-timeline-state-resolver/issues/294)) ([06d3c96](https://github.com/nrkno/sofie-timeline-state-resolver/commit/06d3c967d2da012aa2f6655c34d382201a45cab8))

## [9.0.0-release50.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.5...9.0.0-release50.6) (2023-08-25)

### Bug Fixes

- **httpSend:** Use the same types for the sendCommand action as a timeline object ([#269](https://github.com/nrkno/sofie-timeline-state-resolver/issues/269)) ([3385217](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3385217afcb6e45aa37123f5400d1dea4a0c8972))
- **vmix:** fix scenario where the media load retry system would load clips into playlists twice ([8ceddb2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8ceddb291ac3e25cc77f8cb77fa58f67d9167f4c))

## [9.0.0-release50.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.4...9.0.0-release50.5) (2023-07-03)

## [9.0.0-release50.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.3...9.0.0-release50.4) (2023-07-03)

## [9.0.0-release50.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.2...9.0.0-release50.3) (2023-07-03)

## [9.0.0-release50.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.1...9.0.0-release50.2) (2023-07-03)

## [9.0.0-release50.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.0...9.0.0-release50.1) (2023-07-03)

## [9.0.0-release50.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/3.5.1...9.0.0-release50.0) (2023-07-03)

### ⚠ BREAKING CHANGES

- DeviceType enum has been changed from a number-based to a string-based one

### Features

- add restart command to vMix inputs ([e16e8c1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e16e8c14d263fffc8e004bf9f06cdde6073e16b2))
- DeviceType enum has been changed from a number-based to a string-based one ([dd03bcc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dd03bcc7a0f246ff62ccd09091003195c97e4dc1))
- upgrade singular.live to API v2 ([2bb5c4d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2bb5c4d2557710d55b27556cef919dc8419fa1e9))
- Use strings for DeviceType enum ([f1b95bc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f1b95bcb972aff329bce9c67b15f58a98bbf48cf))
- **vMix:** retry sending media load commands if the file wasn't found ([4321aae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4321aae2684ba4c7f55e3cf810dacae187fe282b))

### Bug Fixes

- add types support for vMix stingers 3 and 4 ([44fa27d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44fa27d164bd717b58d7f1d1255d56d132007865))

## [3.5.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release49.0...3.5.1) (2023-03-31)

### ⚠ BREAKING CHANGES

- json schemas for device config and mappings (#237)

### Features

- json schemas for device config and mappings ([#237](https://github.com/nrkno/sofie-timeline-state-resolver/issues/237)) ([d43f3dc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d43f3dc70f5c8843081760846e9aa38fa4c71396))
- replace makeready ([5abe41e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5abe41eaa421db4845a54837b2e3b41f2b33d062))
- SOF-1254 add me_clean support for mix ouputs ([7f3fb9c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7f3fb9c7d9edb03022db69c6e206302c5c69a815))
- SOF-1254 add temporal priority to TriCaster ([7133774](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7133774a49e03a038d91a9ec8fd8d0f13cbd962c))

## [9.0.0-release50.7](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.0...9.0.0-release50.7) (2023-11-17)

### Features

- changes the logic for setting a pollInterval ([a482e57](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a482e57e2a647de9421898df3fb061cf28c74408)), closes [#277](https://github.com/nrkno/sofie-timeline-state-resolver/issues/277)

### Bug Fixes

- remove unused casparcg useScheduling option ([#294](https://github.com/nrkno/sofie-timeline-state-resolver/issues/294)) ([06d3c96](https://github.com/nrkno/sofie-timeline-state-resolver/commit/06d3c967d2da012aa2f6655c34d382201a45cab8))

## [9.0.0-release50.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.5...9.0.0-release50.6) (2023-08-25)

### Bug Fixes

- **httpSend:** Use the same types for the sendCommand action as a timeline object ([#269](https://github.com/nrkno/sofie-timeline-state-resolver/issues/269)) ([3385217](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3385217afcb6e45aa37123f5400d1dea4a0c8972))
- **vmix:** fix scenario where the media load retry system would load clips into playlists twice ([8ceddb2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8ceddb291ac3e25cc77f8cb77fa58f67d9167f4c))

## [9.0.0-release50.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.4...9.0.0-release50.5) (2023-07-03)

## [9.0.0-release50.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.3...9.0.0-release50.4) (2023-07-03)

## [9.0.0-release50.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.2...9.0.0-release50.3) (2023-07-03)

## [9.0.0-release50.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.1...9.0.0-release50.2) (2023-07-03)

## [9.0.0-release50.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.0...9.0.0-release50.1) (2023-07-03)

## [9.0.0-release50.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release49.0...9.0.0-release50.0) (2023-07-03)

### ⚠ BREAKING CHANGES

- DeviceType enum has been changed from a number-based to a string-based one
- json schemas for device config and mappings (#237)

### Features

- add restart command to vMix inputs ([e16e8c1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e16e8c14d263fffc8e004bf9f06cdde6073e16b2))
- DeviceType enum has been changed from a number-based to a string-based one ([dd03bcc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dd03bcc7a0f246ff62ccd09091003195c97e4dc1))
- json schemas for device config and mappings ([#237](https://github.com/nrkno/sofie-timeline-state-resolver/issues/237)) ([d43f3dc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d43f3dc70f5c8843081760846e9aa38fa4c71396))
- replace makeready ([5abe41e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5abe41eaa421db4845a54837b2e3b41f2b33d062))
- SOF-1254 add me_clean support for mix ouputs ([7f3fb9c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7f3fb9c7d9edb03022db69c6e206302c5c69a815))
- SOF-1254 add temporal priority to TriCaster ([7133774](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7133774a49e03a038d91a9ec8fd8d0f13cbd962c))
- upgrade singular.live to API v2 ([2bb5c4d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2bb5c4d2557710d55b27556cef919dc8419fa1e9))
- Use strings for DeviceType enum ([f1b95bc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f1b95bcb972aff329bce9c67b15f58a98bbf48cf))
- **vMix:** retry sending media load commands if the file wasn't found ([4321aae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4321aae2684ba4c7f55e3cf810dacae187fe282b))

### Bug Fixes

- add types support for vMix stingers 3 and 4 ([44fa27d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44fa27d164bd717b58d7f1d1255d56d132007865))

## [9.0.0-release50.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.5...9.0.0-release50.6) (2023-08-25)

### Bug Fixes

- **httpSend:** Use the same types for the sendCommand action as a timeline object ([#269](https://github.com/nrkno/sofie-timeline-state-resolver/issues/269)) ([3385217](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3385217afcb6e45aa37123f5400d1dea4a0c8972))

## [9.0.0-release50.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.4...9.0.0-release50.5) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0-release50.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.3...9.0.0-release50.4) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0-release50.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.2...9.0.0-release50.3) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0-release50.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.1...9.0.0-release50.2) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0-release50.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.0...9.0.0-release50.1) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-types

## [9.0.0-release50.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/3.5.1...9.0.0-release50.0) (2023-07-03)

### ⚠ BREAKING CHANGES

- DeviceType enum has been changed from a number-based to a string-based one
- json schemas for device config and mappings (#237)

### Features

- add restart command to vMix inputs ([e16e8c1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e16e8c14d263fffc8e004bf9f06cdde6073e16b2))
- DeviceType enum has been changed from a number-based to a string-based one ([dd03bcc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dd03bcc7a0f246ff62ccd09091003195c97e4dc1))
- json schemas for device config and mappings ([#237](https://github.com/nrkno/sofie-timeline-state-resolver/issues/237)) ([d43f3dc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d43f3dc70f5c8843081760846e9aa38fa4c71396))
- replace makeready ([5abe41e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5abe41eaa421db4845a54837b2e3b41f2b33d062))
- upgrade singular.live to API v2 ([2bb5c4d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2bb5c4d2557710d55b27556cef919dc8419fa1e9))
- Use strings for DeviceType enum ([f1b95bc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f1b95bcb972aff329bce9c67b15f58a98bbf48cf))
- **vMix:** retry sending media load commands if the file wasn't found ([4321aae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4321aae2684ba4c7f55e3cf810dacae187fe282b))

### Bug Fixes

- add types support for vMix stingers 3 and 4 ([44fa27d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44fa27d164bd717b58d7f1d1255d56d132007865))

## [8.1.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.1...8.1.2) (2023-12-21)

### Bug Fixes

- suppress quantel disconnect shortly ([f04befb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f04befb6464669cf8acd058cbeb541824a0bba1e))

## [8.1.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0...8.1.0) (2023-10-19)

### Features

- VizMSE action to send clear-commands (configured on the device settings) to all Engines in the Profile ([38e313f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/38e313f77dfa7e61f495acf274b872768a1dbaa5))

## [8.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.1...8.0.0) (2023-10-05)

### Features

- atem audio routing control SOFIE-2512 ([#274](https://github.com/nrkno/sofie-timeline-state-resolver/issues/274)) ([de9dfd1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/de9dfd138452794bd7ad83a2fd1e82d2849abdcd))

### Bug Fixes

- export lawo parametertype ([65a73c4](https://github.com/nrkno/sofie-timeline-state-resolver/commit/65a73c41eb31cc2a18df9f0d282255c6cf6a171b))

## [8.0.0-release49.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.2...8.0.0-release49.0) (2023-03-21)

## [8.0.0-release48.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0...8.0.0-release48.2) (2023-03-21)

### Features

- Vmix preset actions ([8b31294](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8b3129412f3881ff9db2cd059927e5b5f3ae6caf))

### Bug Fixes

- change `DeviceType.MULTI_OSC` value ([386ba6c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/386ba6c791a090553cf1d66c73ae82cb25edd03f))

## [7.5.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.7...7.5.0) (2023-02-28)

## [7.5.0-release47.7](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.1...7.5.0-release47.7) (2023-02-24)

### Features

- **vmix:** add support for ListRemoveAll and ListAdd commands ([4a7240f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4a7240f7b2819bb16f263b72d1b06b98e3c40353))
- **vmix:** add support for starting and stopping VB.NET scripts ([9f2d4ee](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2d4eeeccd9ba0017fc00cfe5df18e3717ea660))

## [8.0.0-release48.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...8.0.0-release48.1) (2023-02-14)

## [7.5.0-release47.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.5...7.5.0-release47.6) (2023-02-07)

## [7.5.0-release47.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.4...7.5.0-release47.5) (2023-01-16)

## [7.5.0-release47.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.0...7.5.0-release47.4) (2023-01-13)

### Features

- Emit debug state ([516a512](https://github.com/nrkno/sofie-timeline-state-resolver/commit/516a51203aa0af8c0a47552ecf9c0c99cd01d0be))
- multi osc device ([b987680](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b9876808d44543903e45ab5a1a1a2b85beed4aac))

## [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/3.0.3...8.0.0-release48.0) (2022-12-12)

### ⚠ BREAKING CHANGES

- refactor types to work better with typescript 4.7 (#227)

### Features

- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- refactor types to work better with typescript 4.7 ([#227](https://github.com/nrkno/sofie-timeline-state-resolver/issues/227)) ([abe499c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/abe499ce1da13c2d7a68333f6b1dcc8c7ea71e97))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))

### Bug Fixes

- add optional parameter to HTTPSend timelineObj: paramsType ([979dc61](https://github.com/nrkno/sofie-timeline-state-resolver/commit/979dc61748c4c371a8b17c7fd8c5929c69f747d9))
- add support for Node 18 ([6242dd6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6242dd68f54a491aa71bdfd30b066550d6f7e90e))

## [7.5.0-release47.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.2...7.5.0-release47.3) (2022-11-07)

## [7.5.0-release47.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.1...7.5.0-release47.2) (2022-11-02)

## [7.5.0-release47.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/2.3.0...7.5.0-release47.1) (2022-11-02)

### Features

- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

## [7.5.0-release47.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0...7.5.0-release47.0) (2022-10-28)

## [7.3.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/2.2.3...7.3.0) (2022-10-24)

### Features

- add Sofie Chef device ([4fac092](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4fac092d6f896d1f5fa77c92b7f8a69339a75c55))

### Bug Fixes

- update SofieChef device API ([514d827](https://github.com/nrkno/sofie-timeline-state-resolver/commit/514d8271dd0d1fbce673154067d92f02a25e0b4b))

## [8.0.0-release49.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.2...8.0.0-release49.0) (2023-03-21)

### ⚠ BREAKING CHANGES

- resolve MSE show names to IDs using the directory

### Features

- Emit debug state ([516a512](https://github.com/nrkno/sofie-timeline-state-resolver/commit/516a51203aa0af8c0a47552ecf9c0c99cd01d0be))
- multi osc device ([b987680](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b9876808d44543903e45ab5a1a1a2b85beed4aac))
- resolve MSE show names to IDs using the directory ([e094dda](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e094dda7dbd14b312ff8ffef5d45a39a1e802bcf))
- SOF-1254 add TriCaster integration ([06b129e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/06b129ecec2d87b0caaa22fda36b2b5ef953653e))
- SOF-1254 add TriCaster matrix support ([dbb1b26](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dbb1b26e84a41227e3eca0fae902bf5b57ca5d8e))
- Vmix preset actions ([8b31294](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8b3129412f3881ff9db2cd059927e5b5f3ae6caf))
- **vmix:** add support for ListRemoveAll and ListAdd commands ([4a7240f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4a7240f7b2819bb16f263b72d1b06b98e3c40353))
- **vmix:** add support for starting and stopping VB.NET scripts ([9f2d4ee](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2d4eeeccd9ba0017fc00cfe5df18e3717ea660))

### Bug Fixes

- change `DeviceType.MULTI_OSC` value ([386ba6c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/386ba6c791a090553cf1d66c73ae82cb25edd03f))
- SOF-1254 improve types ([0471a7b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0471a7bf64f7340e83b5b6f47212003fd2586ca6))
- SOF-1254 type guards and make some properties optional ([f8b8aab](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f8b8aab02a0ef7f0ad8814365ca3e08820c9a1af))

# [8.0.0-release48.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0...8.0.0-release48.2) (2023-03-21)

# [8.0.0-release48.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...8.0.0-release48.1) (2023-02-14)

# [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...8.0.0-release48.0) (2022-12-12)

### Features

- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))
- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

# [8.0.0-release48.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...8.0.0-release48.1) (2023-02-14)

# [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...8.0.0-release48.0) (2022-12-12)

### Features

- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))
- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

# [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...8.0.0-release48.0) (2022-12-12)

### Bug Fixes

- add optional parameter to HTTPSend timelineObj: paramsType ([979dc61](https://github.com/nrkno/sofie-timeline-state-resolver/commit/979dc61748c4c371a8b17c7fd8c5929c69f747d9))
- add support for Node 18 ([6242dd6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6242dd68f54a491aa71bdfd30b066550d6f7e90e))

### Features

- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))
- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

# [7.5.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.7...7.5.0) (2023-02-28)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.7](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...7.5.0-release47.7) (2023-02-24)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.5...7.5.0-release47.6) (2023-02-07)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.4...7.5.0-release47.5) (2023-01-16)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...7.5.0-release47.4) (2023-01-13)

### Bug Fixes

- add optional parameter to HTTPSend timelineObj: paramsType ([979dc61](https://github.com/nrkno/sofie-timeline-state-resolver/commit/979dc61748c4c371a8b17c7fd8c5929c69f747d9))
- add support for Node 18 ([6242dd6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6242dd68f54a491aa71bdfd30b066550d6f7e90e))

# [7.5.0-release47.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.2...7.5.0-release47.3) (2022-11-07)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.1...7.5.0-release47.2) (2022-11-02)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.0...7.5.0-release47.1) (2022-11-02)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.5.0-release47.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0...7.5.0-release47.0) (2022-10-28)

### Bug Fixes

- update SofieChef device API ([514d827](https://github.com/nrkno/sofie-timeline-state-resolver/commit/514d8271dd0d1fbce673154067d92f02a25e0b4b))

### Features

- add Sofie Chef device ([4fac092](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4fac092d6f896d1f5fa77c92b7f8a69339a75c55))

# [7.4.0-release46.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.4.0-release46.0...7.4.0-release46.1) (2022-09-27)

# [7.4.0-release46.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.1...7.4.0-release46.0) (2022-09-26)

### Bug Fixes

- index datastore references by path ([9b48d72](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9b48d725d79d4eee13e7347e450abaadf02b6db2))
- invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
- move all references to the root of the tl obj ([130b6c3](https://github.com/nrkno/sofie-timeline-state-resolver/commit/130b6c3a908b0911f94ccedc67e7004404f11010))
- put 'em back to make linter happy ([e83a5ed](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
- **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
- update typings with datastore references ([2c0074b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2c0074bc74d8fa0eead89b44b558e73de4057638))

### Features

- **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/nrkno/sofie-timeline-state-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
- **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/nrkno/sofie-timeline-state-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
- timeline datastore prototype ([e122e8b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e122e8bff7404b1955853131d24144c660f76753))

# [7.3.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.2...7.3.0) (2022-10-24)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.3.0-release44.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.1...7.3.0-release44.2) (2022-09-29)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.3.0-release44.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.0...7.3.0-release44.1) (2022-09-22)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.3.0-release44.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.1...7.3.0-release44.0) (2022-07-04)

# [7.1.0-release42.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.2...7.1.0-release42.1) (2022-04-29)

### Features

- SOF-752 show init and cleanup ([44264b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))

### Reverts

- Revert "7.1.0" ([8ce054c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))
- Revert "test: Rename package on publish" ([855f772](https://github.com/nrkno/sofie-timeline-state-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))

## [1.0.2-release37.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.2-release37...1.0.2-release37.1) (2021-09-02)

# [7.1.0-release42.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.1...7.1.0-release42.1) (2022-04-29)

### Features

- SOF-752 show init and cleanup ([44264b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))

### Reverts

- Revert "7.1.0" ([8ce054c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))

## [1.0.2-release37.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.2.0-release37.7...1.0.2-release37.4) (2021-11-08)

## [1.0.2-release37.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.2-release37.2...1.0.2-release37.3) (2021-10-14)

### Reverts

- Revert "test: Rename package on publish" ([855f772](https://github.com/nrkno/sofie-timeline-state-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))

## [1.0.2-release37.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.2-release37...1.0.2-release37.1) (2021-09-02)

# [7.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.2...7.0.0) (2022-06-27)

**Note:** Version bump only for package timeline-state-resolver-types

# [7.0.0-release41.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.0...7.0.0-release41.2) (2022-04-28)

### Bug Fixes

- move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
- **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))

# [7.0.0-release41.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.0...7.0.0-release41.1) (2022-04-12)

### Bug Fixes

- move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
- **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))

# [7.0.0-release41.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.4.0-release39.1...7.0.0-release41.0) (2022-03-21)

**Note:** Version bump only for package timeline-state-resolver-types

# [6.4.0-release39.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.3.0...6.4.0-release39.1) (2022-02-03)

**Note:** Version bump only for package timeline-state-resolver-types

# [6.3.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.2.1...6.3.0) (2022-01-26)

### Bug Fixes

- Updated links to match the changed repo name ([6fe910f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6fe910f69a313e1f7b84e88a6550c3e40ac29afa))

# [6.3.0-release38.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0...6.3.0-release38.0) (2021-12-17)

**Note:** Version bump only for package timeline-state-resolver-types

# [6.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.7...6.2.0) (2021-12-08)

**Note:** Version bump only for package timeline-state-resolver-types

# [6.2.0-release37.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.3...6.2.0-release37.4) (2021-09-30)

### Bug Fixes

- emitting of 'debug' events should only be done if the debug property is truthy. ([5d015a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5d015a1dfde3ffc86f9aea9366bf72f76537d9a4))

# [6.2.0-release37.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.0...6.2.0-release37.1) (2021-09-21)

### Features

- map sisyfos channel by its label ([afcf056](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/afcf056a568f5e18545379c2655b8c1769b98be2))
- purge unknown elements from the viz-rundown upon activation ([cff4d0c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cff4d0cbcd46b7da97a8de31cb92381286294350))

# [6.2.0-release37.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.2...6.2.0-release37.0) (2021-09-13)

**Note:** Version bump only for package timeline-state-resolver-types

# [6.1.0-release36.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.0.3...6.1.0-release36.0) (2021-07-12)

### Features

- **OBS:** Support OBS Live Video Production Software ([#187](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/187)) ([f2fe81a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f2fe81a3ae87ccd3c8db812e88ef9a94b74673d5))
- resend failing http commands ([cb2ee39](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb2ee3967f587520c8dd1e3b6d3543af6fcae687))
