# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.3.0](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.2.3...2.3.0) (2022-10-28)


### Bug Fixes

* SOF-1140 wrap strings in Errors to avoid mangled logs ([bca62cb](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/bca62cb7d3abd05974e79f5eece079de98a4bacf))


### Features

* SOF-1140 handle warnings from v-connection ([a48d313](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/a48d313d20344ebd8a061c625d8ed3491df95465))





## [2.2.3](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.2.2...2.2.3) (2022-10-18)

**Note:** Version bump only for package timeline-state-resolver-packages





# [2.2.0](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.1.7...2.2.0) (2022-10-04)



# [7.3.0-release44.2](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/7.4.0-release46.1...7.3.0-release44.2) (2022-09-29)


### Bug Fixes

* timeout a device terminate operation if it takes too long and force-terminate ([59ec81a](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/59ec81a2947a8f48b699fd52f6e9185dd1587f2e))



# [7.4.0-release46.1](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/7.4.0-release46.0...7.4.0-release46.1) (2022-09-27)


### Bug Fixes

* use tlTime instead of time to remove future callbacks. ([0e70a3f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/0e70a3f51253ede85c233714fd0b42fd83cffae2))



# [7.4.0-release46.0](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/7.3.0-release44.1...7.4.0-release46.0) (2022-09-26)


### Bug Fixes

* index datastore references by path ([9b48d72](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9b48d725d79d4eee13e7347e450abaadf02b6db2))



# [7.3.0-release44.1](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.1.6...7.3.0-release44.1) (2022-09-22)


### Bug Fixes

* don't stop playback when clipId is null ([cfc8f2e](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/cfc8f2e2c5e467e783e2fcf18377078caf313ad1))
* improve callBackId creation, so that it relies more on the incoming timeline objects, rather than resolved timeline objects ([349dbf3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/349dbf3d8f829fcd15b0480f1af1724d76bd1afa))
* invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
* move all references to the root of the tl obj ([130b6c3](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/130b6c3a908b0911f94ccedc67e7004404f11010))
* put 'em back to make linter happy ([e83a5ed](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
* send only one callback per timeline object ([00b168d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/00b168dc5511881ef9471dca1a4851342d6d115b))
* **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
* unrelated build errors ([68791e9](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/68791e9bc1602488e69c2fe3c5b49c74b6e5b538))
* update typings with datastore references ([2c0074b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/2c0074bc74d8fa0eead89b44b558e73de4057638))
* update v-connection dep ([53fbc96](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/53fbc9650f905ace72563f3b4f0e44f45e951685))


### Features

* **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
* **Hyperdeck:** add explicit support for Preview and Stopped states ([133776f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/133776f2cbc5bfc1ef9255b0f1e161357ae6e339))
* **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
* include more info about the request ([f17ad70](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/f17ad70fd90afc819d878e143d6130edf672be1f))
* **vizMSE:** add logging of request body when client error caught ([85a2894](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/85a2894c66c1a06cc0ddee2e1c72745f294f0998))



# [7.3.0-release44.0](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.1.3...7.3.0-release44.0) (2022-07-04)



## [7.0.1](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/7.0.0...7.0.1) (2022-06-28)


### Bug Fixes

* test after casparcg-state update ([4674f37](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/4674f37c393683bd74f9a4e7519a4cc4a1d42141))



# [7.0.0](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/2.1.2...7.0.0) (2022-06-27)


### Features

* **datastore:** newer tl objs will override entry ([9f31b9f](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/9f31b9f614b1c54665ce4c379e912e19603abdce))



# [7.1.0-release42.2](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/v2.0.0...7.1.0-release42.2) (2022-05-19)


### Bug Fixes

* fixed memory leak in datastore ([8e06eb6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8e06eb68c2352b59e7298c1bc2543ffa150edd7f))
* update casparcg-state ([7698a5d](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/7698a5dff610fd74e79f9b6348beb872a319f018))


### Features

* timeline datastore prototype ([e122e8b](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/e122e8bff7404b1955853131d24144c660f76753))



# [7.1.0-release42.1](https://github.com/tv2/tv-automation-state-timeline-resolver/compare/7.0.0-release41.2...7.1.0-release42.1) (2022-04-29)


### Bug Fixes

