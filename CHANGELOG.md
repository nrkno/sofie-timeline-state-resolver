# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [6.2.0-release37.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.5...6.2.0-release37.6) (2021-10-20)


### Bug Fixes

* disable casparcg retry for negative values ([dc0e2ae](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc0e2aecd5a8142c1a0bfbda80ed8988d3bb2f3c))





# [6.2.0-release37.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.4...6.2.0-release37.5) (2021-10-13)


### Bug Fixes

* don't emit resolveTimeline when not active ([f37f79b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f37f79b851164e042991a49a2f73add445075918))
* improve robustness ([6296d8c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6296d8c01195739b2f1022980de486c7448eb348))
* update atem-state ([9f250c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f250c3d02bfdef052f154c5c2a66de102df20c3))


### Features

* separate the init from device creation ([20cdd68](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/20cdd6802ee6ff5151e03e2b84d035db638b6d87))





# [6.2.0-release37.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.3...6.2.0-release37.4) (2021-09-30)


### Bug Fixes

* emitting of 'debug' events should only be done if the debug property is truthy. ([5d015a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5d015a1dfde3ffc86f9aea9366bf72f76537d9a4))





# [6.2.0-release37.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.2...6.2.0-release37.3) (2021-09-30)


### Bug Fixes

* update quantel-gateway-client dependency to latest ([6f3e904](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6f3e90434e71d651688febc1b67dfbbac2d503b8))
* wait for releaseing quantel port before creating a new one ([da4c862](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/da4c862df1b5dacbd03862bd192092a0b78b50a9))





# [6.2.0-release37.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.1...6.2.0-release37.2) (2021-09-21)


### Features

* emit more detailed slowCommands ([91bda43](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91bda43cf499d14c43aef96e0af7b3df78591a05))





# [6.2.0-release37.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.0...6.2.0-release37.1) (2021-09-21)


### Bug Fixes

* allow retry in _getRundown ([8e37d5a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8e37d5a13d79d0cdb8a06b84a5571e75289347eb))
* Build errors ([13dce42](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/13dce42a5eb9a75ddddf69591fdb075f030a56ee))
* don't update elements after first connect an extra time ([cc5ffc8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cc5ffc8d1bd6fd63892e9b023a1f1233246c25be))
* load only elements from the active playlist when restarting ([fee2962](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fee29626071c81e9daf8848933091d5a4ef5e98e))
* rehearsal<->active when gateway was restarted ([595fbce](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/595fbceb4aaf65f9d444e70b592dbf791fe202df))
* trigger `activate` to reload elements after VizEngine restart ([40d26a0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40d26a0ecb74acf48fc1fa8358ffcd661133aa9c))
* wait after activation ([5bace5a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5bace5a88ea373db040dd7b5735ff1150dafe6e8))


### Features

* map sisyfos channel by its label ([afcf056](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/afcf056a568f5e18545379c2655b8c1769b98be2))
* purge unknown elements from the viz-rundown upon activation ([cff4d0c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cff4d0cbcd46b7da97a8de31cb92381286294350))
* rename activeRundown -> activePlaylist. ([868beec](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/868beec3462035ea5f2f5a336931dbd9548b1bd2))





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
