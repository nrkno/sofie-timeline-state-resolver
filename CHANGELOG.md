# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.2.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.2.0...3.2.1) (2019-08-06)


### Bug Fixes

* add missing sisyfos types ([4bc54a9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4bc54a9))
* quantel: try/catch block didn't catch as intended ([9e91e8a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9e91e8a))
* remove unimplemented interface ([f6b6b52](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f6b6b52))



## [3.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.1.1...3.2.0) (2019-08-06)


### Bug Fixes

* better support for when the name of a device cannot be determined until after .init() ([a6f1ad0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a6f1ad0))
* Bug when resolving timeline with repeating objects ([9e01dc7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9e01dc7))
* change some emits to debug instead of info ([b84342c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b84342c))
* corrected return type of loadPort and changed calculation of portOutPoint ([e54b74d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e54b74d))
* minor bug ([41d6599](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/41d6599))
* osc: fix timelineObj content type so that fromTlObject isn't in there ([6b300a0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6b300a0))
* possible bug when throwing error, that might cause resolving to halt ([e1cb023](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e1cb023))
* TCPSend: added tests ([6405552](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6405552))
* **quantel:** remove command-queueing, this will be handled in quantel-gateway instead ([d43a192](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d43a192))
* typescript build errors ([14c2dff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/14c2dff))
* **quantel:** better handling of in/out points ([28fefee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/28fefee))
* **quantel:** bugfix: stop at correct frame ([04be540](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/04be540))
* **quantel:** check input options ([76813b3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/76813b3))
* **quantel:** handle error responses ([fc8a94f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fc8a94f))
* **sisyfos:** comply with automation protocol ([b9ba380](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b9ba380))
* **sisyfos:** do not accept state before initialization ([6ab3dda](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6ab3dda))
* **sisyfos:** remove groups ([c9f9e33](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c9f9e33))
* **sisyfos:** rename select to isPgm ([52d3b11](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/52d3b11))
* **sisyfos:** wrong transition function ([b06ec91](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b06ec91))


### Features

* add TCPSend device (wip) ([88618ff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/88618ff))
* commandContext for tcpSend device ([71c8221](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/71c8221))
* emit statReport ([179d016](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/179d016))
* Implement support for Quantel-Gateway device ([3b38526](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3b38526))
* **doOnTime:** return removed count ([dcee1c0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dcee1c0))
* sisyfos device ([cb92701](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb92701))
* sisyfos: add connectivity status monitoring ([c3a868a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c3a868a))
* TCPSend: continued implementation (wip) ([ab84254](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ab84254))
* update TCPSend device, getStatus ([551e18b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/551e18b))
* updated typings from Quantel Gateway ([04d77e8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/04d77e8))
* **quantel:** cache clipId, so it doesn't have to query it again too often ([3b3d43f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3b3d43f))



### [3.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.1.0...3.1.1) (2019-08-01)


### Bug Fixes

* export all typings, not just a selection. This allows for consumers to only have to import TSR-types additionally, when importing TSR ([8ee6ec6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8ee6ec6))
* fix issue with typings library, causing it to not be importable by consumers ([8b2452e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8b2452e))



## [3.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.0.1...3.1.0) (2019-07-30)


### Bug Fixes

* dispose of atem properly ([46a9055](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/46a9055))
* stronger typings on the device eventEmitters ([ad145b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ad145b5))
* typo ([b7a34ee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b7a34ee))
* update dependencies ([2622dfa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2622dfa))
* update of dependencies ([080600c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/080600c))


### Features

* add support for commands with context ([bf20e44](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bf20e44))
* devices emit "commandError" events when there is a problem with a comand ([72e8d3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/72e8d3b))
* OSC Tweened properties ([96fa04c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/96fa04c))



## [3.0.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.0.0...3.0.1) (2019-05-21)


### Bug Fixes

* Update supertimeline dep ([3c89511](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c89511))



# [3.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.2.0...3.0.0) (2019-05-21)