* update hyperdeck dep ([db75cc6](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/db75cc666bdfd8e5133b604ec56699cee50f2d0b))
* update supertimeline ([251c8b5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/251c8b5a83d84e8457cabe8badcf2e52cf10d3ba))
* yarn upgrade ([40aa2e5](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/40aa2e5a21149b89735fd8e6a85c9c2366a274d3))


### Reverts

* Revert "7.1.0" ([8ce054c](https://github.com/tv2/tv-automation-state-timeline-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))





# [7.4.0-release46.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.3.0-release44.1...7.4.0-release46.1) (2022-09-27)


### Bug Fixes

* don't stop playback when clipId is null ([cfc8f2e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cfc8f2e2c5e467e783e2fcf18377078caf313ad1))
* fixed memory leak in datastore ([8e06eb6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8e06eb68c2352b59e7298c1bc2543ffa150edd7f))
* improve callBackId creation, so that it relies more on the incoming timeline objects, rather than resolved timeline objects ([349dbf3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/349dbf3d8f829fcd15b0480f1af1724d76bd1afa))
* index datastore references by path ([9b48d72](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b48d725d79d4eee13e7347e450abaadf02b6db2))
* invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
* lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
* move all references to the root of the tl obj ([130b6c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/130b6c3a908b0911f94ccedc67e7004404f11010))
* put 'em back to make linter happy ([e83a5ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
* re-add programInput ([b4a644f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b4a644fd24823af8903fdfab4a5bd28743bca20d))
* Remove listeners to prevent memory leak ([d0df778](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d0df778651256c4811ec39521285f3a28521bbc0))
* Retry to initialize the rundown ([583e32e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/583e32e4cb3eb5a7b46d9b4a460c13471ef0445d))
* send only one callback per timeline object ([00b168d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/00b168dc5511881ef9471dca1a4851342d6d115b))
* SOF-1046 prevent resetting transition on startup ([e52cf60](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e52cf60c07e58062c346bf0a84e48a9106b28105))
* SOF-1091 increase threadedClass freezeLimit ([f852b99](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f852b99415000da334dffa370267e69314832956))
* test after casparcg-state update ([c93ab57](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c93ab5750344d67ae8d1ef6c34ca47ca7d60d3f9))
* **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
* unrelated build errors ([68791e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68791e9bc1602488e69c2fe3c5b49c74b6e5b538))
* update typings with datastore references ([2c0074b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2c0074bc74d8fa0eead89b44b558e73de4057638))
* use tlTime instead of time to remove future callbacks. ([0e70a3f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0e70a3f51253ede85c233714fd0b42fd83cffae2))


### Features

* **datastore:** newer tl objs will override entry ([9f31b9f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f31b9f614b1c54665ce4c379e912e19603abdce))
* **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
* **Hyperdeck:** add explicit support for Preview and Stopped states ([133776f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/133776f2cbc5bfc1ef9255b0f1e161357ae6e339))
* **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
* include more info about the request ([f17ad70](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f17ad70fd90afc819d878e143d6130edf672be1f))
* Send custom clear commands to Viz Engines ([40eb6e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40eb6e9a73cae2202389912d1f475a85be3598ae))
* timeline datastore prototype ([e122e8b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e122e8bff7404b1955853131d24144c660f76753))
* **vizMSE:** add logging of request body when client error caught ([85a2894](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85a2894c66c1a06cc0ddee2e1c72745f294f0998))





# [7.4.0-release46.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.3.0-release44.1...7.4.0-release46.0) (2022-09-26)


### Bug Fixes

* don't stop playback when clipId is null ([cfc8f2e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cfc8f2e2c5e467e783e2fcf18377078caf313ad1))
* invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
* lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
* put 'em back to make linter happy ([e83a5ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
* re-add programInput ([b4a644f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b4a644fd24823af8903fdfab4a5bd28743bca20d))
* Remove listeners to prevent memory leak ([d0df778](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d0df778651256c4811ec39521285f3a28521bbc0))
* Retry to initialize the rundown ([583e32e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/583e32e4cb3eb5a7b46d9b4a460c13471ef0445d))
* SOF-1046 prevent resetting transition on startup ([e52cf60](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e52cf60c07e58062c346bf0a84e48a9106b28105))
* SOF-1091 increase threadedClass freezeLimit ([f852b99](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f852b99415000da334dffa370267e69314832956))
* test after casparcg-state update ([c93ab57](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c93ab5750344d67ae8d1ef6c34ca47ca7d60d3f9))
* **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
* unrelated build errors ([68791e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68791e9bc1602488e69c2fe3c5b49c74b6e5b538))


### Features

* **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
* **Hyperdeck:** add explicit support for Preview and Stopped states ([133776f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/133776f2cbc5bfc1ef9255b0f1e161357ae6e339))
* **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
* include more info about the request ([f17ad70](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f17ad70fd90afc819d878e143d6130edf672be1f))
* Send custom clear commands to Viz Engines ([40eb6e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40eb6e9a73cae2202389912d1f475a85be3598ae))
* **vizMSE:** add logging of request body when client error caught ([85a2894](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85a2894c66c1a06cc0ddee2e1c72745f294f0998))


# [7.3.0-release44.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.1...7.3.0-release44.2) (2022-09-29)

* timeout a device terminate operation if it takes too long and force-terminate ([59ec81a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/59ec81a2947a8f48b699fd52f6e9185dd1587f2e))





# [7.3.0-release44.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.3.0-release44.0...7.3.0-release44.1) (2022-09-22)


### Bug Fixes

* update v-connection dep ([53fbc96](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/53fbc9650f905ace72563f3b4f0e44f45e951685))





# [7.3.0-release44.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.1...7.3.0-release44.0) (2022-07-04)



# [7.1.0-release42.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.1.0-release42.1...7.1.0-release42.2) (2022-05-19)


### Bug Fixes

* update casparcg-state ([7698a5d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7698a5dff610fd74e79f9b6348beb872a319f018))



# [7.1.0-release42.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.2...7.1.0-release42.1) (2022-04-29)


### Bug Fixes

* Build errors ([249032d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/249032d8deb9bfd8568d9fb5275f1dd58e4b4647))
* Retry if retryInterval >=0 ([3616a03](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3616a03dd0b138414845b02c5553fac26342e3d9))
* update hyperdeck dep ([db75cc6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/db75cc666bdfd8e5133b604ec56699cee50f2d0b))
* update supertimeline ([251c8b5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/251c8b5a83d84e8457cabe8badcf2e52cf10d3ba))
* yarn upgrade ([40aa2e5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/40aa2e5a21149b89735fd8e6a85c9c2366a274d3))


### Features

* SOF-752 show init and cleanup ([44264b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))


### Reverts

* Revert "7.1.0" ([8ce054c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))
* Revert "test: Rename package on publish" ([855f772](https://github.com/nrkno/sofie-timeline-state-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))



## [1.0.2-release37.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.2-release37...1.0.2-release37.1) (2021-09-02)



## [1.0.2-release37](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.1-release37...1.0.2-release37) (2021-08-31)



## [1.0.1-release37](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.0-release37...1.0.1-release37) (2021-08-31)



# [1.0.0-release37](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.1.0-release36.1...1.0.0-release37) (2021-08-31)


### Bug Fixes

* allow multiple mappings to reference 1 casparcg layer ([a604b08](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a604b08d902b8d677fe9b7d296b605d3c8961504))
* bad merge ([dd6ea93](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dd6ea93bfd0ee62a403df7abc251ede409c624b5))
* do not clear elements and engines when going rehearsal<->active ([09bf843](https://github.com/nrkno/sofie-timeline-state-resolver/commit/09bf84332eaab4ded856772f53ff0323df123b78))
* do not purge baseline items ([0fe088d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0fe088d02330b289de97874ed92eba7b335b12ae))
* do not purge elements when going active<->rehearsal ([587b795](https://github.com/nrkno/sofie-timeline-state-resolver/commit/587b7953b258245b771aa611576affc10f82e77a))
* elements to keep criteria ([3146254](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3146254dacb22031124c10da33ee6b989f28773f))
* Errors from cherry pick ([4754a67](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4754a67e8dd38c081b91f07c5749b0e268cf9180))
* exceptions and timeouts ([6cb01ad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6cb01ad5fc738a1bc6d97fc5718c95d1ecb73e2d))
* extend templateData when allowing multiple mappings to reference 1 casparcg layer ([eb04832](https://github.com/nrkno/sofie-timeline-state-resolver/commit/eb0483201f7d368bcadadfa5c6837c3f1c4c2903))
* keep checking status of loaded elements ([3085502](https://github.com/nrkno/sofie-timeline-state-resolver/commit/30855020b5b93ea10591fea2f45810a438966ba8))
* load only elements from the active playlist when restarting ([7d21e69](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7d21e69dbfc959fee871746d83f9cfa1dade9b2d))
* make -1 disable caspar retry ([8069aaa](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8069aaaab456dcaf9eb2533caf3670b3a32ee736))
* make makeReady execute faster ([913bcfc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/913bcfcdd876fd85bdecf3855a6589f6d7b56fba))
* missing optional chaining ([11862a9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/11862a95d5ee9caed0ec19f5abae7769eab17863))
* prevent duplicate external elements ([6472eaf](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6472eaf267dc45fe423b7cd3d3fa0d5ba109cf5e))
* recreate removed mediaObjects after reconnecting ([1a7e65d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/1a7e65d0a3b5a0942f2f06deb7b58366d2827802))
* rehearsal<->active when gateway was restarted ([3c40715](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3c40715210230e1c864f92d9e814f05b2e2c0a42))
* reload external elements that became unloaded ([93bf3aa](https://github.com/nrkno/sofie-timeline-state-resolver/commit/93bf3aad6fbc53d2391e6a1eec013548cac27634))
* remove duplicates in incoming data ([e86f170](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e86f170cd6753025347a42f4685716837543b089))
* Remove ExpectedPlayoutItemContentBase from tsr-types [publish] ([cd92561](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cd92561a02e58f02d5c97351cc67934f77ecb5fb))
* report channel name instead of engine name ([24387d5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/24387d59e9f2f329dcb4fdd2739288cb190e245e))
* Set fader label ([78a3ecd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/78a3ecd9c423a6866d7c7218acb368d61044ecd0))
* treat all status codes below 400 as correct ([d0791b1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d0791b188b2304722e5b12d4f3d36f6c07ebd269))


### Features

* Add layerName property to mappings ([c0d81eb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c0d81ebee21349515e8532fca9ef13250e31068d))
* indicate elements as missing when MSE disconnected ([68bf2fb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/68bf2fb72f3871b0730751036e0a582a37d3ca2f))
* monitor viz engines over http ([ab6c76b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/ab6c76bad94f5c9e5a4407ef4d3b7c00a83cb3b8))
* rename activeRundown -> activePlaylist. ([fb2ae0b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/fb2ae0b25a3899ad4f9be1981e67def713a053f8))
* sisyfos retrigger mechanism ([26033cd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/26033cdba23618bc03bf4dee89c1db7907b40dcc))
* Use layerName as default label for sisyfos faders ([4e18a2a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4e18a2a910d1794993bab8716af41802049c9c0a))





# [7.1.0-release42.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.1.0-release42.1...7.1.0-release42.2) (2022-05-19)

### Bug Fixes

* update casparcg-state ([7698a5d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7698a5dff610fd74e79f9b6348beb872a319f018))



# [7.1.0-release42.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.0.0-release41.1...7.1.0-release42.1) (2022-04-29)


### Bug Fixes

* update hyperdeck dep ([db75cc6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/db75cc666bdfd8e5133b604ec56699cee50f2d0b))
* update supertimeline ([251c8b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/251c8b5a83d84e8457cabe8badcf2e52cf10d3ba))
* yarn upgrade ([40aa2e5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40aa2e5a21149b89735fd8e6a85c9c2366a274d3))


### Features

* SOF-752 show init and cleanup ([44264b0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))


### Reverts

* Revert "7.1.0" ([8ce054c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))



# [1.0.0-release37.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.0-release37.5...1.0.0-release37.6) (2022-02-17)



# [1.0.0-release37.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.4.0-release39.1...1.0.0-release37.5) (2022-02-15)



## [1.0.2-release37.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.7...1.0.2-release37.4) (2021-11-08)



## [1.0.2-release37.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.2-release37.2...1.0.2-release37.3) (2021-10-14)



## [1.0.2-release37.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.5...1.0.2-release37.2) (2021-10-14)


### Bug Fixes

* Build errors ([249032d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/249032d8deb9bfd8568d9fb5275f1dd58e4b4647))
* Retry if retryInterval >=0 ([3616a03](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3616a03dd0b138414845b02c5553fac26342e3d9))


### Reverts

* Revert "test: Rename package on publish" ([855f772](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))



## [1.0.2-release37.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.2-release37...1.0.2-release37.1) (2021-09-02)



## [1.0.2-release37](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.1-release37...1.0.2-release37) (2021-08-31)



## [1.0.1-release37](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.0-release37...1.0.1-release37) (2021-08-31)



## [1.0.0-release37](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.1...1.0.0-release37) (2021-08-31)


### Bug Fixes

* allow multiple mappings to reference 1 casparcg layer ([a604b08](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a604b08d902b8d677fe9b7d296b605d3c8961504))
* bad merge ([dd6ea93](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd6ea93bfd0ee62a403df7abc251ede409c624b5))
* do not clear elements and engines when going rehearsal<->active ([09bf843](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/09bf84332eaab4ded856772f53ff0323df123b78))
* do not purge baseline items ([0fe088d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0fe088d02330b289de97874ed92eba7b335b12ae))
* do not purge elements when going active<->rehearsal ([587b795](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/587b7953b258245b771aa611576affc10f82e77a))
* elements to keep criteria ([3146254](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3146254dacb22031124c10da33ee6b989f28773f))
* Errors from cherry pick ([4754a67](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4754a67e8dd38c081b91f07c5749b0e268cf9180))
* exceptions and timeouts ([6cb01ad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6cb01ad5fc738a1bc6d97fc5718c95d1ecb73e2d))
* extend templateData when allowing multiple mappings to reference 1 casparcg layer ([eb04832](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/eb0483201f7d368bcadadfa5c6837c3f1c4c2903))
* keep checking status of loaded elements ([3085502](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/30855020b5b93ea10591fea2f45810a438966ba8))
* load only elements from the active playlist when restarting ([7d21e69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7d21e69dbfc959fee871746d83f9cfa1dade9b2d))
* make -1 disable caspar retry ([8069aaa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8069aaaab456dcaf9eb2533caf3670b3a32ee736))
* make makeReady execute faster ([913bcfc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/913bcfcdd876fd85bdecf3855a6589f6d7b56fba))
* missing optional chaining ([11862a9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/11862a95d5ee9caed0ec19f5abae7769eab17863))
* prevent duplicate external elements ([6472eaf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6472eaf267dc45fe423b7cd3d3fa0d5ba109cf5e))
* recreate removed mediaObjects after reconnecting ([1a7e65d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1a7e65d0a3b5a0942f2f06deb7b58366d2827802))
* rehearsal<->active when gateway was restarted ([3c40715](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c40715210230e1c864f92d9e814f05b2e2c0a42))
* reload external elements that became unloaded ([93bf3aa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/93bf3aad6fbc53d2391e6a1eec013548cac27634))
* remove duplicates in incoming data ([e86f170](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e86f170cd6753025347a42f4685716837543b089))
* Remove ExpectedPlayoutItemContentBase from tsr-types [publish] ([cd92561](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd92561a02e58f02d5c97351cc67934f77ecb5fb))
* report channel name instead of engine name ([24387d5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/24387d59e9f2f329dcb4fdd2739288cb190e245e))
* Set fader label ([78a3ecd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/78a3ecd9c423a6866d7c7218acb368d61044ecd0))
* treat all status codes below 400 as correct ([d0791b1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d0791b188b2304722e5b12d4f3d36f6c07ebd269))


### Features

* Add layerName property to mappings ([c0d81eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c0d81ebee21349515e8532fca9ef13250e31068d))
* indicate elements as missing when MSE disconnected ([68bf2fb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68bf2fb72f3871b0730751036e0a582a37d3ca2f))
* monitor viz engines over http ([ab6c76b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ab6c76bad94f5c9e5a4407ef4d3b7c00a83cb3b8))
* rename activeRundown -> activePlaylist. ([fb2ae0b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb2ae0b25a3899ad4f9be1981e67def713a053f8))
* sisyfos retrigger mechanism ([26033cd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/26033cdba23618bc03bf4dee89c1db7907b40dcc))
* Use layerName as default label for sisyfos faders ([4e18a2a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4e18a2a910d1794993bab8716af41802049c9c0a))

# [7.0.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0...7.0.1) (2022-06-28)

### Bug Fixes

* test after casparcg-state update ([4674f37](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4674f37c393683bd74f9a4e7519a4cc4a1d42141))



# [7.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.2...7.0.0) (2022-06-27)

**Note:** Version bump only for package timeline-state-resolver-packages



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
