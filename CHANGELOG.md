# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.1.2](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.1.1...2.1.2) (2022-06-23)

**Note:** Version bump only for package timeline-state-resolver-packages





## [2.1.1](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/v2.0.0...2.1.1) (2022-06-14)


### Bug Fixes

* event listeners must not return anything ([cb2fe13](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cb2fe13c965bc3f8e221c1db08e970b454e92f69))
* lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
* move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
* **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))
* upgrade casparcg-state ([bbeee15](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bbeee15e895be58100f4ddb88fb4e229a7aeb07b))





# [2.1.0](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/v0.1.3...v2.1.0) (2022-06-09)


### Bug Fixes

*  update v-connection ([a0ea4d1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a0ea4d147e6b2b068394e0866e1a87449e4c6e8c))
* (false) linter errors, temporary disable linting ([3d6ad7d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3d6ad7d633e543f15ae8259bf9de243150af018b))
* [publish] don't process lockaheads on a port when playing ([30d9407](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/30d94074a9f8f073d87503d3dcb7cec2efe1e073))
* [publish] don't process lockaheads on a port when playing ([2de7c81](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2de7c81a06d9b42816e77f2905b35607acc7e813))
* {clear > now} => {clear >= now} ([06728ed](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/06728ed25816aafe21f2cac6208a73a9cc4bb618))
* A/B-playback: force the playTime to be null, so that previous playTimes doesn't leak through ([7a3bbeb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7a3bbeb3a5c51cda1edf6cd2c39dcadd99246964))
* ab-playback uneccessary startTime change ([a168769](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a1687694dcd57c62e06de712f85cc78f4c42cc91))
* ab-playback, for playtime and pausetime to be consistent and the same for lookahead ([55c0d01](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/55c0d01c0442fef8d44273292e1c70bda4e3f8a6))
* abstract can't connect ([a415b96](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a415b963d382cfc8145b2c41639c20f43665e95e))
* abstract device trying to be casparcg ([27cee9c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/27cee9c7e413fe50b975eabd99450c59a1cb4618))
* add a method to clear the future (invalid) states earlier ([e6ad98f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e6ad98f1159e74688eca894842c2dde4b5eee04b))
* add a multiplier to the options, to allow for adjusting estimateResolveTime ([3941a71](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3941a710ab32fe3bfab89a9bec5cfb06a04d9b4f))
* add activeRundownId to devicesMakeReady ([d4baeee](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d4baeeebe597d29e267122a3a2f7158a00b4a65b))
* add channelName fo vizMSE device ([8b39d88](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8b39d88020395034689f30f5e92d37f792b9ec4b))
* add connectionChanged event emit ([101fa40](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/101fa4064a324af896df75341129acd9bde77e7a))
* add device option.reportAllCommands, to be able to deactivate the sending of command-reports over the wire. ([1729a06](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1729a06c340234698f58faffdd55b05b44d02a83))
* add getThreadsMemoryUsage method, for troubleshooting memory issues ([091f9da](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/091f9da28d22b7c89000daeb23c9f9dd94bf2e2a))
* add guard against when an element can't be created, to fail more gracefully ([af82550](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/af82550efb3034d8f2e4175f70b8be1e714720b4))
* Add guard to all device types ([7db1b97](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7db1b978099c9e956526a42fb824a45a64317b86))
* add instanceName to resolve instance ([e9765c4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e9765c42949bde327b3517a7d6ff700600a945c3))
* add Lawo mapping.priority, as a workaround to an issue with the Lawo processing commands too slowly ([42c8f47](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/42c8f479de130df6fe44e5f64e7850e914da4eff))
* add logging for http send ([ef4528e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ef4528ea482564b72805d56666390e361fd720bc))
* add missing atem-type to TimelineObjAtemAny ([fd0a0b9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fd0a0b925d9fa51284dcee260464876ae8a6f863))
* Add missing params in default input state ([76b4bf2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/76b4bf209bcbfc58f61c968bff3fdbc83f20e341))
* add missing sisyfos types ([4bc54a9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4bc54a9780e454442eacc6dcbb4436e91a0cee26))
* add option to enabled multithreading ([6d45f64](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6d45f64953cd20915a4af545cddff8766608f2c2))
* add pharos typings, handle pharos reconnection logic, add pharosAPI tests ([85bb728](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/85bb72815dc8e394151024e67c6cf1e4d9161935))
* Add prepareForHandleState ([ed0c099](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ed0c09925d3b192df6682c4e7d9dcc6cce721f92))
* add quantel guid support ([194e551](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/194e551b41f90d6751138c1661ef5339b479e213))
* Add set values to enum ([598fced](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/598fcedee838cf78caf01d6564b61db35507005c))
* Add some additional logging to atem resolving to pin down issues after make ready ([abf6943](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/abf694311c227e36f763d563f0e6fd36f70d1ce8))
* add vizMSE device to conductor ([f131cd5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f131cd55fcd23dd8cc08bd575cb3014194aeeafb))
* added basic hyperdeck mock ([e0c03f7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e0c03f74d5c904ddcf7f9982f3773ada345e443b))
* added proper dispose/terminate functions to devices ([1785d52](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1785d5270b3ec7658758f48559b91f327eeeaa99))
* added try/catch around function execution in doOnTime ([dba832b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dba832b2b2bc5a1c47543a34fc18b81fc7083eb5))
* allow for changing estimateResolveTimeMultiplier at runtime ([289a619](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/289a6195268998201c23356be03c83b740cacead))
* allow multiple mappings to reference 1 casparcg layer ([a604b08](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a604b08d902b8d677fe9b7d296b605d3c8961504))
* allow multiple mappings to reference 1 casparcg layer ([49d313b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/49d313ba55086c367142efe1f180d6ea7d7c493a))
* allow retry in _getRundown ([8e37d5a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8e37d5a13d79d0cdb8a06b84a5571e75289347eb))
* allow the consumer to monitor and restart devices manually. Don't automatically restart them anymore ([5e51629](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5e51629e0774f722e049f52789283584e1d36035))
* Allow the take of overlay pilot elements to be delayed ([79670b4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/79670b45c41490a10c4cb9de7c3b8b7033a8a9c4))
* always send http param data if present ([af326e1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/af326e1ce7e3ffcf9a3626210563e6fe552553e1))
* Apply caspar state for retry ([c1b94a0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c1b94a0876fd8387edbd02497f37c72511f287a3))
* assign explicit values to enum ([ace77d3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ace77d3b1bf95e9d6e36e3cd981d9f0d2ca299bd))
* atem aux state not being mutated correctly ([a8e8b22](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a8e8b220369b100cac8d7a0cf2cac9a65862e8f4))
* **atem:** add ssrc properties in tl to atem state conversion [publish] ([156896c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/156896c33f0e9e01ea89fa38da7835d4b229b1f8))
* **atem:** audio channel tsr objects are correctly merged ([e3a8e8b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e3a8e8bcfeccd36a9d9dd06672c405e055c1390b))
* **ATEM:** Better description of PSUs in warning. The old message "...2/2 is faulty" could be read as both PSUs being down, which isn't what the warning is trying to tell. ([92b30b3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/92b30b3c8c8651c37e30e8dc843a6c51f3188c15))
* **atem:** Broken tests ([0a30477](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0a30477581d473005f88878fc96e4de645fa4473))
* **atem:** device state is unavailable when disconnected [publish] ([e53999f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e53999f0c654431ee653a630c8f6c32fe70430f6))
* **atem:** device state is unavailable when disconnected [publish] ([ad32986](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ad32986fcf3c5cd07767c5fc9193037d41430d61))
* **atem:** double wipe ([41fab2b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/41fab2b42cabd7431470369363ca216564e2fda1))
* **atem:** listen on state changes to update psu status ([f305181](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f305181c050e4ca8f020b16b59a3028b3ea11d27))
* **atem:** Super Source properties do not require an index. ([a6ac7d9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a6ac7d9efc4e86046fe0596aeb4e8562c5cb6e0e))
* **atem:** Super Source Props defaults ([b2f793e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b2f793e5d5cce6fa3a424bdc75d0b736878c1904))
* bad merge ([1d40684](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1d406842447da08170f24062a17ecddea7c996a7))
* bad merge ([dd6ea93](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dd6ea93bfd0ee62a403df7abc251ede409c624b5))
* better info and warnings for quantel issues ([#170](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/170)) ([0793a33](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0793a338e1cdc894b4b95b6d0b67bfd19548d203))
* better support for when the name of a device cannot be determined until after .init() ([a6f1ad0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a6f1ad0be1234f9fbdb2495644ba2331e0006826))
* bug fix in callbacks ([b22241b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b22241bf57589ec91f8eb514c6b753fd19077469))
* bug fix: the http-watcher wouldn't check the status on startup, only after ~30 seconds ([1dd1567](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1dd1567507bd3dddf03805ea3f5c4003cdc241ec))
* Bug when resolving timeline with repeating objects ([9e01dc7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9e01dc7b3757fb1b8da687a889fe3771e97d3d32))
* bugfix: update quantel-gw-client dep [release] ([bd3cf49](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bd3cf49b035aca3c7b77f148c65a572beb6d7700))
* Build errors ([13dce42](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/13dce42a5eb9a75ddddf69591fdb075f030a56ee))
* Build errors ([249032d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/249032d8deb9bfd8568d9fb5275f1dd58e4b4647))
* bump hyperdeck-connection fixes connection state ([61dd155](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/61dd155c95d4548f895e4b97e111e85a44b5af88))
* caching of resolved states not working ([#144](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/144)) ([727558b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/727558bf170829ef345c745dc90c1be88d37f9fe))
* callback on stopped was sent too early, send callback through doOnTime queue ([dd188f4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dd188f4aa94a6030a93dd2e2cdbd6873bc2f1356))
* **CasparCG Retries:** filter out all playback related commands ([559fff1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/559fff1cd7de95bf295c16ebbc5016727e1e39db))
* CasparCG transition types ([3a0bb18](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3a0bb1899eaacf21aa51320ba34933b141ea7f97))
* casparcg-state update (bugfixes) ([549315b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/549315b561fa7b098efcb0fd9b0a17c5943df765))
* **CasparCG:** Adds deviceID to the devicename for consistency ([21ca820](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/21ca820c6545f5bfc24f2acf752aa4d493fa3348))
* **CasparCG:** Adds deviceID to the devicename for consistency ([cd3fc4e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cd3fc4e0218b21e32fba86c7216b5e75b5f05a0b))
* **casparcg:** allow transitions to be defined on html pages [publish] ([492901b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/492901be44d37e117788e8caf7ec8a09f744986a))
* **casparcg:** Apply transitions to AUDIO and MEDIA object types ([bf38847](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bf388472a302605665640a767cf0bbbffa78f30e))
* **casparcg:** device name ([981e621](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/981e62180e20fa584bdee2182aabc7c6fba2a9b8))
* **CasparCG:** Don't try to resolve a timeline before State is ready ([32c71a3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/32c71a3ed1a4b1151d4755196e5f14d77035aed7))
* **casparcg:** don't try to set time when not using scheduling ([89b3d59](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/89b3d59244fd54034b5c1dcb2fe0ff199fab95d7))
* **casparcg:** generate sequential command tokens ([3cac6e3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3cac6e31788de69fe53410bb937aaf9557005f4f))
* CasparCGOptions.launcherPort type incorrect (string vs port) ([20d29e5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/20d29e5bd7cc714e5701e911f09ff6d34354e68d))
* **casparcg:** out transition is built using properties from in transition ([18524a1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/18524a1eac7e2aebce47facdb05b0fc798cfb6f6))
* **casparcg:** retry strategy for setting timecode ([99a1029](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/99a1029aa32da8cb984cf95f3cea377762420c97))
* **casparcg:** sting parameter typings ([112816a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/112816a2b31e64b49354df8a5787e3d8ae89963b))
* **casparcg:** update status on queue overflow ([c2ec5f5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c2ec5f58aa09dc357419eeb4ff06fdf9c0791b6e))
* **casparcg:** upNext not being set properly if playing clip was defined before background on timeline ([27a8ae4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/27a8ae4e63bcf0ed4e1941ad7c281afc41df7bbd))
* **casparcg:** use 25 as channel framerate ([6463ffc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6463ffcb875882e22edad0ede620346b9054cf59))
* **casparcg:** use frames not fields ([9a2306c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9a2306c7a5f7353f062295dae989da8836ad6527))
* cast underscore variable to any ([1a10af9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1a10af9b59a19dc13a0c16e7c17e39459f311c11))
* cast underscore variable to any ([3ae249c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3ae249c5f80e45f39265151970a96bb25473c99b))
* catch some quantel releasePort errors ([#199](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/199)) ([10007c2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/10007c2bd52caed401fcf576cfc03b8a9031914f))
* ccg-con potentially not initiated. ([d1ea910](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d1ea9107c82ca0ac6ec062b159c8ed7ed2134287))
* **ccg:** Update deps and fix tests ([33be86d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33be86dc38a0cf7b778ea9ddd83154f6e46ea7d6))
* change id of singular device, to make way for upcoming vizMSE device ([5c0c8c9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5c0c8c99b681b109d7ab939c0099d32441d81b83))
* change language and logics of determining wether an element should be loaded or not ([bb8a095](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bb8a0959855b9bdf194acb1f0c2ff655a1edf993))
* change MappingPanasonicPtzType to a traditional enum ([69e8a95](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/69e8a95484a8dfa9ddd2c4d67205c49f232746fc))
* change some emits to debug instead of info ([b84342c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b84342c8308c766fd2bb37070b75125101a8abb8))
* change the clone clip logic ([402fe51](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/402fe513a08dc493c3d59b2716208b7aa5d324a3))
* change VIZMSE console.log into emit('debug' ([7100157](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7100157f794c1e2bb6f3dde1730d5e462f3e7507))
* changed interface to not reference channels directly in tl-objects, instead reference mapped layers ([ece1601](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ece1601208791a3720d12784c4a925405cc76a7d))
* changes pulled in from /develop ([33ca1cc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33ca1cc4ad638076340aa137297ac9de51511274))
* channel format enum values ([#138](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/138)) ([45887d4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/45887d40308ca301432ef2238cae6bb91780ded9))
* Channel visibility ([7a52612](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7a52612630e640ad43a7ad9eb4f6a935b361e418))
* Check for existing input ([3228afc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3228afcf7d21e0ca1a5b08c2d4763370ab1160ad))
* Check if retry is disabled ([eac0e3e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/eac0e3efc0163df298391ace0ddb8f06366ad7d6))
* circleci ([312270a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/312270a0e6b26e8f39c54c82ac2c1e88fe1634cb))
* clean up queued callbacks properly ([495b8f4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/495b8f45bfbec3afe569c3fb35eff1b5ec0f6024))
* Clear keepalive timeout on dispose ([ce8da47](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ce8da47a3556115b6f952a7c73d8e6165229703e))
* Command assignment ([0630a10](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0630a10a1ea7dfd79f1ea26f5e8651bcb5dd5e95))
* command execution queue ([64cc4a8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/64cc4a860aff2a058d0209811822b4c42d89be97))
* conductor using different import paths ([9f63046](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9f63046cea2fdc353dff40bb7b538eb6fd4dc12d))
* connected status of lawo device ([a9edf59](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a9edf59a77ad7e2b449750a595378fd5f3a1fec5))
* connection and status ([36d977c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/36d977c76628711dcad08bfa5a12280a80728dc9))
* correct quantel API ([5b8023e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5b8023e830d56db9d671e300afa719699ba27e65))
* correct test file structure ([c72698e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c72698e955f55ad9425511cd65f38c6acc71ecfb))
* corrected return type of loadPort and changed calculation of portOutPoint ([e54b74d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e54b74d865206fe79f62be578ffd331dcb9bc61a))
* cunductor: better handling of when future is clear ([471d905](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/471d9055c64635c60f801482b412ffea2ad5d2af))
* decrease hyperdeck ping for faster connection status ([ab24d55](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ab24d559f5bf971281684ae50d4de41817f45d52))
* decrease hyperdeck ping for faster connection status ([fb151e9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fb151e91fde8654de0489b5f480198325b401de6))
* default casparcg.retryInterval to disabled ([60931c7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/60931c7dffaff826a9498d6a25938ebc8384e858))
* defer and group toghether timelineCallbacks, to avoid sending "stopped" directly followed by "started" events. ([7f7ce04](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7f7ce044724b8a76e5cdeac8c54a9b8535c3174e))
* deprecate .VIDEO & .AUDIO in favor for .MEDIA ([898ba8c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/898ba8c7c3120a82b32ffe25424230855373c372))
* Device: clean up old saved states ([0115c9a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0115c9ab30379d1d250450e2560eb4cb12e1aac6))
* disable casparcg retry for negative values ([dc0e2ae](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dc0e2aecd5a8142c1a0bfbda80ed8988d3bb2f3c))
* disable ts-jest diagnostics ([967e0ff](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/967e0ff8a81ab760f62b2b8d9d68c24c94ca1402))
* disable ts-jest diagnostics ([96dc1d1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/96dc1d1c91a2ca3b9a468f9bcdcfead9ad422035))
* disconnect hyperdeck-connection before termination ([e6bd395](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e6bd3954d92729ce960669a0b31ae71590488775))
* dispose of atem properly ([46a9055](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/46a9055dea0893191806936793843ec62b2a8b16))
* Dispose vMix connection ([7c608fe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7c608feb260897e9fd54256e288a9293cd69a1ab))
* Disposing vMix connection ([c567651](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c56765116858417a3c1bba39fd83aaeb8522fcbb))
* do not clear elements and engines when going rehearsal<->active ([b3eca72](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b3eca72a303f0749fc0c09c468b05b6032574ded))
* do not clear elements and engines when going rehearsal<->active ([09bf843](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/09bf84332eaab4ded856772f53ff0323df123b78))
* do not purge baseline items ([904e165](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/904e165b15f6bcabe38eddd060db0f86a85d8a87))
* do not purge baseline items ([0fe088d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0fe088d02330b289de97874ed92eba7b335b12ae))
* do not purge elements when going active<->rehearsal ([a8a14d9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a8a14d9ce06651ad98f13e9d63b2d09e3f3f1bf4))
* do not purge elements when going active<->rehearsal ([587b795](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/587b7953b258245b771aa611576affc10f82e77a))
* do not remove unknown vmix sources ([c6a262b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c6a262baff1318701c1f494175918b49ca058fa5))
* do not retry resume commands ([1b9bfab](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1b9bfab31131c53dd74e65743ac3b6cc7fb80bca))
* do not send unnecessary lawo commands ([91cf76a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/91cf76a4723dff5c8ae18ae3fa8a5603046bfd07))
* don't create device which already exists ([b00edf3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b00edf3e780fc191a1752383e9eae32531c81d44))
* Don't delay takes before pilot-out ([a38fe0a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a38fe0ab96916b844ed9e2f6762249077b9d267b))
* don't delete property which is not optional ([5617750](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/561775063cdadebdee82940d5ea2a8af50be177e))
* don't emit resolveTimeline when not active ([f37f79b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f37f79b851164e042991a49a2f73add445075918))
* don't ignore purge error, but emit it ([a5d0c25](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a5d0c256fb0c1ee8fe5697dc5530c91f6427bef4))
* don't re-emit info, warnings or errors from devices, let the library consumer handle that. ([40048d2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/40048d245e37a705519427abb130ccdf1d425b0b))
* don't reset caspar states if it's not okToDestroyStuff ([1d5e19a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1d5e19afb8235a6ccbb17efaad2fa28bad68058a))
* don't run out transition when changing clip in preview ([a10da77](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a10da77cc0a949908206011b4d7d4b4354e6a13d))
* don't send timeline state to the abstract devices when in production. ([c6b98cf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c6b98cf50ea68029a7f08d3bdfab968053763ca8))
* don't try to load elements that doesn't have a templateName set ([6a36bed](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6a36bed94f9fdd3a9e7b31259b5e33d52a59b229))
* don't update elements after first connect an extra time ([cc5ffc8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cc5ffc8d1bd6fd63892e9b023a1f1233246c25be))
* don't use the AsyncResolver for just getting the state ([4b3711e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4b3711e030a3fb0c30122965ff00c55d5bd10020))
* doOnTime bug fix ([dbcfa5b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dbcfa5b6ddd8f5382ab412dff81ac30a051ecbd1))
* elements to keep criteria ([2352aa2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2352aa2759f6e25abab93063313859ba2ce6cb85))
* elements to keep criteria ([3146254](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3146254dacb22031124c10da33ee6b989f28773f))
* emit deviceId with device debug message ([ba6ae95](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ba6ae9587bae1c6812cea9e1f9ffd4c7f39b8363))
* emit error messages ([33df055](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33df0551b90b4f81b59da7e52677ee2f86bb74eb))
* emit errors in atem-connection ([642cebd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/642cebdceb6b12bb7e9db0bfe5548eafe3bebc0f))
* emit like debug, not an error ([bd20189](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bd2018965b202a21232eb3b8ab95fe2516e3a885))
* emitting of 'debug' events should only be done if the debug property is truthy. ([5d015a1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5d015a1dfde3ffc86f9aea9366bf72f76537d9a4))
* empty string in audio buses ([59e173d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/59e173d7fc421e69fbc1c621be414962d9e8d904))
* error handling ([371db3a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/371db3a5906cd11d279bb95f8c8b747e09ce695e))
* errors caught not casted before usage threw TS compiler errors ([167be0e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/167be0e3e484f7a4cd27adc04325a0cf94ebf323))
* Errors from cherry pick ([4754a67](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4754a67e8dd38c081b91f07c5749b0e268cf9180))
* escape template data ([ac7efc6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ac7efc65696f9b8a6db1f344c157ca4298e54690))
* estimateResolveTime was unused due to avoiding any resolves for times in the past ([a497d6b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a497d6b8d278dde22e698027967720329e060a7b))
* estimateResolveTime was unused due to avoiding any resolves for times in the past ([2f89140](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2f89140398cd7425cb46e11abc3d91d45e6ec401))
* event listeners must not return anything ([cb2fe13](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cb2fe13c965bc3f8e221c1db08e970b454e92f69))
* Every TSR device now stores a random instanceId, to be used in logging/troubleshooting ([bb6e607](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bb6e607da8f13fa88c80f738ef7a12af10e5f80d))
* Every TSR device now stores its start time (for uptime calculation) ([e065c09](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e065c09f91cf6b994c1978094f2ec02aad6a05f8))
* exceptions and timeouts ([937a821](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/937a821f2dd5dd6fd82c2fe94bcc3d980347177d))
* exceptions and timeouts ([6cb01ad](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6cb01ad5fc738a1bc6d97fc5718c95d1ecb73e2d))
* export all typings, not just a selection. This allows for consumers to only have to import TSR-types additionally, when importing TSR ([8ee6ec6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8ee6ec6b14f2f32a0ee91e7e288015a276d7af59))
* expose vizMSEDevice ([43813b9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/43813b9266d2d83037d97ebadd24d16598954935))
* extend templateData when allowing multiple mappings to reference 1 casparcg layer ([eb04832](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/eb0483201f7d368bcadadfa5c6837c3f1c4c2903))
* extend templateData when allowing multiple mappings to reference 1 casparcg layer ([6656ced](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6656ceda6f8f3a86e3976128c7f704e93f557001))
* failing ci build ([cdd0f52](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cdd0f528da7258b5c1da3d6d069c9f1e3c27ceec))
* failing tests ([d521ea4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d521ea4c3550b8f817c2495e54f37c4c1851d37b))
* Falsey vs undefined checks ([1df0175](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1df0175c61606fbd54551eaced9a00fe6803ffa7))
* falsy preset number (0) did not execute ([40f2b00](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/40f2b00aa9248788f6c16ff3892278b568331466))
* filtering expected items for rundown playlist ([7e608b6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7e608b68d19336d150539e6859070d44f71e7e38))
* Fix atem make-ready debug log parsing in kibana ([9fb09d5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9fb09d5954ee162f8e708e38e2dd9a01093fd142))
* Fix atem make-ready debug log parsing in kibana ([9880672](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/98806727c23f8d90834baa5ac81ed16e4f8e93f7))
* fix issue with typings library, causing it to not be importable by consumers ([8b2452e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8b2452ede01015dfac4b7371c90212d71eb2b7af))
* fix release doc generation ([d4ef735](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d4ef735c7a4a2133f7f8ee70fb2fe058df20403b))
* fix tests after timeline dep update ([7c793ef](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7c793ef6e6e397d6493020e54be5b3eb298c927f))
* fix typings issue in singularLive device ([fb93a74](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fb93a74708e2755fefd2e6145b2d5f17ac5b0914))
* fix Zoom Control command template ([53966f8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/53966f8b61114bc0f1bf747cb4f5d0bf4d23ab22))
* fixed error emits ([68833ec](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/68833ecb95e6158d29a5c747cd70470e5c5240ad))
* fixes in all devices status reporting. Especially: when not initialized, status should not be GOOD. ([fb625a9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fb625a999f630f38c10fc3871bd2c05d12fa6e5c))
* fixes to make resolving work asynchronously ([514c7f4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/514c7f4623ab69b468292721dd81813113c65980))
* Guard against callback resolving time of 0 ([bbc04b6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bbc04b6988f84b9ab01532a84d4d7af73706482e))
* Guard against object being undefined ([d96d398](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d96d3987356b327a3868d860210fe9f0ce0c047c))
* Guard against undefined ([2535c3b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2535c3b9d2ba323ae2092f915292736bde29c919))
* hack/test: be able to do a second activate of the rundown on LoadAllElements, to hopefully load all internal elements also. ([b6a40ec](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b6a40ec8147d8106393ac9e9ad2b80619e341722))
* handle non-decript looping casparcg-video ([b23a8a8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b23a8a8be4366fd44ba57d26f5e22272cc82eb7d))
* handle promise appropriately ([8891d65](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8891d65bb0c7502fd0377e390341a8444a2dfe2d))
* handle simultaneous lookahead with playing clip ([9dcc3e1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9dcc3e1dea0202e106a53848a301c39c70e0da07))
* handle simultaneous lookahead with playing clip ([e8fcff3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e8fcff3b85d3fe1ff1019c5ea9b67261317e973a))
* handle unknown http-send type more gracefully ([fb88725](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fb88725acfac00d42d87cc544a5a82a338ab7e9c))
* Homogenized the headline with the other Sofie repos ([8325f53](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8325f533f054f25acd317654f82ed345645f5b60))
* hotfix quantel-gateway-client dep update [release] ([5b55012](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5b550120d9bac1c55608a1104432a5b5760190c8))
* hotfix quantel-gateway-client dep update [release] ([b38bcdd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b38bcddf9d7991dee10456009df82d2215609982))
* **http:** add makeReadyDoesReset property ([b2e2ad5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b2e2ad5f8c699ea847fefef2b440292e421e9e0c))
* **http:** Sort commands by llayer before queueing to make execution order deterministic ([a93fdc1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a93fdc17a632fd5bfb731b896ac8fcfc7dbae654))
* **httpWatcher:** add missing terminate method, add private _setStatus method, report error/reason as status message instead of emitting error event ([35f7ba4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/35f7ba49082e0f271e16da0b53de6d9f9f3ec394))
* **httpwatcher:** changed options.interval from seconds to ms, to match other settings ([ebc9e3a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ebc9e3a6c8cda73f8c46ab730c2d741d988ab6a7))
* **httpWatcher:** stronger typings for options.httpMethod ([549162b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/549162b9de112f31404f639670a7aeda371af059))
* hyperdeck: not conencted status message ([d88530b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d88530bbe0760f75f308134e49bb03b8d7222f70))
* **HyperDeck:** format every slot (not just current) ([307103b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/307103b74d2e264aedd366cc5a6a3651270eb6e4))
* **HyperDeck:** improved status reporting ([95587d7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/95587d7a2ca06b80caf0ca53383ee5e9683b4d87))
* **hyperdeck:** support pre 6.0 firmware ([0ab52cc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0ab52cc825a5e7ac3699e086ed756df5b32c2b41))
* **hyperdeck:** Update for api changes ([90d2bd0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/90d2bd0c75a8a5903ffffc076ad5bac20455f52e))
* if, for some unknown reason, the quantel device doesn't start playing; retry a couple of times ([7fb8a4e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7fb8a4e90ac42b5c877bce0ab9aeb26af40c6f27))
* ignore error "Cannot purge an active profile" ([5c8f3cf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5c8f3cf47dd3df693a9b9f6e3d45446c19d5f0c4))
* ignore FaderMotor errors ([5bf6146](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5bf61460b9a529aec512ff8a1708f43f3bedb0d1))
* implement all audio properties ([f78b00e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f78b00ee8a17451a9b0eba9d14e641db69f1e8c2))
* implement for tcpSend and fix tests ([5a070e1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5a070e1404c3065735ba5b43e2857154192240f3))
* Import paths ([82bd382](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/82bd38294af23ec919cdf9b48bd14f819cf09630))
* import types ([7d05864](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7d058649c576127eeb6c171241ee7d511b6463b3))
* improve input & transition props typings [publish] ([6044ac5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6044ac559e43ddeb990b91e94cae25c6e9406329))
* improve lawo command logging ([91859cd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/91859cd5b3985e9ed42277e8ffb7c19d7a428cc6))
* improve PTZ logging ([4f41c53](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4f41c53f12ff991bda5ee5b880fccfe936268acc))
* improve robustness ([6296d8c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6296d8c01195739b2f1022980de486c7448eb348))
* Improve size calculation of the timeline, in order to get a better estimatedResolveTime. ([2963a93](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2963a93769c5eed2a167b8195fc779de3811fc4c))
* improve timeout logging ([595e076](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/595e0766d912a1b875a0a5228a7318de8efe88c7))
* increase he jump error margin to 10 frames, giving us a little more leeway in case of delayed execution ([5f52352](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5f523521d7ad1f3fc43a558d96c9a70ff66c874c))
* increase the estimateResolveTime values, to reflect measured performance ([1cba2f6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1cba2f664f4d622c44d56a6c6dae9fbb1849117e))
* Input numbering ([99b856c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/99b856c575f68e71d901b230bb74f15c991068c4))
* inverted logic ([64ae293](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/64ae293f9313e21635984d1a4b663d29418eb437))
* issue with wrongly accusation of unhandling of a Promise. (I most certainly was not!) ([05eee7d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/05eee7d6c5f3fdd5242500847066b25de5236210))
* keep checking status of loaded elements ([c6d6f53](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c6d6f5309447023fa367eee5eec893d25b7fb06a))
* keep checking status of loaded elements ([3085502](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/30855020b5b93ea10591fea2f45810a438966ba8))
* keyframes for atem devices ([029fd11](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/029fd114861b7492b0e75c07fb7b2edababed46f))
* lawo result 6 mitigation ([7ad7f53](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7ad7f536ac5c09d87b6e0498ba7be1b36d429a18))
* Lawo: Typings issue, getElementByPath can return undefined. ([3846f3e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3846f3ec6b3c98eb0ac7b3dec9d398b74685d7c3))
* **lawo:** append value to integers for setValue ([926073e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/926073edc67f0b118869829e84a454ebbe8150fc))
* **lawo:** check for errors by searching array ([6edbe4f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6edbe4fa05acd5d27ae809ec9b2ee220d9ebbe83))
* **Lawo:** Handling error emitted by emberplus ([efae206](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/efae206b84e1c4ed968d7f9c60d720b5bab229c1))
* **lawo:** log when a direct setValue is done after result 6 ([91f535e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/91f535e5a22752a3d91447c29a8c224abe2490b4))
* **lawo:** new tlObj structure uses faderValue ([9c143ed](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9c143edfa8b7a535af89dc900ef11b44e9f7c60f))
* **lawo:** prevent conflicting setValue after result 6 ([b615121](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b615121310d391f80e698a5159042c61dedd2824))
* **lawo:** type checks in setValue for command and explicit type ([07a959a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/07a959afdfd664a559cda588a7ad86afd0b7620f))
* linter errors ([cd9403f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cd9403f57ed2893a4615f9b6d88eb721b5946d0e))
* Linter errors ([27dc142](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/27dc142df32b1db0377b6ba35bae8a8db5d58817))
* load after play ([f281e47](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f281e47bb57e5b9eef0883b1f95162a3d6343b9e))
* load only elements from the active playlist when restarting ([fee2962](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fee29626071c81e9daf8848933091d5a4ef5e98e))
* load only elements from the active playlist when restarting ([7d21e69](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7d21e69dbfc959fee871746d83f9cfa1dade9b2d))
* loadbg is done from state, no longer in tsr ([fd0dfe0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fd0dfe0119fce1cb7cdc2dbd1735c1c925ef6c02))
* log lawo commands being sent ([3114c31](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3114c3151b537e807f278804629f009e5c099ad6))
* lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
* make -1 disable caspar retry ([8069aaa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8069aaaab456dcaf9eb2533caf3670b3a32ee736))
* make estimateResolveTime opt-in ([fc3f30b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fc3f30b1e30c4f4f6b3a95986c17f917ce17725d))
* make makeReady execute faster ([16bd275](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/16bd2755db4e520b75e7a0866f0a4bac5bd5007b))
* make makeReady execute faster ([913bcfc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/913bcfcdd876fd85bdecf3855a6589f6d7b56fba))
* Make PLAY_INPUT the last command ([081a2ea](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/081a2eaf805a7c78712423e365dc8dc5177f9ed9))
* make quantel use 25 fps (50i) by default ([549cbca](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/549cbcafd0bbd04302392de4186ec1fb0bc2f94a))
* make quantel-gw emit ell commands, for debugging ([befcd80](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/befcd80050a312711f0582e16f764dce8769150d))
* memory leak due to atem state not having state.time ([7d27173](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7d271736250fab7570972a3dd2eda7f9a65a9c4b))
* minor bug ([41d6599](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/41d65996fb7403806a3111447f5566484005b2ba))
* Missing dependency for types package ([da6bc82](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/da6bc828f2838db71e777b011ad5728ee641dc91))
* missing optional chaining ([7a9b97e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7a9b97efaf334b9df7a001b23639df22a7aae214))
* missing optional chaining ([11862a9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/11862a95d5ee9caed0ec19f5abae7769eab17863))
* more tests ([031bbd1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/031bbd1945ac47d3636744c4e6cd3bd302617dc4))
* Move DeviceOptions interface to types package ([ac300eb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ac300eba702210ac93cb4e76c14c7bcaaa513bd3))
* move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
* MSE crashes if we try to take an element which doesn't exist. Try to prevent that by checking before take:in ([604ab64](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/604ab64caa7e44a9aa6ccee7fb61a9a46547c440))
* negated negation ([033ea4c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/033ea4c7e86a70d4588f4c2ab09b5155e25ba237))
* negating negation ([bbcba5b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bbcba5baf0bc0bb1ef014a6312665f5f45230df8))
* nicer looking logs ([33cbda4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33cbda45e32016a87d80c4ad661fd1011ea2b0c1))
* node12 typings ([49dfaba](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/49dfaba59af8c4b9c9c87d4e5777859a1836d2ef))
* node8 [publish] ([96d0410](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/96d041079576a38fca926437d26362bdba1e96bb))
* NodeJS.Timer ([d96b400](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d96b400486697e6dfa256bbae46e4a4d45aa6652))
* **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))
* **OBS:** incompatible/outdated OBS DeviceOptions topology ([c83cd7b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c83cd7bde54a18f4f54dcd6ae900cd36c4f683c8))
* obtaining initial state of the device ([63c2950](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/63c2950bed9ab0b789a0231d376a3ce7fe45f540))
* Only copy delay to internal elements ([15e9471](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/15e94712342905b9fa5a5e1797da82dc4f57baff))
* only iterate mappings belonging to this device. ignore casparcg mappings with an invalid channel ([49646a4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/49646a44d0ec584df93e04bd4c1fe2044f204d06))
* only preload if rundown is active ([a5d321d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a5d321de47a4bc575b99c97afd8e5e17aa6db226))
* only retry http commands for network failures ([dd28e4c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dd28e4c816e0130e5c8185b9a4780789fffc3814))
* Only set sisyfos channel name if setLabelToLayerName is set ([0439419](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/043941953b06f26dc3fd861aecbb290b31a7a36b))
* Only switch input if input is not already active ([c9c63cc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c9c63cce2091cd011ca9e57c2b0681f2102662c9))
* OSC Device Status is bad when disconnected ([8a8dd9a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8a8dd9aba726476648b279beaf79e529e508ac2e))
* osc device status only for tcp ([234e83a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/234e83a129e22da37222c4076ac4ad8102f9d1da))
* osc: fix timelineObj content type so that fromTlObject isn't in there ([6b300a0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6b300a06b2b4fad9eefa5064d34512bbcc6d8ca7))
* Overlay ([34b1f0b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/34b1f0be0fa64649bb5c7a50e9de11f2b16aae49))
* Overlays ([d1676f7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d1676f73dc0881b1dbfe8f6393ff0298c5b46349))
* **Panasonic PTZ:** disconnection should not give errors ([ecea5c6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ecea5c60dce6f6f473c757b4f9c90f79046172c0))
* **Panasonic PTZ:** make all settings optional ([53124c3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/53124c3715d5930d038098b3d43716e794f254bc))
* **Panasonic PTZ:** optional port was not optional ([ce5a322](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ce5a322bb56b6f31a31c6afad480c5dfd730bed2))
* PanasonicPTZ types ([b2af5c3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b2af5c39213005db215cf4ba2e3a2c8dbd4910aa))
* PanasonicPTZ typing ([c6dfbe3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c6dfbe32e35b95f9d04fcb1eb1844053f7670121))
* panasonicPTZ: refactoring dispose functions & proper error emits ([a0cc49f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a0cc49fb19b09022d01aa8096ee78a41fe50857d))
* Pass context to ATEM custom command function ([70b71d1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/70b71d19b580622395ac77cc3c499f77e452eff4))
* Pharos started reconnecting infinitely if connection failed. (this is NOT tested yet) ([91ff721](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/91ff7212d25620a08e15b475a7d8ded3e8215500))
* play and switch after all parameters are set ([4c73be4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4c73be46330dc37be717e8a389cbe55b22c7e04b))
* possible bug when throwing error, that might cause resolving to halt ([e1cb023](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e1cb0236c3014c964eb363c8523e3c738fbc4ca2))
* preliminary implementation of handling quantel-gateway-not-connected-to-ISA situation ([28b4836](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/28b48364bcae1e983c6803a1ce03497a4bc4d7b5))
* preliminary workaround, to give the quantel another chance to get going at startup ([fe25898](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fe25898a7c43aa42e283fc47771d9f97033b966d))
* prerelease workflow not setting version correctly ([4f4fced](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4f4fcedebc742e2fd279f137e6e43fd6d74cd6fd))
* prevent casparcg from stopping init upon slow time command ([d996c33](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d996c335cd3ee72ccb2f5e6d5a0412379c644b3c))
* prevent duplicate external elements ([ca5fe2d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ca5fe2df430f8705216daa5c8fc10577010c43a8))
* prevent duplicate external elements ([6472eaf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6472eaf267dc45fe423b7cd3d3fa0d5ba109cf5e))
* prevent unnecessary hyperdeck status updates ([7f1f6de](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7f1f6de99d6da810f1335dc31a01a541c342d079))
* Preview mapping ([9aa4e32](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9aa4e32e412309193663a124aa89d5520ee37039))
* Program by name ([3bbc982](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3bbc982b8da7f64278bdb39025060899805ced71))
* publish script failing to get package name - hardcoding instead ([3371abf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3371abff516c8f3e2416ac8c30e60c5b674f5b06))
* publish script looking at wrong version number ([b991f88](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b991f88208925f7bd310afac68372ce0af847792))
* purge rundown on activate ([14d282a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/14d282afafb6ca666009e16cce32924e86250822))
* quantel prioritize clips ([d98626f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d98626f6c5a56cb8e3d19841fd8a18cdf1e533bc))
* quantel prioritize clips; add check for placeholder clip, and improve copying of clips. ([850b2e4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/850b2e4f3c489fad9e7ab7460b250cf920f50605))
* quantel typings exports missing ([6e852ee](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6e852ee1ef411cd7f1bd72b3e87dc734fc3461dc))
* quantel: a try to get the quantel player to behave nicely when jumping to a new clip ([424f1f7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/424f1f7e4e9b5b15fb63c584dd9a7544bfee4aa1))
* quantel: add missing tracking of jumpOfffset. When a jump is triggered, the jumpOffset is cleared ([82a481d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/82a481dc07bb53b8761e3204651c338499ec36f6))
* quantel: don't send jumps twice (first was after fragment load, second before playing) ([4dbe824](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4dbe824ab860e799b3575e3700b30dd6e2153426))
* quantel: don't try to execute preparations in the past, the present should be sufficient ([9b636f3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9b636f3ccd0f6a42cf8e231d78477019b160b470))
* quantel: handle when quantelGateway hasn't connected yet (or has been restarted) ([c39b57a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c39b57a2fcd0a9dc9500ede0a67d66642bfbaca1))
* quantel: If the loading of fragments fail, retry the fragments reloading ([1428929](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/142892921953245e6e72bd062fa69eee68711882))
* quantel: kill path ([0d3999e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0d3999e093a931dc3eb5c193ca1fc6fcd01cd0ff))
* quantel: make lookahead clips not care about seeking ([6f39b9e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6f39b9eb74b33daf14c09058f22dd45cf07263ee))
* quantel: make the wait times longer when trying to recover from a play failure ([62274c2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/62274c2647864735c5c7063bac4e575f7d8e8b7a))
* quantel: only use videoFragments when calculating last frame of clip. Also son't use trackNum < 0 because it is historic data (not used for automation), 0 is the normal, playable video track, > 0 are extra channels, such as keys ([44ce171](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/44ce1715022094b226dc5350e1a154f7d7e89fa9))
* Quantel: set all lookahead objects as notOnAir ([be96d3c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/be96d3c9f959ec8e13ffa333eef094f61f01c16e))
* quantel: skip jumping and go straight to play, if the jump is small enough ([9071df4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9071df4ed00c97c0dad8db2e790962366d2865be))
* quantel: tests ([e05387e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e05387ebaf294697c57c4ba4ddb43f19ef4636a0))
* quantel: try/catch block didn't catch as intended ([9e91e8a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9e91e8a818cc696f7470e55eaf4be26906464f15))
* quantel: typo in warning emit on recovery operation. also add emit debugging info ([3745177](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3745177db8a48eb3be6fd127d8b3671950fc9d3a))
* quantel: unable to assign channel 0 ([48efdb2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/48efdb2fe37934032093c5c4546c09733b075024))
* Quantel:better ordering of commands at creation ([722c758](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/722c758616371300c65a9f8839911a9fde0c1c58))
* **quantel:** better handling of in/out points ([28fefee](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/28fefee903f7c96b728ee92a8f024e480ee88e83))
* **quantel:** bugfix: stop at correct frame ([04be540](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/04be540f67d796d7b18eb3108cbd970fe954d9b4))
* **quantel:** catch error on missing ISA after restart ([#135](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/135)) ([e1f7979](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e1f79797d366dada142138d6803d01ffa3b03726))
* **quantel:** check input options ([76813b3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/76813b380f93f6363aa135bc5b09294674e696c7))
* **quantel:** handle error responses ([fc8a94f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fc8a94fb2a419a0cce2baa34083090228b5551b4))
* **quantel:** remove command-queueing, this will be handled in quantel-gateway instead ([d43a192](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d43a1922978e5f76f135734cf38a68b09397d8d0))
* re-add programInput ([2af1239](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2af123950937e4ba3068c63f55bfe71723ce71fb))
* re-add programInput ([b4a644f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b4a644fd24823af8903fdfab4a5bd28743bca20d))
* re-introduce many tests ([33a721d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33a721d5cc6074dbb3aa5928b7587fe4ecd8c281))
* recreate removed mediaObjects after reconnecting ([fcda605](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fcda6058adb98793fda79b028b14c23b4f19d2d6))
* recreate removed mediaObjects after reconnecting ([1a7e65d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1a7e65d0a3b5a0942f2f06deb7b58366d2827802))
* reduce logging amount by only emitting some logs when active ([9af530b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9af530bb55f09359be3cf7b50b427412986c1cc6))
* refactor and fix: unify types & interfaces of all devices. ([e990811](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e990811617a8798c77be8c1415e4d4daf53ed008))
* refactor Device.getCurrentTime, so the internal call to it stays internal (and not send between processes in multithreaded mode) ([4ed8c85](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4ed8c853ddecff2e26957a13bfa2f7f2bb91a7d3))
* refactor log messages ([2f7684e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2f7684e1b87da217afd924add996a357e589406b))
* refactor tests ([f251f69](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f251f690f814bba3f379d98c02fae0e842dc8287))
* rehearsal<->active when gateway was restarted ([595fbce](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/595fbceb4aaf65f9d444e70b592dbf791fe202df))
* rehearsal<->active when gateway was restarted ([3c40715](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3c40715210230e1c864f92d9e814f05b2e2c0a42))
* reload external elements that became unloaded ([9ee8423](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9ee8423a03fa98205407e6efe0cbd9de5595662c))
* reload external elements that became unloaded ([93bf3aa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/93bf3aad6fbc53d2391e6a1eec013548cac27634))
* Removal order and change on layer ([9e67fbe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9e67fbe834fe8b2b33938ab1758f06e4ef522b86))
* remove debugger ([477617a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/477617aeb95ab039983f75d08220670190f2d287))
* remove deprecated time sync ([84ab05d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/84ab05dce72acdac824224758289b03d309308e5))
* remove duplicates in incoming data ([bf0ca04](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bf0ca0434c768a60e0508db3a62c3c909fe2d0fc))
* remove duplicates in incoming data ([e86f170](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e86f170cd6753025347a42f4685716837543b089))
* Remove ExpectedPlayoutItemContentBase from tsr-types [publish] ([cd92561](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cd92561a02e58f02d5c97351cc67934f77ecb5fb))
* Remove ExpectedPlayoutItemContentBase from tsr-types [publish] ([a478e01](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a478e019238cec51a002c53e8c537b4cafde5890))
* Remove listeners to prevent memory leak ([3ec3d9f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3ec3d9ff5f2b7188d8f9d9f3459f1995cf64c7c7))
* Remove listeners to prevent memory leak ([d0df778](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d0df778651256c4811ec39521285f3a28521bbc0))
* remove Media content type ([f4bd6cb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f4bd6cbaa14c1da93ae844e35652c3b2e31299f3))
* remove redundant expression ([2e1651f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2e1651f297d68cd6689508a07a602b24620a7c40))
* remove redundant log lines ([216a3f5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/216a3f57c808b86d7e4d5a749dc7a4a2317070f4))
* remove request-promise and refactor ([bc0c520](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bc0c520304ecb1f9c84826992da17cb2b18b8ad3))
* remove unimplemented interface ([f6b6b52](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f6b6b52546e24405c9a2651f1e2da9cd6caec305))
* remove unneccesary tracing of normal behaviour ([ed05c09](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ed05c095daf50ecf4a0205bfad1ed8231f4436f7))
* remove unnecessary comparisons ([33a5903](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33a5903b2ad8750148261797ba628f77941778c9))
* remove unused quantel seek property ([9b8f045](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9b8f045b4ce1bb4eddaabab0d4536d9bada82a3c))
* removed deprecated externalLog ([e356271](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e35627102f356da12d9be32bb709e6c455a60a12))
* removed types export (consumers should depend on the types package instead) ([8b31e6a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8b31e6ac9dc30f3ba7c9646d47e56bcd20db5079))
* removes unused code in ember onConnected ([21ce669](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/21ce6697dfa7fc103f571e9c72d85cd418ed71b3))
* Reorder audio on/off commands ([660ba26](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/660ba26ab01508f725bda075bd303c6e279968c8))
* report channel name instead of engine name ([f65214f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f65214ff64b387ac151df2521fec9b1ab87ce5df))
* report channel name instead of engine name ([24387d5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/24387d59e9f2f329dcb4fdd2739288cb190e245e))
* Reset atem state as part of makeReady ([1b44a5e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1b44a5e9b1426992818689fcaae36acf3ae9c931))
* reset cached states after resolveTimeline has finished ([3237798](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3237798a526c7434a26b19b98f15b6adc7b05fe4))
* reset the resolver upon reconnection with Atem ([500f884](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/500f884c87af6d3708c66c3491385744631c453f))
* Retry if retryInterval >=0 ([3616a03](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3616a03dd0b138414845b02c5553fac26342e3d9))
* Retry logic, command filters ([f46603c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f46603c930380e573b5d4130b8698e6201786223))
* Retry to initialize the rundown ([aeb1c8e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/aeb1c8e96f3f48173b8a37467fc20c2448f24a0a))
* Retry to initialize the rundown ([583e32e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/583e32e4cb3eb5a7b46d9b4a460c13471ef0445d))
* revert dependency update of typescript, which caused lots of strange linting errors ([e91f4a3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e91f4a3f72ff65236d6001a9127d8b36000bda5f))
* revert the getCurrentTime fix, so it's not a promise again. ([2d74fca](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2d74fca228d2ef99755113b553abafcd2152a17d))
* revert timeline dep, as it caused issues on air. ([71da109](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/71da1092ac99bccc9f947ce7f1c1ee445b83fcff))
* revert timeline dep, as it caused issues on air. ([49ba0fc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/49ba0fc065a810b02d07712202599d566844154f))
* route atem connection logging through logging system ([81ef70c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/81ef70c0b115ffaa6d7d60648980adb3b7890851))
* Send multiple transitions of the same type ([a2e47b8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a2e47b8e4b1f28ec29c5dd45b964bcfdc3b80456))
* Set fader label ([9d2ac05](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9d2ac05df4373ff116426beaa1c3bfc029b59204))
* Set fader label ([78a3ecd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/78a3ecd9c423a6866d7c7218acb368d61044ecd0))
* set interface to stricter typings ([5115f8e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5115f8eb52117d7719d24b93f10d3ea0a7bc73f0))
* set maxWorkers for jest ([8ee4e33](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8ee4e33b00dd2ba9f73c55af8d939c3c7ce46cbd))
* set maxWorkers for jest ([194c562](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/194c562c3f31ebce91d5c92e9bd43b61c713ec3b))
* set minimum interval to 1 second + 'URI not set' warning ([340d95b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/340d95be540437d0d3daa7387a7ea52dd12d571c))
* set the instanceName of multithreaded instances, to help during debugging ([17f6779](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/17f6779f37fe182005f7c69b53e472e87cc403f7))
* set timecode upon reconnection ([e084a74](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e084a7411436af3bb2c9e783e13ca7884f80d07f))
* Sisyfos labels when label is undefined / previously unknown ([0e1f6fc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0e1f6fc673f52832c5d83ccdf09db9d537794bbc))
* Sisyfos protocol - remote local ip and port ([edb59d9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/edb59d9113dc07568c8f81bd43a3a0d4e1b0d3ee))
* Sisyfos state recieves showChannel not showFader ([9dd5cfe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9dd5cfe43c541313fe9ea4d5e9e5e9ff30e553af))
* Sisyfos tests ([1d7debb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1d7debbdcddba3a42eebf37ebb9c87a67ac11354))
* sisyfos: fix when mapping.channel === 0 ([7e9b77e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7e9b77e7fce5bdb17b2b282918d826c50b68ba51))
* SisyfosAPI.ts added localport and ip (hardcoded 5255) ([8534a66](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8534a66e936ba9d05540b517248bf75caa67cf36))
* **sisyfos:** comply with automation protocol ([b9ba380](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b9ba3803ec6a834c386311f980f1ceddf42efb2b))
* **sisyfos:** do not accept state before initialization ([6ab3dda](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6ab3dda44c83bbb2da1eafa83108b17343e39c81))
* **sisyfos:** remove groups ([c9f9e33](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c9f9e33eb546f3cf8b5566ccfd9aaa11d8395338))
* **sisyfos:** rename select to isPgm ([52d3b11](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/52d3b1173c617c0068205ae3ab95668df4b0c216))
* **sisyfos:** retrigger only channels that are mapped in Sofie ([d17a0b1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d17a0b1af4510d8e5e363e01a4de25bd12db3d3e))
* **sisyfos:** Sorting all channels by overridePriority ([44f0462](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/44f0462354664411f8882a156a2e91f100d92b6f))
* **sisyfos:** wrong transition function ([b06ec91](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b06ec9156d897fa1b1c6107515e54fd655f5b7d2))
* Some callbacks not being sent ([d89af30](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d89af30294bb049b4f8e18beee103c10fabdb263))
* some device errors ([e185c14](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e185c145399307388c2c73a5fbe22a6be856b41b))
* some small refactorings ([2954039](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2954039563aa9cdb6df5e7d34e9a2c0e4a9aaa0d))
* ssrc box enabled is optional ([17c84ac](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/17c84ac019ff10b33d771955b715b473ccb78246))
* stronger typings on the device eventEmitters ([ad145b5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ad145b54bc215c770254c1f0cb35d3ebfce04f6e))
* support for using a cache when resolving the timeline, enabling partial-resolving for higher performance ([9e3ac97](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9e3ac970bf302ea54887c129a7c83e059632ccee))
* support for using a cache when resolving the timeline, enabling partial-resolving for higher performance ([3ec3eba](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3ec3eba20b8e12387123fff7a1bb2469e47a54e1))
* Support matching input names to file paths ([775adfd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/775adfd27caca5dcaf9cbd1bd4790f462e7796ac))
* Switch to input ([abdcfd2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/abdcfd2d775fc69bcd56c9280593eb522abaf224))
* syncing version between projects ([294b90a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/294b90a59759efb9bc76d9157dfac8807b10bc78))
* syncing version between projects ([83094ce](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/83094ce50de27f03bd34dde9edbbe6771c2713c6))
* tag device messages with deviceId ([0928554](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/09285542d237846c4b120521d0a1a38292eb108b))
* TCPSend: added tests ([6405552](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/640555202f0c7202e20adc30114cbf0dcfc6dacb))
* templateName can be a number for pilot elements ([d783253](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d78325359fd609afb1741fcea88b2a1b3304484a))
* test ([3c84ea7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3c84ea733ea5dc86a837830e7de29c455dcf1fc0))
* test scripts ([08c4f3e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/08c4f3ed4e28dd1a5028228be10e950d6a3f7e8f))
* tests ([bc7291e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bc7291e27f12faa35753ec614373ff26289a6692))
* tests [publish] ([6577f6e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6577f6ebe830ec0c5de834eba5c8646a796f6276))
* tests & dont remove future commands if going to re-add them directly ([c9afbeb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c9afbebd5ec0c16bb33c60026a66c2ad164c38e9))
* threaddedClass dep and properly close event listener on quit ([63dd1e6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/63dd1e6a552d850af744c5fb0392fc18ff96ef07))
* threadedClass `DataCloneError: class StatusValidator` ([d89c232](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d89c23261ebe65f91e4cd537e7af07e3c10984a5))
* threadedclass dep (to fix error with circular objects in single-threaded mode) ([a18bf3c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a18bf3c2828a29226ea16e402199dd9caf11b410))
* threadedClass dep update (fix Error when using device.on('event')) ([4783abb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4783abbb22149ddfdb29d54e2d03e92f13f3a9f2))
* threadedclass dep updated [publish] ([45c2b88](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/45c2b88414da8c45107e10239fd0cf2f972493b7))
* threadedClass dep. fixes a fatal bug that caused main process to quit. ([47dc740](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/47dc740c84260f6f0fbeca35a90293c4f9bfce91))
* tidy lawo commands ([3497bce](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3497bcebdb95731efc473802123a79f0ac661405))
* tidy some EventEmitters to be safer with ThreadedClass ([6f1b708](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6f1b708fda70097c2125c325bceef8dde4d72302))
* timeline dep ([10dc818](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/10dc8189826ee99df08aff8d5dfbda7e5627d363))
* timeline dep with bug fixes ([d3860c6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d3860c6bfe62df4692eb4be76516cc1e3b82ecc8))
* Timing overlap issues ([813104f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/813104fbb15b19aee22d7a0e4697f149f2de3c78))
* transition properties should be optional ([2d2fb87](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2d2fb87f831eca85dbf38a75d0ee22216d27c753))
* treat all status codes below 400 as correct ([6b6ce54](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6b6ce54f3d5987083bc19462b19f26318cee37c9))
* treat all status codes below 400 as correct ([d0791b1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d0791b188b2304722e5b12d4f3d36f6c07ebd269))
* trigger `activate` to reload elements after VizEngine restart ([40d26a0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/40d26a0ecb74acf48fc1fa8358ffcd661133aa9c))
* tsconfig location ([d832d36](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d832d36905b23e969b2500c4d1419c4a1fdba6d9))
* tsconfig location ([e4d9e1b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e4d9e1bc969d0b6919f29f64f3149c88cf16957a))
* TSR bug fix ([aa7d535](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/aa7d535ca8a73e71f447e620188a2d535fd0f1cb))
* TSR dep: test: Viz pep ws reconnect ([d8309eb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d8309eb4eb662dccf5c8c92378b6f9d553f759bc))
* **tsr:** Restrict the next resolve time to inside the current window, to ensure we don't miss something that the timeline excluded ([afa514d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/afa514df27616f70539aea5d21c0f35053d18c7b))
* **tsr:** Restrict the next resolve time to inside the current window, to ensure we don't miss something that the timeline excluded ([7e1ace8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7e1ace8854239974ff5d4150cdc7d60e5eb890b5))
* Types ([2cc1b51](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2cc1b5162eed52be0caa7df73ac9221da9d09f3a))
* types test scripts ([439ee77](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/439ee771b9fa7bce514918e8e7ef73928caafec6))
* **types:**  types file structure ([0dfce5e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0dfce5eb325f4c6e436a62307c946ba3829bb289))
* **types:** add timeline exports ([9f70714](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9f70714f8727c48cb7ba60baa3125d6b34b3663c))
* typescript build errors ([14c2dff](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/14c2dff8f6ad2d4538bc67eda9b463b2e058b149))
* **types:** timeline export ([af32616](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/af326167d78a1ea1544cd9450ada0c716434e059))
* **types:** upd imports ([2b758fe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2b758fea157f098c328c0b73a3f9f7310a874dfb))
* typing errors ([5fcc234](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5fcc2344232ea94e318a361dde2021d4e90885bc))
* typings package ([337e8be](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/337e8be282009fb6317afc0e63fc660d4d141b6c))
* typings package cannot use dependencies ([93ae546](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/93ae546a797380e620c752a0fd685b1331ad670a))
* typo ([b7a34ee](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b7a34ee74dea4ef8a7c2724b897155d4fe15ba2d))
* undefined checks on volume and balance ([426b3e6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/426b3e6c30eecd7a1f3002693f4a713a59b47c40))
* upd threadedclass dep ([460aa3a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/460aa3a05874e22559803636dbc109c35d535bf4))
* update atem dependencies ([a06f414](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a06f414248a4a8f9a2f1852a71aa170a41ff9153))
* update atem-state ([9f250c3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9f250c3d02bfdef052f154c5c2a66de102df20c3))
* update atem-state and fix tests ([98ad55d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/98ad55d7e23468dd1e04a6decdd261c48fa3fd02))
* update CasparcgVideoPlayES6example.js ([48077fa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/48077fa26c4a0c611c4ca6ac0d5a1fbc48049607))
* Update ccg-state (fixes ccg sting transition) ([faf1f43](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/faf1f43f0e01cd328ff615c521dcde0af50b8b15))
* update dependencies ([2622dfa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2622dfa3e95932bfcf81cc125870609b9c2682f1))
* update dependencies ([7f0ca17](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7f0ca1758a0eff9209cc32460a376c9dba4a0f59))
* update emberplus-connection ([f32e78a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f32e78af43e2a3b3d8bc3204c3f062299e1e0259))
* update emberplus-connection ([a1782db](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a1782db8be17c68ede42fc9733cb6cc67791aa4a))
* update hyperdeck mock to test commands ([72feb67](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/72feb679005a526a8e45c04ee91cb4831d3b91a8))
* Update interfaces and types ([14e065d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/14e065d883096f12e4a6bfad08df7977e9400c22))
* update of dependencies ([080600c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/080600c5d7aaeece287a5af70665cb49d5c260e8))
* update osc dep to latest version, fixing an issue with an optional dependency of serialport ([812b225](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/812b2250827d90cc8e10bf35a9fc69c4fbea3b83))
* update Pharos test ([f799af4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f799af4b913bd687c65986e686fd44ab6a4f1a86))
* update quantel-gateway-client dependency to latest ([6f3e904](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6f3e90434e71d651688febc1b67dfbbac2d503b8))
* update some exposed typings ([74cabe0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/74cabe07fefac381f63bfe59f6f9d62f5291211f))
* update supertimeline ([f13129d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f13129dcfbc8a6dd3418c6372a2a17891c072be1))
* update supertimeline and expose new property ([731854d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/731854df946fc0d7174f6a7eb72af5322db61c9e))
* Update supertimeline dep ([3c89511](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3c8951199e84fb1e11cf933d2ffa93116585af97))
* update threadedClass dependency (performance improvement) ([76b673b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/76b673beb11d18181968e9bc938b526dfa7b1cdc))
* update threadedclass dependency to 0.8.1 ([1bf2d5a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1bf2d5aeb894a7b251df8ed572e2a3fc838476fb))
* update timeline dependency ([2c75df1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2c75df103d82f7ef239a1d3701a8987ac67c5061))
* update timeline dependency ([8f93464](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8f93464fbb6b0b48b1193783060663e5b763aa9c))
* update timeline dependency ([b28e9ad](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b28e9ad66fa50c9d3b24f1593625dd7b30d175e2))
* update timeline dependency (bug fix) ([bcdd34c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bcdd34c8803215d53fd97e1a179761d5ea9a657c))
* update timeline dependency (containing bugfixes) ([2709fa0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2709fa0984bbfc9b4da931d3e56ece6b9617b74a))
* Update TimelineObjEmpty. Fix some incorrect import paths ([5e7b66c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5e7b66c1d9099fbf44bfdda2d41fa5705c94a613))
* update typings and fix tests ([dc8d066](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dc8d066d486de53bf8e00447bcafb26e77d725dc))
* update v-conn dep ([cb5c305](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cb5c305faf7d3dd0032a49bb43a927eda270f0cd))
* update v-connection ([7598b6b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7598b6b9ee323e8b1d15ed035a7e83a76ee7e2dd))
* update v-connection dep ([ba0bc76](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ba0bc76181dbf1a8adb66fa8afbca78b3a1ead55))
* update v-connection dep ([30421eb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/30421eb64a11fef62714951d81b3b14131db6b03))
* updated dependencies ([93201e6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/93201e6454c45136869f02bdfc2312a66aad3a38))
* Updated links to match the changed repo name ([6fe910f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6fe910f69a313e1f7b84e88a6550c3e40ac29afa))
* updated threadedClass dep, for better error tracing ([c5cdafe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c5cdafeb8526f2c38e8446a613d7e7fdb6848ec6))
* updated timeline dependency (performance increase) ([52c5620](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/52c562058e9cf8a141115ec53c2cf04a1284056b))
* Updated URLs to reflect the changed repo name ([4436674](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4436674988ce45a66bafbb2161f9cbf6c850694d))
* upgrade casparcg-state ([bbeee15](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bbeee15e895be58100f4ddb88fb4e229a7aeb07b))
* use library "tv-automation-quantel-gateway-client" instead of internal code ([bf93600](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bf9360017bc0056235de1a7a264dd8b6d723a8d7))
* use pre ordered commands from casparcg-state ([04ed282](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/04ed2824359069b5afb9d98cec6dcdf307d31f6c))
* use queue when adding an input ([ea9b43c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ea9b43c59ebbedd79743ffbdd8af2a265d013865))
* Use retry timer ([9be95f2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9be95f256d426b0e82da938012ecafaa2f1ff974))
* use TimeCommand to set time code ([82f06bc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/82f06bcabb2978df74b5232e0d2e4efe86137373))
* use Timeline object instance.originalStart instead of .start. ([f110051](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f110051eb4e03f51e722282b24b6b79af36adce1))
* v-conn dep ([70f2cb1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/70f2cb11806bd4a21181dd4a212efcfced39de4d))
* v-connection update ([71f48d1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/71f48d176ff5a6d31fbbe71f6f45a5c3b7714269))
* v-connection ver: Internal element channel ([dee8d70](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dee8d7035e1ca4897e0d25e08126d003b655386f))
* vixMSE: fixes and refactorings: ([428ba1f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/428ba1f80593fcd50abe4d4b453307a6a8d19efd))
* viz: another go at loading elements ([8c14fad](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8c14fade01291ff5609a754d4deea368b087296f))
* viz: display loaded status of internal elements as well ([e752e82](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e752e8291a1308a8c42d503b8b0d4303d63750ff))
* Viz: Either push not connected message OR other warnings ([f18a6ae](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f18a6ae97b0b5a4b001a2f24f6778554d0b30650))
* viz: optional: automatically load internal elements (by initializing the viz show again) as they appear in expectedPlayoutItems. ([e3f73ed](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e3f73ed4fccada919028038b883a1e394506b493))
* viz: state mgmnt for isClearAll ([a7136cd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a7136cd9ffd3c8d1f47f9fefc4312f549bf96b10))
* vizMSE emit error if thrown in monitor ([621b203](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/621b203596661cf50c81ac79e6168a1d4fe8afb4))
* vizMSE fixes ([2a9bc01](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2a9bc018ab704070fdc876a7201227f627b4c3fb))
* vizMSE logical bug fix ([3e5be59](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3e5be59be31402a8131de336cbc99ff746c35a70))
* vizMSE: actually set item to hasBeenCued after having cued it.. ([76d7dac](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/76d7dac2c86fa83e9c83f70b6c198a5d500f4a2b))
* vizMSE: ignore timeline-object id and outTransition when diffing, so that no new take is sent if just the id has changed. ([967ebb5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/967ebb5a754262b0b05810f0195730045c457550))
* vizMSE: monitor and ping the MSE, to check connection status better ([c7cbc3b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c7cbc3bde2bde6e904e4b7f9154d8342ae220e9e))
* vizMSE: sort the commands so that takeOut:s are run before takes ([5963dfe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5963dfe8aa8c45444bfb4364053c186216dfdbc7))
* vizMSE: wait a bit aftter having prepared an element ASAP ([711e595](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/711e595e39e91a9ca6f5a354b35592bebfe01ab8))
* vizMSE: wrong time was used ([cf84ad7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cf84ad7a069afd51758d9e015e4a70ef42ede2c3))
* vmix overlay/multiview input selection diffing ([b915d51](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b915d517489b021480f69c3057341749c4adcd42))
* vmix: refactoring and prepare for tests ([68794a8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/68794a8371aa5773dd14ff483fb65974e47252d2))
* wait after activation ([5bace5a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5bace5a88ea373db040dd7b5735ff1150dafe6e8))
* wait for releaseing quantel port before creating a new one ([da4c862](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/da4c862df1b5dacbd03862bd192092a0b78b50a9))
* with new v-connection, element.name might be set ([2877b6f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2877b6fc8ccf3dfe92473c957a021ccad1ca8ff0))
* wrapping a thrown error in an Error changes the content of it, causing it to turn into a Error('[object object]') ([e2a8dc7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e2a8dc75e69356b1a5fe5b50066434472dc62b5e))
* wrong dependency in types package ([78e5b8f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/78e5b8fe20f54ac3f829a9a7ed3a29fa430b9b83))
* wrong prop value ([dd5ff81](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dd5ff81ff0e20f26a8525e20db0809f6fca3334d))


### Features

* a better implementation of Singular.Live integration ([7fe543f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7fe543fc42aba90825fb85f6ade75ed4a2e8ba0b))
* add a interval camera state check ([3ba352a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3ba352aa0fac8365d86194415ee0df76e17f7b0a))
* Add accurate typings for TimelineObject.keyframes ([0a116dc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0a116dc47c10112e70882b2b135a7fc12af8e347))
* Add array of commands for HttpSend to send as part of makeReady ([c2518e4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c2518e40ddd4cdefbc4174762de0d9dbb83ca51d))
* add AsyncResolver, sp the timeline resolving is moved to run in a separate thread ([681988c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/681988c530bfde8fb86ed70e89fb93d297accd01))
* Add audio ([b5d6ea0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b5d6ea01607b0001ad6f6a190de7c6bf0ea61b5d))
* add boolean values to osc [publish] ([2e157e7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2e157e7ae7d2c523318ff0739208910d9df4eddd))
* add casparcg-property noStarttime to avoid seeking in certain situations ([e591c0d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e591c0dc6cd8caecd67a5b09cf03fe2bc68e283a))
* add casparcg-property noStarttime to avoid seeking in certain situations ([c7efc87](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c7efc871d55c0035d5848ca42b02ceebea892c08))
* Add commands to play/pause/restart inputs ([9183b34](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9183b3453f62dc2d2c7add74339cc5e3417259fd))
* Add external elements status reporting using Media Objects ([37212fd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/37212fd0576a8f6bc14e571e401ecfc9be0ce4ea))
* Add Fade To Black ([b085afa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b085afaf200ba43f3f4c2d9965b97b5dcc4d9b1f))
* Add helper to send an input to program by clip name ([18144f5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/18144f52325098ec68284ee202e9139a3a12ec17))
* Add helpers to start / stop clips by name ([1177d55](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1177d551465c333d2e7f8834781944e694bcdb2c))
* Add http put requests to httpSend ([5e66ae0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5e66ae0066b4c832d48f9af08c980345e858a6ee))
* add httpWatcher ([650f059](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/650f05984060b7da82508c558308a0708529443f))
* Add layerName property to mappings ([20cc428](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/20cc428865b5fa1cbae08b4537c32e81e8346778))
* Add layerName property to mappings ([c0d81eb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c0d81ebee21349515e8532fca9ef13250e31068d))
* add notOnAir propery on timelineObjects. Quantel: make outTransition when next object is notOnAir. ([687e54c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/687e54ccaeac1f9a2b7ee5ab47d97cbfb44ed5fa))
* add optional port setting ([8eacb8c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8eacb8c37f5a020a746008d186f2efac31a538ec))
* add origin descriptor to all error emits ([df2de4d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/df2de4da392f5d3d7baa6edc5925d43ab9af56f5))
* Add output mapping ([0a366d9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0a366d95c236c488ce96d73403a0ea4545a28b34))
* add outTransition together with notOnAir support for quantel device ([b752bf9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b752bf96df486ceb556e2d481c16769765f64403))
* Add overlays ([a3c3641](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a3c3641ee20c84c15884b0f6d805583d7f86dd66))
* add Pharos-device (wip) ([b099ba8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b099ba8eb2bdedd5d95b00cfd83cd9165df3a19b))
* Add preview timeline object ([bf42d78](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bf42d788ccaa0e19346354e8d26f724b1806760e))
* Add quick play ([88fd701](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/88fd701822e2fac05459a9192c2ac7e5c284b86d))
* Add SetInputName ([9525c40](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9525c40c4f1f22cfa49094d1d13f188eac550312))
* Add streaming / recording ([5fadd58](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5fadd581ced195881976ff1820d823c0d6be2235))
* add support for advanced settings in the TimelineObjAtemSsrcProps ([#171](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/171)) ([d25520f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d25520fc2dbb00583e18f6b68dd7acdcc5274f75))
* add support for advanced settings in the TimelineObjAtemSsrcProps ([#171](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/171)) ([2efd965](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2efd965e4f8856af086d9052022d1cfa9864a479))
* add support for casparCG looping, seeking & inPoint ([dd4dacf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dd4dacfa778b96f79b66beb2a746a591a086b69b))
* add support for commands with context ([bf20e44](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bf20e44f371cc011f8497a185451e57c334402e3))
* add support for running internal transitions for casparCG ([4b0443c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4b0443c8fbcd804802df2afab7613619cb26071d))
* add support for special template which clears all graphics ([17def98](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/17def989b521adabe6798602b131ef3ab43e2d07))
* add TCPSend device (wip) ([88618ff](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/88618ff0c9bceccad32358934ca26e3b1a8fcdb4))
* add timelineCallback on stopped event ([cd12fa6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cd12fa61e0f62e3b9863d9c42089151afd17a6c5))
* Add transition enum ([f10c11d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f10c11d30b3bda7ebde28a6cd6cf0c3f4b3b31ee))
* Add transitions ([98c4302](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/98c4302a74afb00996ff1c433141137561d06d7b))
* added .canConnect property to devices, for status display ([25d2ded](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/25d2dedcf6c04a74b99777269f47d3c6f4628eee))
* added .useScheduling option, to allow optional usage of schedule commands. Added fallback to use internal queue when not scheduling. ([0e4b14a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0e4b14a15e90b83d903f981ef6d3bccf24afd8fe))
* added atem PSU status, refactored device methods to abstract ([0789df2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0789df28a011d81d3e1c40d94e3e1375410c5328))
* added DeviceContainer, to be able to read properties like "deviceId" without the round-trip to the child process ([bbbdbaa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bbbdbaa5fb0ef4579259efb89d784c9574943b7e))
* added example file & loosened some typings ([c1132e1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c1132e107046d26a420710fc71c7e6986e86b195))
* added getDiff function, to be used for generating command contexts ([3275bf7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3275bf70aee3fd326e745faf2a2ab544123f460e))
* Adopt TimelineObj types from blueprints/core ([66621fa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/66621fa511c0a6c2372fd2523486f812e23b5766))
* all devices: refactor how to handle doOnTime events, and add commandReport listener ([5360e4f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5360e4fa90d0a67f49b394e9565019b4e49edafb))
* Allow multiple layer mappings affecting one CasparCG layer ([cb4bfdd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cb4bfdd6eede8f80e775c22bd43e12c09d1f491a))
* atem media player sources ([95f897a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/95f897a0572ce0c21a2fa95f062cce20c885dfc8))
* atem media pool config ([#132](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/132)) ([f9b4a9f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f9b4a9fd218675e3fc848ead8ec6c4b811678f6a))
* **atem:** Audio Channels ([450c26d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/450c26dc33d99bb4e4a008a72dada32dd74fe864))
* **Atem:** enforce the device state upon connection ([466f7f6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/466f7f64c4c88df5e0c02db8b45412e5a75368f7))
* **atem:** Simplify lookahead handling logic to only support WHEN_CLEAR and the updated RETAIN mode ([5e82a3b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5e82a3b7e1500ffcc756b005758f6161e26648ed))
* **atem:** support for super source properties ([9bb21de](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9bb21dee23cbeb581ebf043c32797caa18f2fbf0))
* Auto load + play images ([de0e9b5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/de0e9b5bdebb4b7bbb126af6eb3a069035dc6c8a))
* basic atem macro player ([32457eb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/32457ebbb173e1a0ab377d81e1fa4ddcdbf7630d))
* bump casparcg-state dependency ([c45eddc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c45eddcc596fc68b899954b081fac95dc9d6d2c9))
* casparcg: proper handling of points in time ([95dafb4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/95dafb41acfd3709725c075246aa6db6ca5e4790))
* casparcg: use timeline contentStart ([bd5f648](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bd5f6489968751bd63be0dfac1d99a2af1eff36d))
* **casparcg:** Add channel_layout to TimelineObjects ([c77e765](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c77e7656d912d4f789527e9de8a1b4c59a29f20f))
* **CasparCG:** channel_layout property ([4101e74](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4101e7488cccc1dd1abde5fe5326741e12cd4607))
* **CasparCG:** config for retry interval, retry after sending commands ([22187c5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/22187c5a78a358836abc171bdc4129028a71cb9d))
* **casparcg:** FFMpeg filter strings for audio and video ([4f332a7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4f332a73ff8235031bbbc8108679f90abd645e03))
* **casparcg:** pause media ([9c48003](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9c4800397c12b7dee49988a2059aa47dfad9bc14))
* **CasparCG:** retry media that failed to load ([7f494b6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7f494b67693e9a75a3c45486cbe65f8900440d14))
* **casparcg:** route mode ([b214471](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b2144713e6fb57a201844e279bb21b35c4e4984f))
* **casparcg:** sting transition fade parameters ([2a82d50](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2a82d503abff990a5e88f33aeaded6d5d5011af4))
* **casparcg:** support delay on Route ([e33b700](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e33b7006fcf7dbaf087c2b432e0021decd8ef322))
* **ccg:** Better support for AB playback ([20f17bc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/20f17bc4858e8665fc83bfd39a266fcc43ddde09))
* **ci:** optionally skip audit ([aef36e8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/aef36e80a29d2bf1d4500118844900626e711fdf))
* Clean up various TODOs ([f1c0e45](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f1c0e452324acf5028e6795436561a978b8bed05))
* Combine casparcg VIDEO and AUDIO types into single MEDIA type ([f675e6f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f675e6fc22da0a64d2f812e67cbeeb353304f7ba))
* commandContext for tcpSend device ([71c8221](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/71c822169dd9903b125b0377fbf3b4cf9960b2b2))
* config option to NOT deactivate rundown on standDown ([8793382](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/87933827610a867eacc8b411bc653033139a2bb8))
* continued implementation of internal transitions. add support for MIX, PERSPECTIVE and a hack to combinate with opacity and volume [publish] ([c424637](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c424637b81f4eb11286ec2b876685a6f94d30190))
* Create a subpackage for types that are useful elsewhere ([922ceda](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/922ceda6d6c04c9d6af95b080234eddd992adece))
* Create overlay if it doesn't already exist ([2739f7f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2739f7f8f7764740b2a74d98d222f87e61f186b4))
* devices emit "active"-status, so that an external monitor can choose to ignore non-good statuses of inactive devices ([4fc1ccf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4fc1ccf3d064d402a4f281bcac8c739e1be669b5))
* devices emit "commandError" events when there is a problem with a comand ([72e8d3b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/72e8d3b904225a1233e566298db5c235ea9e9568))
* disable control of unmapped atem auxes ([550e52d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/550e52d9e417ec24deff6e22773c3e1deb5bfb39))
* DoOnTime: add burst-mode (equaling old functionality) and in-order-mode (run commands in sequence) ([5820aa1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5820aa183546517753f79f9b7a8bf74e8cbaf594))
* doOnTime: emit commandReports on every command ([7ea4cbd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7ea4cbd518f8f5fd6e360b0e2c1e06ab89e75edc))
* **doOnTime:** return removed count ([dcee1c0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dcee1c091c8b89877687113ed35e5e7bed23d5ec))
* emberplus conn upgrade ([#148](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/148)) ([2dbd7f3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2dbd7f336251ce5871b43a5fea1146abed992f04))
* **emberProperty:** fixes and adds support for typed values for direct emberplus properties ([52e2bca](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/52e2bcadff40cf6cefa085873951dde3292b410b))
* **emberProperty:** started adding support for lawo objects setting values directly on absolute ember paths ([8375f44](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8375f449410f7d2f47103db3a660666e0c17558a))
* emit for successful command ([6ea2cc7](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6ea2cc7026f6fef735f97b329c1e236b5c5b42ef))
* emit more detailed slowCommands ([91bda43](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/91bda43cf499d14c43aef96e0af7b3df78591a05))
* emit statReport ([179d016](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/179d016bdbfbf4b79c7fd4a42c9fb53b6c17e6b5))
* Ensure LLayers are run in a predictable order (name order), to allow for overriding values from other layers. ([fd2ca4f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fd2ca4f070cb98b0145e363776d387e8f1e993e7))
* Expose isLookahead and lookaheadForLayer on TSRTimelineObjBase ([22841a8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/22841a84a1abeaf1b232f3757942f6704affcdd8))
* finish Panasonic PTZ & unit tests ([2cd95fe](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2cd95fe959d42f5ed6d927f2242deffb7d95f49e))
* hyperdeck disk formatting ([9716bf2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9716bf2be93bf0f0a5f7c7af002c3789278d626d))
* **hyperdeck:** enforce remote control ([dd40e2b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dd40e2b41bac0965084b4099921f0f94cc3af13f))
* **hyperdeck:** notification for stopped recordings ([3fe1c58](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3fe1c58a7a640480fddeec2df8f7158278571e36))
* **hyperdeck:** Recording control ([7c9fec0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7c9fec00b53139ad1b12dc69b3523a50ebb3ef81))
* **HyperDeck:** report recording time ([44755d2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/44755d2e8b94a361b9dee973f8548352bfb14326))
* **hyperdeck:** warn for unoccupied slots ([927df23](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/927df23573a36c564b147903117622fa6c223e4a))
* implement slowCommand feedback ([1d10229](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1d10229847e28200c95fb923ff73a6a7bb931c42))
* Implement support for Quantel-Gateway device ([3b38526](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3b38526483173ccdc1c98b3e8c698121e319b990))
* implement temporalPriority in httpSend ([fc68fe8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fc68fe8b9b320fb69ff509a8cc10adf8c2305487))
* implement Timeline version 2 and various improvements to the timeline resolving & typings ([32574ff](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/32574ff2d29ad0c2498b650e0685a2ea50924a10))
* implemented command context in all internally managed devices ([859df4b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/859df4bcf72951b218de1a3d778953dace940955))
* indicate elements as missing when MSE disconnected ([75db0a1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/75db0a1a2b92f449ac04e61f182dfe241e879191))
* indicate elements as missing when MSE disconnected ([68bf2fb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/68bf2fb72f3871b0730751036e0a582a37d3ca2f))
* initial implementation for Singular Live ([f89e4d3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f89e4d3d0114cf91e9b766969998f15e2967cd29))
* initial implementation of vizMSE device ([2d4c775](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2d4c7758cb5cbbc37eea594c0540ae5410bc6439))
* initial implementation of vizMSE device (wip) ([33489d4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/33489d428b6c24df9665870d48ff3ee1ecce8863))
* input (Multi View) overlays ([6dbebf1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6dbebf1d92a88fdaf448480e4f6c0696d6031ab0))
* input looping ([31b5eec](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/31b5eec74957e3f8d371dfd463985ffd2f93141d))
* Input switching ([0f71bf1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0f71bf12f3d3b507addc68715096df88cba1159f))
* input transform ([564acff](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/564acffdd3d39e975ec1339d748c116c57e4f66e))
* input transform interface ([13c4af2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/13c4af2e259ecd6ab259636a28db49ee4c603e77))
* **lawo:** new mapping and objects to do composites of fader values ([d20751b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d20751b011cd87e2d6ec4084a6074ce787f5db4b))
* **lawo:** optionally set interval time for manual faders ([2c840e5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2c840e55c4a5d81c7393885dbdb61c85f8dc65cb))
* **lawo:** source identifier node ([70be8bc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/70be8bc76384e18ca118800cb14b965205efa616))
* let the conductor emit an event at the end of resolving (used for reporting of latency downstream) ([debd5e1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/debd5e1d37f4e2199ba26ea492b926ce6320d243))
* load elements twice, for some reason it doesn't seem to work on all elements the first time ([25916ba](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/25916ba8b15dcd3e6fbcff04f3678c95fb9223b6))
* logs info through tsr ([3a2e182](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3a2e182dcfc501466ad8c80a78f5f1735016e0a7))
* lookahead/background support ([a16db93](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a16db93b7edad644edd83c2a08f46a0999f1877b))
* map sisyfos channel by its label ([afcf056](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/afcf056a568f5e18545379c2655b8c1769b98be2))
* mappings ([f45584d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f45584d5a87f7f25030a469a8eac73831cee73dd))
* monitor and improve command responsiveness ([8d9dfb4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8d9dfb4ace3afce7c60d928bee3889744fb88474))
* monitor viz engines over http ([321fff1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/321fff112c0d6a8b6fad482a93fa8a69d348dda4))
* monitor viz engines over http ([ab6c76b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ab6c76bad94f5c9e5a4407ef4d3b7c00a83cb3b8))
* mono repo ([#180](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/180)) ([7349e20](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7349e2007dff661329bb44b3407ab4adbd390082))
* Move device options to types package ([145b2ab](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/145b2abc174a7fed3540f44133b16a964c46202e))
* Move type changing to API ([0d47fee](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0d47fee775bdd8f20f3277a7ade3dccef02b732b))
* new timeline interface for vMix device ([08fbdfb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/08fbdfb35cd41566658f0c034225c267e5547602))
* new timelineObject for sisyfos: allowing for setting multiple channels in a single timeline-object ([cc7bfa6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cc7bfa620388c9537a155d877bb221ed7876cdf8))
* new try on timelineCallbacks ([87bf290](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/87bf2903cc4dbf530b2167cb840cf5987fea3880))
* OBS video production app support ([#181](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/181)) ([3d312a6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3d312a69db128f2f33af6308cba7baebfd9d0155))
* **OBS:** Support OBS Live Video Production Software ([#187](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/187)) ([f2fe81a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f2fe81a3ae87ccd3c8db812e88ef9a94b74673d5))
* OSC Device ([01adfa8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/01adfa8952744ff744662341b3a1061a65370201))
* osc device tcp mode ([59f66f8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/59f66f81a35602ba3d5d40bb41d03f42945c2cb4))
* OSC Tweened properties ([96fa04c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/96fa04c7720a69b03a4ea4cd412bb0e6c6d55a1e))
* **osc:** Add tests ([a934b16](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a934b165adaa0b4bb8f52014f6dacba73f34e909))
* Overlay input by clip name ([5ee8904](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/5ee89049f4f33fbcebc09b29a6042fe9f8121bd1))
* **Panasonic PTZ:** add support for zoom & zoom speed control ([0da79a1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0da79a1a0aa17cad00098523da3bf806399cfe82))
* Play clip immediately after creation ([64c0a68](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/64c0a68efdb59936c8505966b92423139108848c))
* preliminary timeline typings for upcoming vizMSE-device ([148f5f0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/148f5f04103526f07482192dfb9e20d4694c0299))
* properly terminate child processes when removing devices ([15fb922](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/15fb9220d7c815a8723df61b42bc37499a8a62b6))
* purge unknown elements from the viz-rundown upon activation ([cff4d0c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cff4d0cbcd46b7da97a8de31cb92381286294350))
* quantel gaeway: support for the resetPort endpoint ([fa60faa](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fa60faa58b08561cb4507611c91cd81a91a93cf3))
* quantel lookahead support ([3d5f54e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3d5f54e0d665c0bbae7d01ea9bab7d6bec1b807d))
* quantel restart mechanism ([ce93586](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ce93586d1d6c07a7e1132a8ab08763cd704cbc84))
* quantel: be able to copy a clip from another server, if the clips not present on the desired server. ([30069ed](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/30069edc1a54995fc12a5875ed6eed40b486b64a))
* quantel: monitor ports and channels, update status if the ports/channels we need are not available ([fb674d6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fb674d67c5b53cc0fa421d8f48500d0259d83bfc))
* quantel: preload when a lookahead is alongside a playing clip [publish] ([3f0c40f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3f0c40f9e0d002c39dddf9ac1ac7c81e457ed468))
* quantel: preload when a lookahead is alongside a playing clip [publish] ([b4f8dca](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b4f8dcadb6b412db7a8e0b5de4d11c23e6ccff04))
* quantel: reset the port, when clearing the clip on a port, to get a black output. ([3f40430](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3f40430dd878dc45a8f88dae1ba16d235757730a))
* quantel: support for outTransition, ie a delayed clear ([45bce79](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/45bce798cdeced2ea79471a5f24f0c348d9cb27d))
* **quantel:** cache clipId, so it doesn't have to query it again too often ([3b3d43f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3b3d43fd872ad228abc5f0034cc35dc9846c8bc8))
* rehauled how debug messages is sent. Prepared for sending command context (wip) ([fcf1e69](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fcf1e6925af6a092870a1717754fd2c154f195c4))
* Remove 'momentary' commands ([b00da7c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b00da7c76950e0d69fd3998b2fab8d34bfe7b2fd))
* remove host+port. Use uri ([cc4d40b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cc4d40b7ecea25906555b7bda619089b38c60a1b))
* rename activeRundown -> activePlaylist. ([868beec](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/868beec3462035ea5f2f5a336931dbd9548b1bd2))
* rename activeRundown -> activePlaylist. ([fb2ae0b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fb2ae0b25a3899ad4f9be1981e67def713a053f8))
* rename activeRundown -> activePlaylist. ([27a6a82](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/27a6a82fd058eaac23548208962b41bec8dc1cc4))
* resend failing http commands ([cb2ee39](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cb2ee3967f587520c8dd1e3b6d3543af6fcae687))
* restart CasparCG from TSR ([069a4b2](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/069a4b226c96928d98a1ebc30076e133dd83a0ea))
* Restructure locations of some type definitions to make them easier to import without large dependency trees ([c729806](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c729806bea6133cc333f886f37b7a024588125a6))
* reworked getCurrentTime so it's always a promise, to makie it work in tests ([6b69125](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6b6912524b06213651203f7f86700e3b2cc7a048))
* Send camera to program ([ce85854](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ce858544131a1ea1a1873abcdaf1e8b4e4be71a9))
* Send custom clear commands to Viz Engines ([4f713dc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4f713dc74a0a9fa3ef19b5e54b7f0fee6495a3c9))
* Send custom clear commands to Viz Engines ([40eb6e9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/40eb6e9a73cae2202389912d1f475a85be3598ae))
* separate the init from device creation ([20cdd68](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/20cdd6802ee6ff5151e03e2b84d035db638b6d87))
* set casparcg fps in device options ([e2a15b5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e2a15b5a85698d9d3f2db756b8f582a7a2644b34))
* Set fader position ([b616e98](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b616e98300729fdd54e0c0e2af0f000a4eac3cde))
* set state to device state upon connection ([3549c8f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3549c8fb71515931022a37a2ad9777570e4839c3))
* set threadUsage from deviceOptions ([d00f57b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d00f57b310ad45eaa28923b05b5a54e5d92981fe))
* shotoku support ([d7278f4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/d7278f482cb8e963777a22b44922576283d208b6))
* **shotoku:** simple sequences of shots ([158eb4f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/158eb4f649fc4cd9f21e0f77bac7d1399a05e9d4))
* sisyfos device ([cb92701](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cb92701522133afddbbfb64f19faf95c08ca9428))
* Sisyfos resync ([8e86ec4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8e86ec4b0cc7b57ddc7db79da2d3a511b0aedbb3))
* sisyfos retrigger mechanism ([26033cd](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/26033cdba23618bc03bf4dee89c1db7907b40dcc))
* sisyfos retrigger mechanism ([7ac33e8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7ac33e89d98185dd42a751da35a1ceb0695bc597))
* sisyfos: add connectivity status monitoring ([c3a868a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c3a868a1e80f41fae04332ca97bba953e11b35a6))
* **Sisyfos:** device reset on makeReady ([9c465f9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9c465f9f3c0443b8d2c932652f14d8a1c39f35ca))
* SOF-752 show init and cleanup ([44264b0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))
* Specify transition button ([b26f0c8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b26f0c83387db1a69dd2feb516f8674b67be1360))
* Start/Stop external output ([9dcc0b6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9dcc0b6ce69c4ed68da9beb93aeb8964734bd7a6))
* sting transitions ([3d3bedf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3d3bedf7e2d96d1e8bc559f4ef31d4bb583c6749))
* support for multiple queues in doOnTime, so that IN_ORDER can burst some commands, while run others in order ([8bbc0b8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8bbc0b805fef815a600a4bc6b2b67077dac7d191))
* switch to a single-device design, abstract device control url ([a681dad](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a681dadef4dac3b7622aacc0caa1c334bbb6bf15))
* switching to program by layer name ([9b1611d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9b1611d7409e66174f1e78d5e988b2dc7fb282d4))
* TCPSend: continued implementation (wip) ([ab84254](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/ab84254290b80b25730150b8729a552d7892573d))
* test for checking scheduling of commands ([b59551c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b59551c8a3441ae7a3f1399c766f3fe00e2e84a7))
* Track vMix state to allow inputs to be added ([cfe428e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cfe428ea6e3d38071794cf28d6e2c377ae945575))
* update atem-state to support v8 firmware ([c229d94](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c229d941b6c9d09e71712c95c16f5b5bcba1c198))
* update ci to run for node 8,10,12 ([fd9798b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/fd9798bbf29a412e3a613f5cacb5a684634c9e92))
* update hyperdeck connection dep ([7c94a8e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7c94a8e532090d7369c814585a9a1e391c551d00))
* update TCPSend device, getStatus ([551e18b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/551e18b3bcb10806fda40ff01d1b38767231d28f))
* update threadedclass (error tracing) & atem-connection (audio channels) ([7985159](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/79851598a5b2e7fd1253c3c615fc7d08b703d5ff))
* update timeline dependency ([85d17bc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/85d17bc4e9847c15ddc4c75144bf4629ecff5535))
* update timeline lib ([a499d5f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a499d5f71409fb0e734ca71f386955798e58e460))
* update timeline typings ([127644b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/127644b0ea92768284d6b663a981e830be7d4d10))
* update to casparcg-state v2 ([e3a063f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e3a063f15e29645a96cc8a9cd72c9e6d760df2d7))
* updated timeline dependency ([920d98a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/920d98a751a0dba603a4fc448cb760c59a739b84))
* updated typings from Quantel Gateway ([04d77e8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/04d77e8e78ab1fde76be7ec683d364905d4f62de))
* upgrade atem-connection to 2.0 ([998f4e8](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/998f4e8153e97137b1bae6e6a142807b937b8260))
* use a timeline obj to retrigger lawo commands ([c93c109](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c93c10956bd77c25fc94a8cd5333003f67a3c88f))
* Use layerName as default label for sisyfos faders ([a9ee674](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a9ee6740c0ef24c4aaa6c461da27b3c8cf5d0ef3))
* Use layerName as default label for sisyfos faders ([4e18a2a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4e18a2a910d1794993bab8716af41802049c9c0a))
* use p-all instead of Promise.all for better handling when one rejects ([c6bed2e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/c6bed2e5319df7789d724a7fa9bbae0cc0ff29c4))
* Use setValue if the ramp will/has failed ([96ed756](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/96ed7567a019cb10603eee1b8ce813ff38798f86))
* vizMSE device: preload (cue) all expectedElements. trying to be clever about it ([29571a3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/29571a3e51897687df61cf5ccb87bef3e8e6dfc2))
* vizMSE outTransition delay ([dfb2d30](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dfb2d3078791b8139e0b5776a82d08d26099c8cb))
* vizMSE: add .noAutoPreloading, preventing these elements from preloading (cued) ([bd48d87](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bd48d872107fa93ad01e936c460b3d07618cb1c9))
* vizMSE: add option: onlyPreloadActiveRundown ([6b66409](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/6b66409c4872e74b06bbf4ca551548142700d9d7))
* vizMSE: add separate continue timeline-object ([74ffa9c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/74ffa9c5c91ab80ff252a509f303995a01e47c9b))
* vizMSE: be able to cue elements ([dc621a1](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dc621a18c6e53a6a1a612c42acf6786ca905c3d5))
* vizMSE: continued implementation ([3844185](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3844185871117b726cb48f3928004e3e3212cb10))
* vizMSE: continueReverse ([1bd30dc](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/1bd30dc8196acf8b0296429bd8976124eb5caffb))
* vizMSE: handle some errors and try again a few times ([944edbf](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/944edbff8a10b927914f12fedd1a34af36824544))
* vizMSE: new (pre-)loading procedure, triggerable by timeline and makeReady, which will load all elements at the user's discretion ([36db63d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/36db63d0c156f659764e324c66c36a70b4f69331))
* vizMSE: playlistID for creating rundowns ([3f312d4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3f312d4167611fa4aa61411b5c7f10bec64f76a2))
* When playing a clip by name, add clip if it doesn't exist ([184c04f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/184c04f97ea3b7e92d21a42135102bbad07d20cd))


### Reverts

* Revert "test: Rename package on publish" ([855f772](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))
* Revert "feat: OBS video production app support (#181)" (#186) ([3831891](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/383189119c470c948c59c66460915819678ec6c2)), closes [#181](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/181) [#186](https://github.com/tv2/tv-automation-state-timeline-resolver/issues/186)
* Revert "chore: enable docs after rls" ([dcf6f0d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/dcf6f0d6744fb50ac6ded9652bf215fdcefb515b))
* Revert "fix: update supertimeline [publish]" ([95a6bb3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/95a6bb3346133ff08f22f7e599a80560267977db))
* Revert "chore: expose new property [publish]" ([4a3e203](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4a3e203f2f6b42802fab98ac4374a81f9f1824d1))
* Revert "Revert "Merge branch 'fix/partial-timeline-resolving'"" ([29fe257](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/29fe2576d0c808f8be243e89a73d1d5d3c7cd7e8))
* Revert "fix: casparcg timings" ([420347d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/420347dcb9b6f8185110750a5eb3620d9ea61bca))
* Revert "test: Reverse commands to test out->take" ([94976de](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/94976de38f1370df2baf5f9f39177bdd2463f3af))
* Revert "fix: temporary hack: don't activate show twice" ([a574538](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a5745382f0ffe6ca1e18b91d150ad082ab074eb1))
* Revert "chore: adding debug to track what is happenning with pilot elements and activation" ([09d1802](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/09d18024bdf8b97bb2d657ae5000961bd9628990))
* Revert "feat: Add support for LOAD in AB Playback" ([3443d30](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/3443d303ae2c0810afd991ae7e3a244bc00d1fe0))
* fix(quantel): handle error responses ([7c9f4f4](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7c9f4f49cf22308d89e13cfab737f6c6e0a0c8fb))


### BREAKING CHANGES

* new timeline interface, slightly changed timeline logic
* addDevice not returns a DeviceContainer instead of the previous Threadedclass<Device>
* device.on('connectionChanged') now emits a DeviceStatus object, not a boolean





# [7.0.0-release41.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.0...7.0.0-release41.2) (2022-04-28)


### Bug Fixes

* event listeners must not return anything ([cb2fe13](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cb2fe13c965bc3f8e221c1db08e970b454e92f69))
* move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
* **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))
* upgrade casparcg-state ([bbeee15](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bbeee15e895be58100f4ddb88fb4e229a7aeb07b))





# [7.0.0-release41.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.0.0-release41.0...7.0.0-release41.1) (2022-04-12)


### Bug Fixes

* event listeners must not return anything ([cb2fe13](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb2fe13c965bc3f8e221c1db08e970b454e92f69))
* move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
* **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))
* upgrade casparcg-state ([bbeee15](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bbeee15e895be58100f4ddb88fb4e229a7aeb07b))





# [7.0.0-release41.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.4.0-release39.1...7.0.0-release41.0) (2022-03-21)


### Bug Fixes

* **casparcg:** update status on queue overflow ([c2ec5f5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c2ec5f58aa09dc357419eeb4ff06fdf9c0791b6e))
* failing tests ([d521ea4](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d521ea4c3550b8f817c2495e54f37c4c1851d37b))
* Lawo: Typings issue, getElementByPath can return undefined. ([3846f3e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3846f3ec6b3c98eb0ac7b3dec9d398b74685d7c3))
* more tests ([031bbd1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/031bbd1945ac47d3636744c4e6cd3bd302617dc4))





# [6.4.0-release39.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.3.0...6.4.0-release39.1) (2022-02-03)


### Bug Fixes

* add a multiplier to the options, to allow for adjusting estimateResolveTime ([3941a71](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3941a710ab32fe3bfab89a9bec5cfb06a04d9b4f))
* allow for changing estimateResolveTimeMultiplier at runtime ([289a619](https://github.com/nrkno/sofie-timeline-state-resolver/commit/289a6195268998201c23356be03c83b740cacead))
* errors caught not casted before usage threw TS compiler errors ([167be0e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/167be0e3e484f7a4cd27adc04325a0cf94ebf323))
* increase the estimateResolveTime values, to reflect measured performance ([1cba2f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/1cba2f664f4d622c44d56a6c6dae9fbb1849117e))
* update emberplus-connection ([f32e78a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f32e78af43e2a3b3d8bc3204c3f062299e1e0259))
* update emberplus-connection ([a1782db](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a1782db8be17c68ede42fc9733cb6cc67791aa4a))


### Features

* disable control of unmapped atem auxes ([550e52d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/550e52d9e417ec24deff6e22773c3e1deb5bfb39))





# [6.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.1...6.3.0) (2022-01-26)


### Bug Fixes

* Homogenized the headline with the other Sofie repos ([8325f53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8325f533f054f25acd317654f82ed345645f5b60))
* revert timeline dep, as it caused issues on air. ([71da109](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/71da1092ac99bccc9f947ce7f1c1ee445b83fcff))
* Updated links to match the changed repo name ([6fe910f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6fe910f69a313e1f7b84e88a6550c3e40ac29afa))
* Updated URLs to reflect the changed repo name ([4436674](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4436674988ce45a66bafbb2161f9cbf6c850694d))





# [6.3.0-release38.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0...6.3.0-release38.0) (2021-12-17)


### Bug Fixes

* update timeline dependency ([2c75df1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2c75df103d82f7ef239a1d3701a8987ac67c5061))





# [6.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.7...6.2.0) (2021-12-08)


### Bug Fixes

* bug fix: the http-watcher wouldn't check the status on startup, only after ~30 seconds ([1dd1567](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1dd1567507bd3dddf03805ea3f5c4003cdc241ec))





# [6.2.0-release37.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.6...6.2.0-release37.7) (2021-10-22)


### Bug Fixes

* catch some quantel releasePort errors ([#199](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/199)) ([10007c2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/10007c2bd52caed401fcf576cfc03b8a9031914f))





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