### Bug Fixes

* cunductor: better handling of when future is clear ([471d905](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/471d905))
* decrease hyperdeck ping for faster connection status ([fb151e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb151e9))
* Guard against object being undefined ([d96d398](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d96d398))
* handle non-decript looping casparcg-video ([b23a8a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b23a8a8))
* Linter errors ([27dc142](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/27dc142))
* Update TimelineObjEmpty. Fix some incorrect import paths ([5e7b66c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e7b66c))


### Features

* Add accurate typings for TimelineObject.keyframes ([0a116dc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0a116dc))
* add casparcg-property noStarttime to avoid seeking in certain situations ([e591c0d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e591c0d))
* Expose isLookahead and lookaheadForLayer on TSRTimelineObjBase ([22841a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/22841a8))
* implement Timeline version 2 and various improvements to the timeline resolving & typings ([32574ff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/32574ff))
* support for multiple queues in doOnTime, so that IN_ORDER can burst some commands, while run others in order ([8bbc0b8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8bbc0b8))
* update timeline lib ([a499d5f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a499d5f))
* update timeline typings ([127644b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/127644b))


### BREAKING CHANGES

* new timeline interface, slightly changed timeline logic



# [2.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.1.1...2.2.0) (2019-05-21)


### Bug Fixes

* negated negation ([033ea4c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/033ea4c))


### Features

* add casparcg-property noStarttime to avoid seeking in certain situations ([c7efc87](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c7efc87))



## [2.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.1.0...2.1.1) (2019-05-13)


### Bug Fixes

* decrease hyperdeck ping for faster connection status ([ab24d55](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ab24d55))



# [2.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.0.2...2.1.0) (2019-04-11)


### Bug Fixes

* deprecate .VIDEO & .AUDIO in favor for .MEDIA ([898ba8c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/898ba8c))


### Features

* **atem:** Audio Channels ([450c26d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/450c26d))
* add support for casparCG looping, seeking & inPoint ([dd4dacf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd4dacf))
* Combine casparcg VIDEO and AUDIO types into single MEDIA type ([f675e6f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f675e6f))



## [2.0.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.0.1...2.0.2) (2019-03-27)


### Bug Fixes

* **atem:** Broken tests ([0a30477](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0a30477))
* **atem:** double wipe ([41fab2b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/41fab2b))
* Add guard to all device types ([7db1b97](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7db1b97))
* Some callbacks not being sent ([d89af30](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d89af30))



<a name="1.7.1"></a>
## [1.7.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.7.0...1.7.1) (2019-02-13)


### Bug Fixes

* **tsr:** Restrict the next resolve time to inside the current window, to ensure we don't miss something that the timeline excluded ([afa514d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/afa514d))



<a name="1.7.0"></a>
# [1.7.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.3...1.7.0) (2019-01-31)


### Bug Fixes

* add option to enabled multithreading ([6d45f64](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6d45f64))
* **ATEM:** Better description of PSUs in warning. The old message "...2/2 is faulty" could be read as both PSUs being down, which isn't what the warning is trying to tell. ([92b30b3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/92b30b3))
* **CasparCG:** Adds deviceID to the devicename for consistency ([cd3fc4e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd3fc4e))
* bump hyperdeck-connection fixes connection state ([61dd155](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/61dd155))
* ccg-con potentially not initiated. ([d1ea910](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d1ea910))
* defer and group toghether timelineCallbacks, to avoid sending "stopped" directly followed by "started" events. ([7f7ce04](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f7ce04))
* **Panasonic PTZ:** disconnection should not give errors ([ecea5c6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ecea5c6))
* failing ci build ([cdd0f52](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cdd0f52))
* Pharos started reconnecting infinitely if connection failed. (this is NOT tested yet) ([91ff721](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91ff721))


### Features

* add timelineCallback on stopped event ([cd12fa6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd12fa6))
* **atem:** Simplify lookahead handling logic to only support WHEN_CLEAR and the updated RETAIN mode ([5e82a3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e82a3b))
* set threadUsage from deviceOptions ([d00f57b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d00f57b))



