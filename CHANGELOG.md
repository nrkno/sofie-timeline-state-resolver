# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [6.2.0-release37.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.2...6.2.0-release37.0) (2021-09-13)


### Bug Fixes

* do not remove unknown vmix sources ([c6a262b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c6a262baff1318701c1f494175918b49ca058fa5))
* do not send unnecessary lawo commands ([91cf76a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91cf76a4723dff5c8ae18ae3fa8a5603046bfd07))
* reduce logging amount by only emitting some logs when active ([9af530b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9af530bb55f09359be3cf7b50b427412986c1cc6))
* remove redundant log lines ([216a3f5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/216a3f57c808b86d7e4d5a749dc7a4a2317070f4))
* vmix overlay/multiview input selection diffing ([b915d51](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b915d517489b021480f69c3057341749c4adcd42))


### Features

* OBS video production app support ([#181](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/181)) ([3d312a6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d312a69db128f2f33af6308cba7baebfd9d0155))


### Reverts

* Revert "feat: OBS video production app support (#181)" (#186) ([3831891](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/383189119c470c948c59c66460915819678ec6c2)), closes [#181](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/181) [#186](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/186)





# [6.1.0-release36.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.1...6.1.0-release36.2) (2021-09-07)


### Bug Fixes

* only retry http commands for network failures ([dd28e4c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd28e4c816e0130e5c8185b9a4780789fffc3814))





# [6.1.0-release36.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.0...6.1.0-release36.1) (2021-07-12)


### Bug Fixes

* prerelease workflow not setting version correctly ([4f4fced](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4f4fcedebc742e2fd279f137e6e43fd6d74cd6fd))





# [6.1.0-release36.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.0.3...6.1.0-release36.0) (2021-07-12)


### Bug Fixes

* always send http param data if present ([af326e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/af326e1ce7e3ffcf9a3626210563e6fe552553e1))
* **OBS:** incompatible/outdated OBS DeviceOptions topology ([c83cd7b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c83cd7bde54a18f4f54dcd6ae900cd36c4f683c8))


### Features

* **OBS:** Support OBS Live Video Production Software ([#187](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/187)) ([f2fe81a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f2fe81a3ae87ccd3c8db812e88ef9a94b74673d5))



# [5.9.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.8.0...5.9.0) (2021-06-25)


### Bug Fixes

* don't create device which already exists ([b00edf3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b00edf3e780fc191a1752383e9eae32531c81d44))


### Features

* resend failing http commands ([cb2ee39](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb2ee3967f587520c8dd1e3b6d3543af6fcae687))


### Reverts

* Revert "chore: enable docs after rls" ([dcf6f0d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dcf6f0d6744fb50ac6ded9652bf215fdcefb515b))