<a name="1.6.3"></a>
## [1.6.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.2...1.6.3) (2019-01-19)


### Bug Fixes

* **casparcg:** device name ([981e621](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/981e621))



<a name="1.6.2"></a>
## [1.6.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.1...1.6.2) (2019-01-14)


### Bug Fixes

* **http:** Sort commands by llayer before queueing to make execution order deterministic ([a93fdc1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a93fdc1))



<a name="1.6.1"></a>
## [1.6.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.0...1.6.1) (2019-01-14)


### Bug Fixes

* **CasparCG:** Adds deviceID to the devicename for consistency ([21ca820](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/21ca820))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.5.0...1.6.0) (2018-12-19)


### Bug Fixes

* Fix atem make-ready debug log parsing in kibana ([9fb09d5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9fb09d5))
* Fix atem make-ready debug log parsing in kibana ([9880672](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9880672))
* **atem:** listen on state changes to update psu status ([f305181](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f305181))


### Features

* **casparcg:** Add channel_layout to TimelineObjects ([c77e765](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c77e765))
* **CasparCG:** channel_layout property ([4101e74](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4101e74))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.4.2...1.5.0) (2018-12-04)


### Features

* OSC Device ([01adfa8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/01adfa8))
* **osc:** Add tests ([a934b16](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a934b16))



<a name="1.4.2"></a>
## [1.4.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.4.1...1.4.2) (2018-11-30)


### Bug Fixes

* Missing dependency for types package ([da6bc82](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/da6bc82))
* Move DeviceOptions interface to types package ([ac300eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ac300eb))



<a name="1.4.1"></a>
## [1.4.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.4.0...1.4.1) (2018-11-27)


### Bug Fixes

* fix Zoom Control command template ([53966f8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/53966f8))
* improve PTZ logging ([4f41c53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4f41c53))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.5...1.4.0) (2018-11-26)


### Features

* add origin descriptor to all error emits ([df2de4d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/df2de4d))



<a name="1.3.5"></a>
## [1.3.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.4...1.3.5) (2018-11-22)


### Bug Fixes

* removed types export (consumers should depend on the types package instead) ([8b31e6a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8b31e6a))
* wrong dependency in types package ([78e5b8f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/78e5b8f))



<a name="1.3.4"></a>
## [1.3.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.3...1.3.4) (2018-11-22)


### Bug Fixes

* Update ccg-state (fixes ccg sting transition) ([faf1f43](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/faf1f43))
* **types:** add timeline exports ([9f70714](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f70714))
* **types:** timeline export ([af32616](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/af32616))



<a name="1.3.3"></a>
## [1.3.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.2...1.3.3) (2018-11-19)



<a name="1.3.2"></a>
## [1.3.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.1...1.3.2) (2018-11-19)


### Bug Fixes

* **types:**  types file structure ([0dfce5e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0dfce5e))
* **types:** upd imports ([2b758fe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2b758fe))
* (false) linter errors, temporary disable linting ([3d6ad7d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d6ad7d))
* import types ([7d05864](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7d05864))
* PanasonicPTZ types ([b2af5c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b2af5c3))



<a name="1.3.1"></a>
## [1.3.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.0...1.3.1) (2018-11-16)



<a name="1.3.0"></a>
# [1.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.2.0...1.3.0) (2018-11-16)


### Bug Fixes

* linter errors ([cd9403f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd9403f))
* PanasonicPTZ typing ([c6dfbe3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c6dfbe3))
* typings package ([337e8be](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/337e8be))
* update some exposed typings ([74cabe0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74cabe0))


### Features

* Adopt TimelineObj types from blueprints/core ([66621fa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/66621fa))
* Create a subpackage for types that are useful elsewhere ([922ceda](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/922ceda))
* Move device options to types package ([145b2ab](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/145b2ab))
* Restructure locations of some type definitions to make them easier to import without large dependency trees ([c729806](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c729806))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.1.1...1.2.0) (2018-11-14)


### Bug Fixes

* add pharos typings, handle pharos reconnection logic, add pharosAPI tests ([85bb728](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85bb728))
* correct test file structure ([c72698e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c72698e))
* emit deviceId with device debug message ([ba6ae95](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ba6ae95))
* refactor tests ([f251f69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f251f69))
* use pre ordered commands from casparcg-state ([04ed282](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/04ed282))


### Features

* **Panasonic PTZ:** add support for zoom & zoom speed control ([0da79a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0da79a1))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.1.0...1.1.1) (2018-10-24)



<a name="1.1.0"></a>
# [1.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.1...1.1.0) (2018-10-24)


### Bug Fixes

* update Pharos test ([f799af4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f799af4))


### Features

* add Pharos-device (wip) ([b099ba8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b099ba8))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.0...1.0.1) (2018-10-19)


### Bug Fixes

* Add some additional logging to atem resolving to pin down issues after make ready ([abf6943](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/abf6943))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.4...1.0.0) (2018-10-19)


### Bug Fixes

* added basic hyperdeck mock ([e0c03f7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e0c03f7))
* added proper dispose/terminate functions to devices ([1785d52](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1785d52))
* change MappingPanasonicPtzType to a traditional enum ([69e8a95](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/69e8a95))
* command execution queue ([64cc4a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/64cc4a8))
* don't reset caspar states if it's not okToDestroyStuff ([1d5e19a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1d5e19a))
* falsy preset number (0) did not execute ([40f2b00](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40f2b00))
* panasonicPTZ: refactoring dispose functions & proper error emits ([a0cc49f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a0cc49f))
* refactor log messages ([2f7684e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2f7684e))
* remove unneccesary tracing of normal behaviour ([ed05c09](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ed05c09))
* removed deprecated externalLog ([e356271](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e356271))
* **hyperdeck:** Update for api changes ([90d2bd0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/90d2bd0))
* **Panasonic PTZ:** make all settings optional ([53124c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/53124c3))
* **Panasonic PTZ:** optional port was not optional ([ce5a322](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ce5a322))
* update CasparcgVideoPlayES6example.js ([48077fa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/48077fa))
* update hyperdeck mock to test commands ([72feb67](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/72feb67))


### Features

* add a interval camera state check ([3ba352a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3ba352a))
* add optional port setting ([8eacb8c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8eacb8c))
* **hyperdeck:** Recording control ([7c9fec0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7c9fec0))
* added atem PSU status, refactored device methods to abstract ([0789df2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0789df2))
* added getDiff function, to be used for generating command contexts ([3275bf7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3275bf7))
* finish Panasonic PTZ & unit tests ([2cd95fe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2cd95fe))
* implemented command context in all internally managed devices ([859df4b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/859df4b))
* rehauled how debug messages is sent. Prepared for sending command context (wip) ([fcf1e69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fcf1e69))
* switch to a single-device design, abstract device control url ([a681dad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a681dad))


### BREAKING CHANGES

* device.on('connectionChanged') now emits a DeviceStatus object, not a boolean



<a name="0.17.4"></a>
## [0.17.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.3...0.17.4) (2018-10-15)


### Bug Fixes

* ignore FaderMotor errors ([5bf6146](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5bf6146))



<a name="0.17.3"></a>
## [0.17.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.2...0.17.3) (2018-10-10)



<a name="0.17.2"></a>
## [0.17.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.1...0.17.2) (2018-10-04)



<a name="0.17.1"></a>
## [0.17.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.0...0.17.1) (2018-09-22)


### Bug Fixes

* **casparcg:** don't try to set time when not using scheduling ([89b3d59](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/89b3d59))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.16.0...0.17.0) (2018-09-21)


### Features

* restart CasparCG from TSR ([069a4b2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/069a4b2))



<a name="0.16.0"></a>
# [0.16.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.15.0...0.16.0) (2018-09-13)


### Features

* update timeline dependency ([85d17bc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85d17bc))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.14.0...0.15.0) (2018-09-11)


### Bug Fixes

* Reset atem state as part of makeReady ([1b44a5e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1b44a5e))


### Features

* Add array of commands for HttpSend to send as part of makeReady ([c2518e4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c2518e4))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.8...0.14.0) (2018-09-06)


### Bug Fixes

* tests & dont remove future commands if going to re-add them directly ([c9afbeb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c9afbeb))


### Features

* added .useScheduling option, to allow optional usage of schedule commands. Added fallback to use internal queue when not scheduling. ([0e4b14a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0e4b14a))
* added example file & loosened some typings ([c1132e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c1132e1))
* test for checking scheduling of commands ([b59551c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b59551c))



<a name="0.13.8"></a>
## [0.13.8](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.7...0.13.8) (2018-09-05)


### Bug Fixes

* **casparcg:** generate sequential command tokens ([3cac6e3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3cac6e3))



<a name="0.13.7"></a>
## [0.13.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.6...0.13.7) (2018-09-05)


### Bug Fixes

* update timeline dependency (containing bugfixes) ([2709fa0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2709fa0))



<a name="0.13.6"></a>
## [0.13.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.5...0.13.6) (2018-09-04)



<a name="0.13.5"></a>
## [0.13.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.4...0.13.5) (2018-09-03)


### Bug Fixes

* **casparcg:** out transition is built using properties from in transition ([18524a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/18524a1))



<a name="0.13.4"></a>
## [0.13.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.3...0.13.4) (2018-08-29)


### Bug Fixes

* {clear > now} => {clear >= now} ([06728ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/06728ed))



<a name="0.13.3"></a>
## [0.13.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.2...0.13.3) (2018-08-29)


### Bug Fixes

* clean up queued callbacks properly ([495b8f4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/495b8f4))
* timeline dep ([10dc818](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/10dc818))



<a name="0.13.2"></a>
## [0.13.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.1...0.13.2) (2018-08-28)


### Bug Fixes

* **casparcg:** use frames not fields ([9a2306c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9a2306c))



<a name="0.13.1"></a>
## [0.13.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.0...0.13.1) (2018-08-27)


### Bug Fixes

* memory leak due to atem state not having state.time ([7d27173](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7d27173))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.12.0...0.13.0) (2018-08-21)


### Bug Fixes

* **atem:** Super Source properties do not require an index. ([a6ac7d9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a6ac7d9))
* **casparcg:** retry strategy for setting timecode ([99a1029](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/99a1029))


### Features

* emit for successful command ([6ea2cc7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6ea2cc7))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.11.0...0.12.0) (2018-08-20)


### Features

* updated timeline dependency ([920d98a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/920d98a))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.10.1...0.11.0) (2018-08-17)


### Bug Fixes

* **atem:** Super Source Props defaults ([b2f793e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b2f793e))
* prevent casparcg from stopping init upon slow time command ([d996c33](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d996c33))


### Features

* **atem:** support for super source properties ([9bb21de](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9bb21de))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.10.0...0.10.1) (2018-08-15)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.9.1...0.10.0) (2018-08-10)


### Bug Fixes

* reset the resolver upon reconnection with Atem ([500f884](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/500f884))
* use TimeCommand to set time code ([82f06bc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/82f06bc))


### Features

* bump casparcg-state dependency ([c45eddc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c45eddc))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.9.0...0.9.1) (2018-08-07)


### Bug Fixes

* emit errors in atem-connection ([642cebd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/642cebd))
* loadbg is done from state, no longer in tsr ([fd0dfe0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd0dfe0))
* test ([3c84ea7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c84ea7))
* updated timeline dependency (performance increase) ([52c5620](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/52c5620))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.8.0...0.9.0) (2018-08-03)


### Bug Fixes

* **casparcg:** upNext not being set properly if playing clip was defined before background on timeline ([27a8ae4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/27a8ae4))
* handle promise appropriately ([8891d65](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8891d65))
* remove deprecated time sync ([84ab05d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/84ab05d))
* set timecode upon reconnection ([e084a74](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e084a74))


### Features

* lookahead/background support ([a16db93](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a16db93))
* sting transitions ([3d3bedf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d3bedf))
* **casparcg:** pause media ([9c48003](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9c48003))
* **casparcg:** route mode ([b214471](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b214471))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.7.0...0.8.0) (2018-08-02)


### Bug Fixes

* abstract can't connect ([a415b96](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a415b96))
* connected status of lawo device ([a9edf59](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a9edf59))
* update dependencies ([7f0ca17](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f0ca17))
* updated dependencies ([93201e6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/93201e6))


### Features

* added .canConnect property to devices, for status display ([25d2ded](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/25d2ded))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.8...0.7.0) (2018-07-30)


### Bug Fixes

* keyframes for atem devices ([029fd11](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/029fd11))


### Features

* set state to device state upon connection ([3549c8f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3549c8f))



<a name="0.6.8"></a>
## [0.6.8](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.7...0.6.8) (2018-07-30)



<a name="0.6.7"></a>
## [0.6.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.6...0.6.7) (2018-07-30)



<a name="0.6.6"></a>
## [0.6.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.5...0.6.6) (2018-07-04)


### Bug Fixes

* Guard against callback resolving time of 0 ([bbc04b6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bbc04b6))



<a name="0.6.5"></a>
## [0.6.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.4...0.6.5) (2018-07-04)


### Bug Fixes

* Device: clean up old saved states ([0115c9a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0115c9a))



<a name="0.6.4"></a>
## [0.6.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.3...0.6.4) (2018-07-03)



<a name="0.6.3"></a>
## [0.6.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.2...0.6.3) (2018-07-02)


### Bug Fixes

* **CasparCG:** Don't try to resolve a timeline before State is ready ([32c71a3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/32c71a3))



<a name="0.6.2"></a>
## [0.6.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.1...0.6.2) (2018-06-20)


### Bug Fixes

* atem aux state not being mutated correctly ([a8e8b22](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a8e8b22))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.0...0.6.1) (2018-06-20)


### Bug Fixes

* add logging for http send ([ef4528e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ef4528e))
* added try/catch around function execution in doOnTime ([dba832b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dba832b))
* fixed error emits ([68833ec](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68833ec))
* handle unknown http-send type more gracefully ([fb88725](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb88725))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.5.0...0.6.0) (2018-06-19)


### Features

* Add http put requests to httpSend ([5e66ae0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e66ae0))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.4.1...0.5.0) (2018-06-19)


### Features

* logs info through tsr ([3a2e182](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3a2e182))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.4.0...0.4.1) (2018-06-19)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.3.0...0.4.0) (2018-06-18)


### Features

* Ensure LLayers are run in a predictable order (name order), to allow for overriding values from other layers. ([fd2ca4f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd2ca4f))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.2.1...0.3.0) (2018-06-18)


### Bug Fixes

* **Lawo:** Handling error emitted by emberplus ([efae206](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/efae206))
* removes unused code in ember onConnected ([21ce669](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/21ce669))


### Features

* **Ember:** Basic ember+ commands ([bde257c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bde257c))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.2.0...0.2.1) (2018-06-15)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.1.5...0.2.0) (2018-06-15)


### Features

* **Atem:** enforce the device state upon connection ([466f7f6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/466f7f6))



<a name="0.1.5"></a>
## [0.1.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.1.4...0.1.5) (2018-06-15)



<a name="0.1.4"></a>
## [0.1.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.3...v0.1.4) (2018-06-14)



<a name="0.1.3"></a>
## [0.1.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.2...v0.1.3) (2018-06-14)



<a name="0.1.2"></a>
## [0.1.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.1...v0.1.2) (2018-06-14)



<a name="0.1.1"></a>
## [0.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.0...v0.1.1) (2018-06-14)



<a name="0.1.0"></a>
# 0.1.0 (2018-06-14)


### Bug Fixes

* **atem:** import abstract commands from library exports ([827a34e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/827a34e))
* **Atem:** connected event fires after state was initiated ([f8d053b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f8d053b))
* update yarn.lock ([012c19c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/012c19c))
* **Atem:** Do a deep merge on the content attributes ([99faf76](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/99faf76))
* **CasparCG:** all layers are generated, commands always execute ([334f31d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/334f31d))
* **CasparCG:** initiation of device waits for timecode ([3fde8f4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3fde8f4))
* **core:** empty state is not compared ([ee2d928](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ee2d928))
* **Lawo:** Handling error emitted by emberplus ([3bd1c6e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3bd1c6e))
* use npm versions of libraries ([8718e28](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8718e28))
* **tests:** export AMCP classes from the connection lib stub ([8ce7094](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8ce7094))
* add circleCI badge ([f0911f1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f0911f1))
* ATEM SSrc box handling ([e9eee48](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e9eee48))
* fixes options for lawo devices ([57d6097](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/57d6097))
* minor package fix ([fd86b40](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd86b40))
* set correct github repo ([3fc024d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3fc024d))
* set correct lib name ([35a3eb6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/35a3eb6))
* timecode expects frames not fields ([927ac4c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/927ac4c))
* update license ([a4960ae](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a4960ae))
* update ssh figerprint ([34005b1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/34005b1))
* use open source versions of superfly/nrkno packages ([192c5c7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/192c5c7))
* wait for atem state to fill up ([5790630](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5790630))


### Features

* add all scripts + colaborators ([6d97cc0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6d97cc0))
* Add atem device ([532b5ff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/532b5ff))
* added CasparCG mock (wip) ([2d0c747](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2d0c747))
* added conductor test ([6cd6c03](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6cd6c03))
* **casparcg:** added route and record type ([ec97f67](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ec97f67))
* added typescript and build boilerplate ([1d59d8e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1d59d8e))
* **Atem:** Abstraction for working with ME's ([e009d34](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e009d34))
* **casparcg:** add support for loadbg command ([65538e0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/65538e0))
* **casparcg:** add template and input type ([74b744c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74b744c))
* **casparcg:** command scheduling (local) ([60ddff1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/60ddff1))
* **casparcg:** fix command generation ([610f5fa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/610f5fa))
* **casparcg:** implement rough structure for transitions ([fa5641a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fa5641a))
* **casparcg:** keep current state ([a44b250](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a44b250))
* **casparcg:** mixer commands ([dc98792](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc98792))
* **casparcg:** new state structure ([01f5b14](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/01f5b14))
* **casparcg:** some preliminary safeguards ([e3e949b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e3e949b))
* **CasparCG:** resolve states to commands. ([5a50410](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5a50410))
* **core:** distribute commands to devices ([3294553](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3294553))
* **core:** timing interval ([c326a97](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c326a97))
* **Lawo:** Dynamic Attributes ([3d4889c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d4889c))
* cache the Lawo Nodes during connection lifetime ([a8e3816](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a8e3816))
* **mappings:** removes mapping resolver ([11767a7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/11767a7))
* enforce defaults after connection ([91315a5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91315a5))
* fader ramp function as transition ([d2a3e85](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d2a3e85))
* Lawo Device ([b22c75a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b22c75a))
* **Runtime config:** devices ([084ea01](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/084ea01))
* **Runtime config:** mappings ([74335ca](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74335ca))
* **Scheduled Commands:** Use timecode to schedule commands in CasparCG ([36ebcb7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/36ebcb7))
* moved around logic to devices from the conductor, etc ([221f2fb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/221f2fb))
* process timelines into state ([5a098f6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5a098f6))
* remove travis, add multiple needed files ([36c089d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/36c089d))
* stubbed code structure ([3971305](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3971305))
