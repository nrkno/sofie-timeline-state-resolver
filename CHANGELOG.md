# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [9.2.0-release52](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/9.1.0...9.2.0-release52) (2024-08-19)

## [9.2.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.2.0-alpha.0...9.2.0) (2024-10-07)


### Bug Fixes

* revert quantel device to release50 version ([36817aa](https://github.com/nrkno/sofie-timeline-state-resolver/commit/36817aadcd0d0657bfa6175a3b333b1bf9e2c798))



## [9.2.0-alpha.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.1.0...9.2.0-alpha.0) (2024-09-09)


### Features

* allow sequential executionMode to paralelize multiple queues of Commands ([84a53cd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/84a53cd5f1ee0978767d46ad766c01841559983d))


### Bug Fixes

* filter mappings by deviceid ([f4402dd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f4402ddc6b9998e9cdf6d04f3c766ba94056d4bd))
* update timeline dependency (see https://github.com/SuperFlyTV/supertimeline/pull/102 ) ([81af9f7](https://github.com/nrkno/sofie-timeline-state-resolver/commit/81af9f7a1e3c24cfd1bbd85e5497198ff4c612bc))
* use sequential send mode for quantel ([940e68a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/940e68ab09a37df7ce53944d888757a4a6f5a9c9))



## [9.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/9.0.2...9.1.0) (2024-08-19)

**Note:** Version bump only for package timeline-state-resolver-packages

## [9.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/9.0.2...9.1.0) (2024-08-19)

### Features

- add "returnData" to action schema ([529bcb3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/529bcb3157f2e583c077dd54787d0c3ea4a25905))
- atem color generator support SOFIE-2968 ([#322](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/322)) ([b7ceb69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b7ceb6950c875ff123dcc9bdd58a45c7922045d2))
- atem command batching SOFIE-2549 ([#308](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/308)) ([75e2cbe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/75e2cbebd8ffe05e5de44d0f0f3797bbb07882e7))
- convert quantel to state handler ([7f6e619](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f6e619e1284c3ff7e3cf9ad21e578018e19edd0))
- Dereference schemas ([#286](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/286)) ([7f6a20e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f6a20e7656e92e337e9ddd45048fe76b08e349e))
- **EAV-243:** add OAuth (Client Credentials grant) and Bearer Token to HTTPSend ([8fef807](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8fef807e31c7b65d1017d772ba2e0a441f899226))
- **EAV-243:** add oauth token path option for a broader support ([76592f2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/76592f29d53b1ce5b64ddd1c283f7f045c155da3))
- **EAV-269:** add vMix input layers props and commands ([1bcf056](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1bcf056a70ed7932c1c5588fdad17f1c25d32832))
- **httpSend:** Proxy support ([6dc4c59](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6dc4c59424242b1ea6681c27c0647a9afaae7c17))
- **HTTPSend:** return response data from HTTP SendCommand action ([#334](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/334)) ([d220c78](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d220c786ea3ae139a690d741dcfdf9d8f0c8511f))
- include timestamp in statediff api ([06f095a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/06f095a81ce917ec9c350c191f662f8b660123fd))
- refactor chef device ([#330](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/330)) ([3c857c6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c857c668006dcef3bc37833987f7520fb6c9444))
- refactor pharos device SOFIE-2488 ([#333](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/333)) ([d57812c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d57812c2b2519635cadb7279803601f06918f91c))
- refactor singular-live device SOFIE-2492 ([#337](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/337)) ([2d08c7c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2d08c7c14a53fa5c32b50e829f233c9f2a20654c))
- refactor telemtrics device SOFIE-2496 ([#335](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/335)) ([96e0f6c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/96e0f6ca66e479b2cadd61426ed5d7831da95c0b))
- refactor tricaster device SOFIE-2497 ([#336](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/336)) ([4b4d2f6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4b4d2f63fb16cc66fb348c4c276803ea430d457b))
- **sisyfos:** Send fadeTime with faderLevel if specified ([5fa0446](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5fa0446a2b35e13e0ca293628022eeed925eb79a))
- **state handler:** send commands before planned time of the state ([0a3ae5f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0a3ae5f6f764762c0761a53b4364314b945f1c9b))
- support timeline v9 ([3ccc759](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3ccc759f6d2d64cc2f3ca861634d96b427076490))
- update atem-connection and atem-state SOFIE-2504 ([#289](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/289)) ([10d1509](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/10d15093654b50364e6deb4e5fe947d6ac0b3058))
- update hyperdeck-connection ([65dc0dc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/65dc0dc607a63d184ebb51a9c399e8631a0f835c))

### Bug Fixes

- synced synchronous getCurrentTime ([db4c3e6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/db4c3e6138396b8bd5dec85f54338e6add6af079))
- 'connectionChanged' event typings ([dcd9f02](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dcd9f026258ddebcc5f3303a691910308f940da7))
- `TypeError: Cannot read properties of undefined (reading 'preliminary')` ([804f1ef](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/804f1ef7df42c7988cb57084d7706a4b8ff59aab))
- abstract add missing action ([172feb5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/172feb5ddbfc6d7b7371a369afdf5ce005186b56))
- abstract device to handle undefined old state ([5f656bd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5f656bd1e28be012d8bfbf3f22f564588dee3dd8))
- add missing cleanup to osc and multi-osc ([71d1d8f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/71d1d8fb991abf5cfad691768b6acca66231b6c0))
- add missing typings for atem dve ([#305](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/305)) ([1758ffc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1758ffc229e8162efad5261dad8a83d69cf61747))
- bug in conductor resolve loop ([38a0a22](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/38a0a228a66a2613879642e9b4743a8eedd86505))
- CasparCG: add listMedia action (wip) ([f4277ad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f4277ad5515d13803f9850b61b5110f7b8573706))
- conductor unit tests ([3bbf519](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3bbf519bd844ea3bb777f00e74c2f53483ab158d))
- **EAV-243:** improve oauthTokenHost UI description ([e2ee7cf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e2ee7cfcf417d2f9aa790f7622d97c220a256828))
- **EAV-269:** default to vMix layers instead of deprecated overlays ([dc719c8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc719c8b105d88faf085daf059faef5b17dd03d0))
- ensure new services are added to `DevicesDict` ([0067869](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0067869a31b4d0c3a0afb8d0b647b655ed6a2fd3))
- missing httpsend enums ([920da05](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/920da0506cd9f2142d0edabfd9894ccd88d288cf))
- preliminary time is 0 for no commands ([9f1b481](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f1b481d5792518a68265f8a32b414786302b7fa))
- reset atem upon connection ([9cbb458](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9cbb4581d7003cf9107428eb1d6dfba8d3b9c8fc))
- sisyfos add fade time during reset ([#339](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/339)) ([f6a3609](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f6a36092351d9487e02706762adba69951d5ecd7))
- suppress quantel disconnect shortly ([9b6621d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b6621dff7d358e8d7870af304678beb3c197987))
- update casparcg-connection dependency ([e209ba8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e209ba822f9f026018a51d70498e0feb3a94473e))
- vmix: move pre-loading of media inputs into separate class ([39d3eba](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/39d3ebad6f175fc710bda7a94af6862a6452df80))
- vmix: move pre-loading of media inputs into separate class ([184fad5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/184fad55e91aef3f48ce5f8f94af1b9e869e5a71))

## [9.0.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.1...9.0.2) (2024-08-15)

### Bug Fixes

- atem supersource border properties SOFIE-3307 ([#341](https://github.com/nrkno/sofie-timeline-state-resolver/issues/341)) ([27213b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/27213b0ca9fcf63ad70520e281f7e8e69bb7273d))

## [9.0.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/9.0.0...9.0.1) (2024-04-02)

### Bug Fixes

- **vMix:** handling XML messages with multi-byte characters ([e811ef0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e811ef09f6118c69ea337e0b1eb969a663546bde))

## [9.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.8...9.0.0) (2024-02-23)

**Note:** Version bump only for package timeline-state-resolver-packages

## [9.0.0-release50.8](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.4...9.0.0-release50.8) (2024-02-02)

### Bug Fixes

- **vMix:** fragmented message handling SOFIE-2932 ([#320](https://github.com/nrkno/sofie-timeline-state-resolver/issues/320)) ([c8fe3b1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c8fe3b1d5c5f625ceffd3d970efed1b525267165))
- **vMix:** handle sparse arrays in the state ([#319](https://github.com/nrkno/sofie-timeline-state-resolver/issues/319)) ([d7caf7d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d7caf7d30f397a9fdabafd438b4bf723f3f60bb4))

## [9.0.0-release50.7](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.0...9.0.0-release50.7) (2023-11-17)

### Features

- changes the implementation of how to assign a pollTime. ([88b875d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/88b875d4d6196f55379c2dadd6d4d570216a6f42))
- changes the logic for setting a pollInterval ([a482e57](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a482e57e2a647de9421898df3fb061cf28c74408)), closes [#277](https://github.com/nrkno/sofie-timeline-state-resolver/issues/277)
- **quick-tsr:** add command report and debug logging ([f693569](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f693569601136d27c5fadb29b95787ef18c607ab))

### Bug Fixes

- `createDevice` race condition ([#296](https://github.com/nrkno/sofie-timeline-state-resolver/issues/296)) ([20abff2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/20abff2324809977e3ef1a135102791bd8b46525))
- add a future-proof "resetResolver" event ([feb709b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/feb709b5f4a80ce0ebcbe13329c86cec9904fbec))
- bad merge in casparcg device, causing issues with channel 1 ([#293](https://github.com/nrkno/sofie-timeline-state-resolver/issues/293)) ([e259f5c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e259f5c0d7cdde5bc9dcd7fa0120697b6810bae0))
- casparcg restart action always responds 'OK' SOFIE-2588 ([#295](https://github.com/nrkno/sofie-timeline-state-resolver/issues/295)) ([6488187](https://github.com/nrkno/sofie-timeline-state-resolver/commit/648818760a654e7e16407d6f635d59bb233870a3))
- **quick-tsr:** status logging ([634acb1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/634acb123ec9f215a398fd127e6542d5f44e92cd))
- remove unused casparcg useScheduling option ([#294](https://github.com/nrkno/sofie-timeline-state-resolver/issues/294)) ([06d3c96](https://github.com/nrkno/sofie-timeline-state-resolver/commit/06d3c967d2da012aa2f6655c34d382201a45cab8))
- update emberplus-connection ([0259fbf](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0259fbfaa45240d041052a0cb76bffe9241cf49f))
- update v-connection dependency ([2ba4ae3](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2ba4ae3cc769980a4b2b3c3c8a75a84d91d258f8))

## [9.0.0-release50.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.5...9.0.0-release50.6) (2023-08-25)

### Bug Fixes

- another potential fix for this system not working as intended ([c75d4d8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c75d4d8ee6271be95d1fcd60f8741c3281db0521))
- **chef:** only stop windows that we know of in the Mappings ([43ab8f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/43ab8f6b59eda4bdd1e244355a648ee2753ef2f2))
- **httpSend:** Use the same types for the sendCommand action as a timeline object ([#269](https://github.com/nrkno/sofie-timeline-state-resolver/issues/269)) ([3385217](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3385217afcb6e45aa37123f5400d1dea4a0c8972))
- media re-playing shortly after completing ([867f30f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/867f30f2ea3c5c4d568e471f054bfabed877d52b))
- prevent conflicts with sisyfos ([4780fcf](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4780fcfb816a58a9de44a9af320031def88214dc))
- promisify cb from threadedclass ([368ab92](https://github.com/nrkno/sofie-timeline-state-resolver/commit/368ab9209c5146a7e5f998dbbd69fd77b20e35f8))
- **sofie-chef:** resync state upon reconnect ([80f0ab9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/80f0ab9dc9616afdbf6e9c954163f09c18a3b8e1))
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

- add ci for quick-tsr ([9f2c3d1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2c3d1f6606af55228d96be5a064b585e6f8287))
- add types support for vMix stingers 3 and 4 ([44fa27d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44fa27d164bd717b58d7f1d1255d56d132007865))
- allow multiple sisyfos devices ([3d47f82](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3d47f82f197ac58b68c21033eac6e0354fd72fa8))
- consider outputs (Auxes) when checking if something is on air ([d629ed6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d629ed6b8f022d72688765aebb48bc087fb6a963))
- consider overlays (DSKs) when checking if something is in PGM ([4863e0f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4863e0f70ef906dbe442d9cfb95e51f37a7cbc77))
- don't join response packets together with an extraneous newline ([9258d11](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9258d11ad99a2701895a91deba0779ff22d687df))
- enable and fix logic for non-List inputs ([4cd3173](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4cd3173ff6896d55a171d3ef6563163d8516452d))
- **PTZ:** clean up interval on terminate(), sort commands in a predictable order ([13b6698](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13b6698101747c6c3ae2117b28a8bfa38c16b0eb))
- quick-tsr typing errors ([#267](https://github.com/nrkno/sofie-timeline-state-resolver/issues/267)) ([95b2eae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/95b2eae93450db5f6f4d9f26c96380fa56b08a03))
- run post transition commands after overlays commands ([aa43869](https://github.com/nrkno/sofie-timeline-state-resolver/commit/aa43869085643cc104322ca6a3c8a65d53e1a685))
- **vmix:** account for the fact that some mixes may temporarily be undefined in the state ([50ffe80](https://github.com/nrkno/sofie-timeline-state-resolver/commit/50ffe805d9236bbd51924720c9927839d051c0bd))
- **vmix:** change how commands are ordered to reduce flashes of content in PGM ([b2ebaad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b2ebaadbad0d9f1f48462f13ebe328cf14974594))
- **vmix:** inform parent about the connection status changing after initialization ([e4e380e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e4e380eae62ac1da6ec9a7881cdf461184bc497d))
- **vmix:** show a BAD status code when vMix is not initialized ([370be3a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/370be3af2f01bada232ea244c76b6c5507e9773f))
- wrap singular.live JSON commands in an array ([cc5b7ec](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cc5b7ec61d456de993cbc0e25963c93ec8b65f38))

## [3.5.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release49.0...3.5.1) (2023-03-31)

### ⚠ BREAKING CHANGES

- json schemas for device config and mappings (#237)

### Features

- json schemas for device config and mappings ([#237](https://github.com/nrkno/sofie-timeline-state-resolver/issues/237)) ([d43f3dc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d43f3dc70f5c8843081760846e9aa38fa4c71396))
- replace makeready ([5abe41e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5abe41eaa421db4845a54837b2e3b41f2b33d062))
- SOF-1254 add me_clean support for mix ouputs ([7f3fb9c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7f3fb9c7d9edb03022db69c6e206302c5c69a815))
- SOF-1254 add temporal priority to TriCaster ([7133774](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7133774a49e03a038d91a9ec8fd8d0f13cbd962c))
- state handler initial commit ([a219c84](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a219c84f899fec4ae7e53fa402be9b3911fb8a59))

### Bug Fixes

- osc animation should rely on monotonic time ([7989c9d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7989c9de9b7e8e11e7f0ee74d62d843059a0053b))
- prevent lingering device containers ([e313198](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e31319855d67209f402a4263bac51af264678efa))
- SOF-1254 don't send layer commands when not in effect mode ([daa7d9b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/daa7d9bbd97cad87090592bb6f440f5efc0f048d))
- SOF-1254 use bin_index command for M/Es ([569bde0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/569bde0d863d3fefaed65fcda0c065a1203236a4))
- SOF-1254 wrong scale defaults ([0b66153](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0b6615351c9376d834868164b32797f2ea67de7d))
- SOF-1404 use upstreamKeyerId to address ATEM upstream keyers ([61b0061](https://github.com/nrkno/sofie-timeline-state-resolver/commit/61b006156849455ec4b59d92415cd820982b1706))

## [8.1.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.3...8.1.4) (2024-01-18)

**Note:** Version bump only for package timeline-state-resolver-packages

## [8.1.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.2...8.1.3) (2024-01-02)

### Features

- changes the implementation of how to assign a pollTime. ([88b875d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/88b875d4d6196f55379c2dadd6d4d570216a6f42))
- changes the logic for setting a pollInterval ([a482e57](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a482e57e2a647de9421898df3fb061cf28c74408)), closes [#277](https://github.com/nrkno/sofie-timeline-state-resolver/issues/277)
- **quick-tsr:** add command report and debug logging ([f693569](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f693569601136d27c5fadb29b95787ef18c607ab))

### Bug Fixes

- `createDevice` race condition ([#296](https://github.com/nrkno/sofie-timeline-state-resolver/issues/296)) ([20abff2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/20abff2324809977e3ef1a135102791bd8b46525))
- add a future-proof "resetResolver" event ([feb709b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/feb709b5f4a80ce0ebcbe13329c86cec9904fbec))
- bad merge in casparcg device, causing issues with channel 1 ([#293](https://github.com/nrkno/sofie-timeline-state-resolver/issues/293)) ([e259f5c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e259f5c0d7cdde5bc9dcd7fa0120697b6810bae0))
- casparcg restart action always responds 'OK' SOFIE-2588 ([#295](https://github.com/nrkno/sofie-timeline-state-resolver/issues/295)) ([6488187](https://github.com/nrkno/sofie-timeline-state-resolver/commit/648818760a654e7e16407d6f635d59bb233870a3))
- **quick-tsr:** status logging ([634acb1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/634acb123ec9f215a398fd127e6542d5f44e92cd))
- remove unused casparcg useScheduling option ([#294](https://github.com/nrkno/sofie-timeline-state-resolver/issues/294)) ([06d3c96](https://github.com/nrkno/sofie-timeline-state-resolver/commit/06d3c967d2da012aa2f6655c34d382201a45cab8))
- update emberplus-connection ([0259fbf](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0259fbfaa45240d041052a0cb76bffe9241cf49f))

## [9.0.0-release50.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.5...9.0.0-release50.6) (2023-08-25)

### Bug Fixes

- another potential fix for this system not working as intended ([c75d4d8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c75d4d8ee6271be95d1fcd60f8741c3281db0521))
- **chef:** only stop windows that we know of in the Mappings ([43ab8f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/43ab8f6b59eda4bdd1e244355a648ee2753ef2f2))
- **httpSend:** Use the same types for the sendCommand action as a timeline object ([#269](https://github.com/nrkno/sofie-timeline-state-resolver/issues/269)) ([3385217](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3385217afcb6e45aa37123f5400d1dea4a0c8972))
- media re-playing shortly after completing ([867f30f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/867f30f2ea3c5c4d568e471f054bfabed877d52b))
- prevent conflicts with sisyfos ([4780fcf](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4780fcfb816a58a9de44a9af320031def88214dc))
- promisify cb from threadedclass ([368ab92](https://github.com/nrkno/sofie-timeline-state-resolver/commit/368ab9209c5146a7e5f998dbbd69fd77b20e35f8))
- **sofie-chef:** resync state upon reconnect ([80f0ab9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/80f0ab9dc9616afdbf6e9c954163f09c18a3b8e1))
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
- state handler initial commit ([a219c84](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a219c84f899fec4ae7e53fa402be9b3911fb8a59))
- upgrade singular.live to API v2 ([2bb5c4d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2bb5c4d2557710d55b27556cef919dc8419fa1e9))
- Use strings for DeviceType enum ([f1b95bc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f1b95bcb972aff329bce9c67b15f58a98bbf48cf))
- **vMix:** retry sending media load commands if the file wasn't found ([4321aae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4321aae2684ba4c7f55e3cf810dacae187fe282b))

### Bug Fixes

- add ci for quick-tsr ([9f2c3d1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2c3d1f6606af55228d96be5a064b585e6f8287))
- add types support for vMix stingers 3 and 4 ([44fa27d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44fa27d164bd717b58d7f1d1255d56d132007865))
- allow multiple sisyfos devices ([3d47f82](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3d47f82f197ac58b68c21033eac6e0354fd72fa8))
- consider outputs (Auxes) when checking if something is on air ([d629ed6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d629ed6b8f022d72688765aebb48bc087fb6a963))
- consider overlays (DSKs) when checking if something is in PGM ([4863e0f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4863e0f70ef906dbe442d9cfb95e51f37a7cbc77))
- don't join response packets together with an extraneous newline ([9258d11](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9258d11ad99a2701895a91deba0779ff22d687df))
- enable and fix logic for non-List inputs ([4cd3173](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4cd3173ff6896d55a171d3ef6563163d8516452d))
- osc animation should rely on monotonic time ([7989c9d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7989c9de9b7e8e11e7f0ee74d62d843059a0053b))
- prevent lingering device containers ([e313198](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e31319855d67209f402a4263bac51af264678efa))
- **PTZ:** clean up interval on terminate(), sort commands in a predictable order ([13b6698](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13b6698101747c6c3ae2117b28a8bfa38c16b0eb))
- quick-tsr typing errors ([#267](https://github.com/nrkno/sofie-timeline-state-resolver/issues/267)) ([95b2eae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/95b2eae93450db5f6f4d9f26c96380fa56b08a03))
- run post transition commands after overlays commands ([aa43869](https://github.com/nrkno/sofie-timeline-state-resolver/commit/aa43869085643cc104322ca6a3c8a65d53e1a685))
- SOF-1254 don't send layer commands when not in effect mode ([daa7d9b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/daa7d9bbd97cad87090592bb6f440f5efc0f048d))
- SOF-1254 use bin_index command for M/Es ([569bde0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/569bde0d863d3fefaed65fcda0c065a1203236a4))
- SOF-1254 wrong scale defaults ([0b66153](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0b6615351c9376d834868164b32797f2ea67de7d))
- SOF-1404 use upstreamKeyerId to address ATEM upstream keyers ([61b0061](https://github.com/nrkno/sofie-timeline-state-resolver/commit/61b006156849455ec4b59d92415cd820982b1706))
- **vmix:** account for the fact that some mixes may temporarily be undefined in the state ([50ffe80](https://github.com/nrkno/sofie-timeline-state-resolver/commit/50ffe805d9236bbd51924720c9927839d051c0bd))
- **vmix:** change how commands are ordered to reduce flashes of content in PGM ([b2ebaad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b2ebaadbad0d9f1f48462f13ebe328cf14974594))
- **vmix:** inform parent about the connection status changing after initialization ([e4e380e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e4e380eae62ac1da6ec9a7881cdf461184bc497d))
- **vmix:** show a BAD status code when vMix is not initialized ([370be3a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/370be3af2f01bada232ea244c76b6c5507e9773f))
- wrap singular.live JSON commands in an array ([cc5b7ec](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cc5b7ec61d456de993cbc0e25963c93ec8b65f38))

## [9.0.0-release50.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.5...9.0.0-release50.6) (2023-08-25)

### Bug Fixes

- **chef:** only stop windows that we know of in the Mappings ([43ab8f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/43ab8f6b59eda4bdd1e244355a648ee2753ef2f2))
- **httpSend:** Use the same types for the sendCommand action as a timeline object ([#269](https://github.com/nrkno/sofie-timeline-state-resolver/issues/269)) ([3385217](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3385217afcb6e45aa37123f5400d1dea4a0c8972))
- **sofie-chef:** resync state upon reconnect ([80f0ab9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/80f0ab9dc9616afdbf6e9c954163f09c18a3b8e1))

## [9.0.0-release50.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.4...9.0.0-release50.5) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-packages

## [9.0.0-release50.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.3...9.0.0-release50.4) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-packages

## [9.0.0-release50.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.2...9.0.0-release50.3) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-packages

## [9.0.0-release50.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.1...9.0.0-release50.2) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-packages

## [9.0.0-release50.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/9.0.0-release50.0...9.0.0-release50.1) (2023-07-03)

**Note:** Version bump only for package timeline-state-resolver-packages

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

- add ci for quick-tsr ([9f2c3d1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2c3d1f6606af55228d96be5a064b585e6f8287))
- add types support for vMix stingers 3 and 4 ([44fa27d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44fa27d164bd717b58d7f1d1255d56d132007865))
- allow multiple sisyfos devices ([3d47f82](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3d47f82f197ac58b68c21033eac6e0354fd72fa8))
- consider outputs (Auxes) when checking if something is on air ([d629ed6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d629ed6b8f022d72688765aebb48bc087fb6a963))
- consider overlays (DSKs) when checking if something is in PGM ([4863e0f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4863e0f70ef906dbe442d9cfb95e51f37a7cbc77))
- don't join response packets together with an extraneous newline ([9258d11](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9258d11ad99a2701895a91deba0779ff22d687df))
- enable and fix logic for non-List inputs ([4cd3173](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4cd3173ff6896d55a171d3ef6563163d8516452d))
- handle some additional cases in casparCG trackedState SOFIE-2359 ([#259](https://github.com/nrkno/sofie-timeline-state-resolver/issues/259)) ([810959f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/810959f06a13caef2e16fb9d90d8d8257ba1620e))
- **PTZ:** clean up interval on terminate(), sort commands in a predictable order ([13b6698](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13b6698101747c6c3ae2117b28a8bfa38c16b0eb))
- quick-tsr typing errors ([#267](https://github.com/nrkno/sofie-timeline-state-resolver/issues/267)) ([95b2eae](https://github.com/nrkno/sofie-timeline-state-resolver/commit/95b2eae93450db5f6f4d9f26c96380fa56b08a03))
- run post transition commands after overlays commands ([aa43869](https://github.com/nrkno/sofie-timeline-state-resolver/commit/aa43869085643cc104322ca6a3c8a65d53e1a685))
- **vmix:** account for the fact that some mixes may temporarily be undefined in the state ([50ffe80](https://github.com/nrkno/sofie-timeline-state-resolver/commit/50ffe805d9236bbd51924720c9927839d051c0bd))
- **vmix:** change how commands are ordered to reduce flashes of content in PGM ([b2ebaad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b2ebaadbad0d9f1f48462f13ebe328cf14974594))
- **vmix:** inform parent about the connection status changing after initialization ([e4e380e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e4e380eae62ac1da6ec9a7881cdf461184bc497d))
- **vmix:** show a BAD status code when vMix is not initialized ([370be3a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/370be3af2f01bada232ea244c76b6c5507e9773f))
- wrap singular.live JSON commands in an array ([cc5b7ec](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cc5b7ec61d456de993cbc0e25963c93ec8b65f38))

### Reverts

- Revert "chore: enable node 20 in ci" ([2f31f95](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2f31f95c8ef4b24d9401f27713a1bee1d5673960))

## [8.1.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.2...8.1.3) (2024-01-02)

### Bug Fixes

- update failing ccg-connection ([54d031a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/54d031a9eddbaa06a2165c41a3da5a20fea610e9))

## [8.1.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.1...8.1.2) (2023-12-21)

### Bug Fixes

- suppress quantel disconnect shortly ([f04befb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f04befb6464669cf8acd058cbeb541824a0bba1e))

## [8.1.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.1.0...8.1.1) (2023-11-29)

**Note:** Version bump only for package timeline-state-resolver-packages

## [8.1.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0...8.1.0) (2023-10-19)

### Features

- VizMSE action to send clear-commands (configured on the device settings) to all Engines in the Profile ([38e313f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/38e313f77dfa7e61f495acf274b872768a1dbaa5))

## [8.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.1...8.0.0) (2023-10-05)

### Features

- atem audio routing control SOFIE-2512 ([#274](https://github.com/nrkno/sofie-timeline-state-resolver/issues/274)) ([de9dfd1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/de9dfd138452794bd7ad83a2fd1e82d2849abdcd))

### Bug Fixes

- export lawo parametertype ([65a73c4](https://github.com/nrkno/sofie-timeline-state-resolver/commit/65a73c41eb31cc2a18df9f0d282255c6cf6a171b))
- handle some additional cases in casparCG trackedState SOFIE-2359 ([#259](https://github.com/nrkno/sofie-timeline-state-resolver/issues/259)) ([810959f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/810959f06a13caef2e16fb9d90d8d8257ba1620e))

### Reverts

- Revert "chore: enable node 20 in ci" ([2f31f95](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2f31f95c8ef4b24d9401f27713a1bee1d5673960))

## [8.0.0-release49.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.2...8.0.0-release49.0) (2023-03-21)

## [8.0.0-release48.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0...8.0.0-release48.2) (2023-03-21)

### Features

- Vmix preset actions ([8b31294](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8b3129412f3881ff9db2cd059927e5b5f3ae6caf))

### Bug Fixes

- casparcg doesnt resync state after server restart SOFIE-2156 ([#248](https://github.com/nrkno/sofie-timeline-state-resolver/issues/248)) ([13d51dc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13d51dca9d0587e20fb78405834adee106ae60b1))
- change `DeviceType.MULTI_OSC` value ([386ba6c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/386ba6c791a090553cf1d66c73ae82cb25edd03f))
- pause List inputs before emptying them ([9abc089](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9abc0895ae02a2dfd387551b9f3a7f495abf6282))
- properly parse multi-packet vMix TCP API responses ([754adeb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/754adeb578e18851b6a6f1dd026e11ac12bed702))
- properly parse multi-packet vMix TCP API responses ([35ba046](https://github.com/nrkno/sofie-timeline-state-resolver/commit/35ba0464905e29d1f84c2c61327e321250a44e73))
- reduce amount of `setTimeout` when using `DoInTime` in `BURST` mode ([5123405](https://github.com/nrkno/sofie-timeline-state-resolver/commit/51234050e12156e08cc0e1a13e28ca17046e7a42))
- review comments ([cb21206](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cb2120650f928e1bc7958136318403feb1d493ec))

## [7.5.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.7...7.5.0) (2023-02-28)

### Bug Fixes

- ensure that LIST_REMOVE_ALL and LIST_ADD are sent before most other commands ([13bf78a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13bf78ad650df861dc1305998dc55e9d779d77ac))

## [7.5.0-release47.7](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.1...7.5.0-release47.7) (2023-02-24)

### Features

- **vmix:** add support for ListRemoveAll and ListAdd commands ([4a7240f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4a7240f7b2819bb16f263b72d1b06b98e3c40353))
- **vmix:** add support for starting and stopping VB.NET scripts ([9f2d4ee](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2d4eeeccd9ba0017fc00cfe5df18e3717ea660))

### Bug Fixes

- allow resetting to baseline ([572118b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/572118b94a2855598848f1daa1575bc3ccc6186a))
- update v-connection dependency ([3163188](https://github.com/nrkno/sofie-timeline-state-resolver/commit/316318801a3babc54f6222621c16c4061d78aafd))

## [8.0.0-release48.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...8.0.0-release48.1) (2023-02-14)

### Bug Fixes

- improve data fragmentation handling, logging of unrecognized responses ([96cfe87](https://github.com/nrkno/sofie-timeline-state-resolver/commit/96cfe87f68d223ea6ef5566a31e2fd7caa9abe2e))

## [7.5.0-release47.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.5...7.5.0-release47.6) (2023-02-07)

### Bug Fixes

- change mocks to be TCP, fix vmixAPI test ([def9a21](https://github.com/nrkno/sofie-timeline-state-resolver/commit/def9a21719815ec20c99dabd49bfa7c553136cb0))
- osc animation should rely on monotonic time ([7989c9d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7989c9de9b7e8e11e7f0ee74d62d843059a0053b))
- prevent lingering device containers ([e313198](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e31319855d67209f402a4263bac51af264678efa))
- telemetrics device will never start, because the file path to class is wrong ([8f722c4](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8f722c44fc4749dd815cb1fbd75d24f8d995a334))
- use TCP for vmix api ([3c1d1f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3c1d1f65042772b03e9e8284dda5b4e0feca80d9))
- **vmix:** improve vmix mock, update tests to use new mock ([265dcf1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/265dcf1a0f4d05cc6fc549a2783f51a782bc0c26))

## [7.5.0-release47.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.4...7.5.0-release47.5) (2023-01-16)

## [7.5.0-release47.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.0...7.5.0-release47.4) (2023-01-13)

### Features

- Emit debug state ([516a512](https://github.com/nrkno/sofie-timeline-state-resolver/commit/516a51203aa0af8c0a47552ecf9c0c99cd01d0be))
- multi osc device ([b987680](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b9876808d44543903e45ab5a1a1a2b85beed4aac))
- state handler initial commit ([a219c84](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a219c84f899fec4ae7e53fa402be9b3911fb8a59))

### Bug Fixes

- multi osc device udp stateless ([af34aa0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/af34aa023965b2e5e18b54f66478812a2488ecb8))

## [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/3.0.3...8.0.0-release48.0) (2022-12-12)

### ⚠ BREAKING CHANGES

- drop support for node 14 (for tsr, tsr-types support remains)
- refactor types to work better with typescript 4.7 (#227)

### Features

- add vizmse actions ([f7e585c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f7e585c97e852ab30e9fd6d20077be906038af70))
- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- refactor types to work better with typescript 4.7 ([#227](https://github.com/nrkno/sofie-timeline-state-resolver/issues/227)) ([abe499c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/abe499ce1da13c2d7a68333f6b1dcc8c7ea71e97))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))

### Bug Fixes

- add optional parameter to HTTPSend timelineObj: paramsType ([979dc61](https://github.com/nrkno/sofie-timeline-state-resolver/commit/979dc61748c4c371a8b17c7fd8c5929c69f747d9))
- add support for Node 18 ([6242dd6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6242dd68f54a491aa71bdfd30b066550d6f7e90e))
- bug fix: HTTPSend device didn't send GET requests ([8315531](https://github.com/nrkno/sofie-timeline-state-resolver/commit/83155314706497a9c630dbde14d5c5d7e57103cf))
- prevent in place reverse in setDatastore ([473ab71](https://github.com/nrkno/sofie-timeline-state-resolver/commit/473ab713785325c2062db983c8ece80ea5dede4d))

### Miscellaneous Chores

- drop support for node 14 (for tsr, tsr-types support remains) ([36c4859](https://github.com/nrkno/sofie-timeline-state-resolver/commit/36c48597226dd86270b06040c64c7d3518c32e87))

## [7.5.0-release47.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.2...7.5.0-release47.3) (2022-11-07)

### Bug Fixes

- track ccg state internally ([fd5596f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/fd5596fcf975a7a122c6fb21946f13c2e97a4233))

## [7.5.0-release47.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.1...7.5.0-release47.2) (2022-11-02)

### Features

- action manifests ([681d4c8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/681d4c8a72fb409dba919fd13db17f3c2f168d1a))

## [7.5.0-release47.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/2.3.0...7.5.0-release47.1) (2022-11-02)

### Features

- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

### Bug Fixes

- add method to manually purge viz rundown ([49737e2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/49737e2fba1b967b1b5d6d84e5c1624ee3a9ab11))

## [7.5.0-release47.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0...7.5.0-release47.0) (2022-10-28)

## [7.3.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/2.2.3...7.3.0) (2022-10-24)

### Features

- add Sofie Chef device ([4fac092](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4fac092d6f896d1f5fa77c92b7f8a69339a75c55))

### Bug Fixes

- add methods for restarting windows ([31e4289](https://github.com/nrkno/sofie-timeline-state-resolver/commit/31e4289cceb8b7472e7749fc33daa98b64229675))
- improve error for http-device ([40d00ab](https://github.com/nrkno/sofie-timeline-state-resolver/commit/40d00abb27f478b81ad11d121f7863e29047309b))
- re-add net mock connect callback ([95ebdad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/95ebdad8881885e8078ed868700e93aa1e974106))
- re-adds a check for clearAllOnMakeReady before doing so ([4b6168f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4b6168fbfc938d60f479b18d140ced21bf4a598e))
- update SofieChef device API ([514d827](https://github.com/nrkno/sofie-timeline-state-resolver/commit/514d8271dd0d1fbce673154067d92f02a25e0b4b))

## [8.0.0-release49.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/8.0.0-release48.2...8.0.0-release49.0) (2023-03-21)

### ⚠ BREAKING CHANGES

- resolve MSE show names to IDs using the directory

### Features

- Emit debug state ([516a512](https://github.com/nrkno/sofie-timeline-state-resolver/commit/516a51203aa0af8c0a47552ecf9c0c99cd01d0be))
- multi osc device ([b987680](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b9876808d44543903e45ab5a1a1a2b85beed4aac))
- resolve MSE show names to IDs using the directory ([e094dda](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e094dda7dbd14b312ff8ffef5d45a39a1e802bcf))
- SOF-1135 make `createDevice` and `initDevice` abortable ([70bfef2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/70bfef20029b8972aeb248a7c2012b5d92fb2ecc))
- SOF-1140 handle warnings from v-connection ([a48d313](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a48d313d20344ebd8a061c625d8ed3491df95465))
- SOF-1254 add TriCaster integration ([06b129e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/06b129ecec2d87b0caaa22fda36b2b5ef953653e))
- SOF-1254 add TriCaster matrix support ([dbb1b26](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dbb1b26e84a41227e3eca0fae902bf5b57ca5d8e))
- Vmix preset actions ([8b31294](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8b3129412f3881ff9db2cd059927e5b5f3ae6caf))
- **vmix:** add support for ListRemoveAll and ListAdd commands ([4a7240f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4a7240f7b2819bb16f263b72d1b06b98e3c40353))
- **vmix:** add support for starting and stopping VB.NET scripts ([9f2d4ee](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f2d4eeeccd9ba0017fc00cfe5df18e3717ea660))

### Bug Fixes

- allow resetting to baseline ([572118b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/572118b94a2855598848f1daa1575bc3ccc6186a))
- change `DeviceType.MULTI_OSC` value ([386ba6c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/386ba6c791a090553cf1d66c73ae82cb25edd03f))
- ensure that LIST_REMOVE_ALL and LIST_ADD are sent before most other commands ([13bf78a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13bf78ad650df861dc1305998dc55e9d779d77ac))
- multi osc device udp stateless ([af34aa0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/af34aa023965b2e5e18b54f66478812a2488ecb8))
- pause List inputs before emptying them ([9abc089](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9abc0895ae02a2dfd387551b9f3a7f495abf6282))
- properly parse multi-packet vMix TCP API responses ([35ba046](https://github.com/nrkno/sofie-timeline-state-resolver/commit/35ba0464905e29d1f84c2c61327e321250a44e73))
- reduce amount of `setTimeout` when using `DoInTime` in `BURST` mode ([5123405](https://github.com/nrkno/sofie-timeline-state-resolver/commit/51234050e12156e08cc0e1a13e28ca17046e7a42))
- review comments ([cb21206](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cb2120650f928e1bc7958136318403feb1d493ec))
- SOF-1140 wrap strings in Errors to avoid mangled logs ([bca62cb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bca62cb7d3abd05974e79f5eece079de98a4bacf))
- SOF-1254 control only resources that are mapped ([7892669](https://github.com/nrkno/sofie-timeline-state-resolver/commit/789266983a40cfc52df75fce48cb5dbce4c977f3))
- SOF-1254 improve types ([0471a7b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0471a7bf64f7340e83b5b6f47212003fd2586ca6))
- SOF-1254 log warning when websocket disconnected ([3d9964a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3d9964af7c4352c36e95824dd323cd2fe46717fd))
- SOF-1254 type guards and make some properties optional ([f8b8aab](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f8b8aab02a0ef7f0ad8814365ca3e08820c9a1af))
- unable to resolve show ids (bug from previous refactor) ([cdf2c62](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cdf2c62227517e7a48a7c8c7ae102374167056cd))

# [8.0.0-release48.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0...8.0.0-release48.2) (2023-03-21)

### Bug Fixes

- casparcg doesnt resync state after server restart SOFIE-2156 ([#248](https://github.com/nrkno/sofie-timeline-state-resolver/issues/248)) ([13d51dc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/13d51dca9d0587e20fb78405834adee106ae60b1))
- properly parse multi-packet vMix TCP API responses ([754adeb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/754adeb578e18851b6a6f1dd026e11ac12bed702))

# [8.0.0-release48.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...8.0.0-release48.1) (2023-02-14)

### Bug Fixes

- change mocks to be TCP, fix vmixAPI test ([def9a21](https://github.com/nrkno/sofie-timeline-state-resolver/commit/def9a21719815ec20c99dabd49bfa7c553136cb0))
- improve data fragmentation handling, logging of unrecognized responses ([96cfe87](https://github.com/nrkno/sofie-timeline-state-resolver/commit/96cfe87f68d223ea6ef5566a31e2fd7caa9abe2e))
- use TCP for vmix api ([3c1d1f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3c1d1f65042772b03e9e8284dda5b4e0feca80d9))
- **vmix:** improve vmix mock, update tests to use new mock ([265dcf1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/265dcf1a0f4d05cc6fc549a2783f51a782bc0c26))

# [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...8.0.0-release48.0) (2022-12-12)

### Features

- action manifests ([681d4c8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/681d4c8a72fb409dba919fd13db17f3c2f168d1a))
- add vizmse actions ([f7e585c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f7e585c97e852ab30e9fd6d20077be906038af70))
- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))
- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

# [8.0.0-release48.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.6...8.0.0-release48.1) (2023-02-14)

### Bug Fixes

- change mocks to be TCP, fix vmixAPI test ([def9a21](https://github.com/nrkno/sofie-timeline-state-resolver/commit/def9a21719815ec20c99dabd49bfa7c553136cb0))
- improve data fragmentation handling, logging of unrecognized responses ([96cfe87](https://github.com/nrkno/sofie-timeline-state-resolver/commit/96cfe87f68d223ea6ef5566a31e2fd7caa9abe2e))
- use TCP for vmix api ([3c1d1f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3c1d1f65042772b03e9e8284dda5b4e0feca80d9))
- **vmix:** improve vmix mock, update tests to use new mock ([265dcf1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/265dcf1a0f4d05cc6fc549a2783f51a782bc0c26))

# [8.0.0-release48.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...8.0.0-release48.0) (2022-12-12)

### Features

- action manifests ([681d4c8](https://github.com/nrkno/sofie-timeline-state-resolver/commit/681d4c8a72fb409dba919fd13db17f3c2f168d1a))
- add vizmse actions ([f7e585c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f7e585c97e852ab30e9fd6d20077be906038af70))
- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- translations for actions ([df4cb43](https://github.com/nrkno/sofie-timeline-state-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))
- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/sofie-timeline-state-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

# [8.0.0-release48.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.5.0-release47.3...8.0.0-release48.0) (2022-12-12)

### Bug Fixes

- add optional parameter to HTTPSend timelineObj: paramsType ([979dc61](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/979dc61748c4c371a8b17c7fd8c5929c69f747d9))
- add support for Node 18 ([6242dd6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6242dd68f54a491aa71bdfd30b066550d6f7e90e))
- bug fix: HTTPSend device didn't send GET requests ([8315531](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/83155314706497a9c630dbde14d5c5d7e57103cf))
- prevent in place reverse in setDatastore ([473ab71](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/473ab713785325c2062db983c8ece80ea5dede4d))
- track ccg state internally ([fd5596f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd5596fcf975a7a122c6fb21946f13c2e97a4233))

### Features

- action manifests ([681d4c8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/681d4c8a72fb409dba919fd13db17f3c2f168d1a))
- add vizmse actions ([f7e585c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f7e585c97e852ab30e9fd6d20077be906038af70))
- import quick-tsr to this repository ([bd42303](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bd42303dc68054db530d10ccc590f63017b15afe))
- translations for actions ([df4cb43](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/df4cb43cf16a8e2ae34c1fe44801c5a327f9b01e))
- update for casparcg-connection rewrite ([5dfdd23](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5dfdd2320caf89432d36513026c1259e2cf3d366))

## [7.5.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0...7.5.1) (2023-09-04)

### Bug Fixes

- casparcg disconnect handler may not fire ([74c1f8a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/74c1f8ac6626bdc9c7ac2bb2737550306905f4b1))
- **sisyfos:** remove local port & terminate correctly ([c11801a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c11801a1f787e3fbd965416138e973c3c940d1b7))
- terminate devices fully ([028167a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/028167ae7dbc1e2cb5f70820554068d434bed75d))

# [7.5.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.7...7.5.0) (2023-02-28)

**Note:** Version bump only for package timeline-state-resolver-packages

# [7.5.0-release47.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.5.0-release47.6...7.5.0-release47.7) (2023-02-24)

### Bug Fixes

- update v-connection dependency ([3163188](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/316318801a3babc54f6222621c16c4061d78aafd))

# [7.5.0-release47.6](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.5...7.5.0-release47.6) (2023-02-07)

### Bug Fixes

- telemetrics device will never start, because the file path to class is wrong ([8f722c4](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8f722c44fc4749dd815cb1fbd75d24f8d995a334))

# [7.5.0-release47.5](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.4...7.5.0-release47.5) (2023-01-16)

**Note:** Version bump only for package timeline-state-resolver-packages

# [7.5.0-release47.4](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.3...7.5.0-release47.4) (2023-01-13)

### Bug Fixes

- add optional parameter to HTTPSend timelineObj: paramsType ([979dc61](https://github.com/nrkno/sofie-timeline-state-resolver/commit/979dc61748c4c371a8b17c7fd8c5929c69f747d9))
- add support for Node 18 ([6242dd6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6242dd68f54a491aa71bdfd30b066550d6f7e90e))
- bug fix: HTTPSend device didn't send GET requests ([8315531](https://github.com/nrkno/sofie-timeline-state-resolver/commit/83155314706497a9c630dbde14d5c5d7e57103cf))
- prevent in place reverse in setDatastore ([473ab71](https://github.com/nrkno/sofie-timeline-state-resolver/commit/473ab713785325c2062db983c8ece80ea5dede4d))
- track ccg state internally ([fd5596f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/fd5596fcf975a7a122c6fb21946f13c2e97a4233))

# [7.5.0-release47.3](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.5.0-release47.2...7.5.0-release47.3) (2022-11-07)

**Note:** Version bump only for package timeline-state-resolver-packages

# [7.5.0-release47.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.5.0-release47.1...7.5.0-release47.2) (2022-11-02)

**Note:** Version bump only for package timeline-state-resolver-packages

# [7.5.0-release47.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.5.0-release47.0...7.5.0-release47.1) (2022-11-02)

### Bug Fixes

- add method to manually purge viz rundown ([49737e2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/49737e2fba1b967b1b5d6d84e5c1624ee3a9ab11))

# [7.5.0-release47.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0...7.5.0-release47.0) (2022-10-28)

### Bug Fixes

- add methods for restarting windows ([31e4289](https://github.com/nrkno/sofie-timeline-state-resolver/commit/31e4289cceb8b7472e7749fc33daa98b64229675))
- add thread event handling for AsyncResolver thread ([3a7581b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3a7581ba8a31b84deba54b46146b1811eb2868d8))
- add thread event handling for AsyncResolver thread ([68904e2](https://github.com/nrkno/sofie-timeline-state-resolver/commit/68904e20c119b4df6bb665f725acb39b86bc54b8))
- register error handler in threadedClass ([67f42f3](https://github.com/nrkno/sofie-timeline-state-resolver/commit/67f42f3dc8bd7c41a7737d31aea1d3480876c8c5))
- register error handler in threadedClass ([dae9db0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dae9db0a0876a873702f27770771ec01cfc5d1e0))
- timeout a device terminate operation if it takes too long and force-terminate ([7686d8b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7686d8b9b11027daaefbd06028b5dbe7d96c0595))
- update SofieChef device API ([514d827](https://github.com/nrkno/sofie-timeline-state-resolver/commit/514d8271dd0d1fbce673154067d92f02a25e0b4b))

### Features

- add Sofie Chef device ([4fac092](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4fac092d6f896d1f5fa77c92b7f8a69339a75c55))

# [7.4.0-release46.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.4.0-release46.0...7.4.0-release46.1) (2022-09-27)

### Bug Fixes

- improve error for http-device ([40d00ab](https://github.com/nrkno/sofie-timeline-state-resolver/commit/40d00abb27f478b81ad11d121f7863e29047309b))
- use tlTime instead of time to remove future callbacks. ([0e70a3f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0e70a3f51253ede85c233714fd0b42fd83cffae2))

# [7.4.0-release46.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.1...7.4.0-release46.0) (2022-09-26)

### Bug Fixes

- don't stop playback when clipId is null ([cfc8f2e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cfc8f2e2c5e467e783e2fcf18377078caf313ad1))
- fixed memory leak in datastore ([8e06eb6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8e06eb68c2352b59e7298c1bc2543ffa150edd7f))
- improve callBackId creation, so that it relies more on the incoming timeline objects, rather than resolved timeline objects ([349dbf3](https://github.com/nrkno/sofie-timeline-state-resolver/commit/349dbf3d8f829fcd15b0480f1af1724d76bd1afa))
- index datastore references by path ([9b48d72](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9b48d725d79d4eee13e7347e450abaadf02b6db2))
- invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
- lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
- move all references to the root of the tl obj ([130b6c3](https://github.com/nrkno/sofie-timeline-state-resolver/commit/130b6c3a908b0911f94ccedc67e7004404f11010))
- put 'em back to make linter happy ([e83a5ed](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
- re-add programInput ([b4a644f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b4a644fd24823af8903fdfab4a5bd28743bca20d))
- Remove listeners to prevent memory leak ([d0df778](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d0df778651256c4811ec39521285f3a28521bbc0))
- Retry to initialize the rundown ([583e32e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/583e32e4cb3eb5a7b46d9b4a460c13471ef0445d))
- send only one callback per timeline object ([00b168d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/00b168dc5511881ef9471dca1a4851342d6d115b))
- SOF-1046 prevent resetting transition on startup ([e52cf60](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e52cf60c07e58062c346bf0a84e48a9106b28105))
- SOF-1091 increase threadedClass freezeLimit ([f852b99](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f852b99415000da334dffa370267e69314832956))
- test after casparcg-state update ([c93ab57](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c93ab5750344d67ae8d1ef6c34ca47ca7d60d3f9))
- **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/nrkno/sofie-timeline-state-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
- unrelated build errors ([68791e9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/68791e9bc1602488e69c2fe3c5b49c74b6e5b538))
- update typings with datastore references ([2c0074b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2c0074bc74d8fa0eead89b44b558e73de4057638))

### Features

- **datastore:** newer tl objs will override entry ([9f31b9f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/9f31b9f614b1c54665ce4c379e912e19603abdce))
- **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/nrkno/sofie-timeline-state-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
- **Hyperdeck:** add explicit support for Preview and Stopped states ([133776f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/133776f2cbc5bfc1ef9255b0f1e161357ae6e339))
- **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/nrkno/sofie-timeline-state-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
- include more info about the request ([f17ad70](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f17ad70fd90afc819d878e143d6130edf672be1f))
- Send custom clear commands to Viz Engines ([40eb6e9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/40eb6e9a73cae2202389912d1f475a85be3598ae))
- timeline datastore prototype ([e122e8b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e122e8bff7404b1955853131d24144c660f76753))
- **vizMSE:** add logging of request body when client error caught ([85a2894](https://github.com/nrkno/sofie-timeline-state-resolver/commit/85a2894c66c1a06cc0ddee2e1c72745f294f0998))

# [7.3.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.2...7.3.0) (2022-10-24)

### Bug Fixes

- re-add net mock connect callback ([95ebdad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/95ebdad8881885e8078ed868700e93aa1e974106))
- re-adds a check for clearAllOnMakeReady before doing so ([4b6168f](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4b6168fbfc938d60f479b18d140ced21bf4a598e))

# [7.3.0-release44.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.1...7.3.0-release44.2) (2022-09-29)

### Bug Fixes

- don't stop playback when clipId is null ([cfc8f2e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cfc8f2e2c5e467e783e2fcf18377078caf313ad1))
- fixed memory leak in datastore ([8e06eb6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8e06eb68c2352b59e7298c1bc2543ffa150edd7f))
- improve callBackId creation, so that it relies more on the incoming timeline objects, rather than resolved timeline objects ([349dbf3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/349dbf3d8f829fcd15b0480f1af1724d76bd1afa))
- index datastore references by path ([9b48d72](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b48d725d79d4eee13e7347e450abaadf02b6db2))
- invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
- lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
- move all references to the root of the tl obj ([130b6c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/130b6c3a908b0911f94ccedc67e7004404f11010))
- put 'em back to make linter happy ([e83a5ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
- re-add programInput ([b4a644f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b4a644fd24823af8903fdfab4a5bd28743bca20d))
- Remove listeners to prevent memory leak ([d0df778](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d0df778651256c4811ec39521285f3a28521bbc0))
- Retry to initialize the rundown ([583e32e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/583e32e4cb3eb5a7b46d9b4a460c13471ef0445d))
- send only one callback per timeline object ([00b168d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/00b168dc5511881ef9471dca1a4851342d6d115b))
- SOF-1046 prevent resetting transition on startup ([e52cf60](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e52cf60c07e58062c346bf0a84e48a9106b28105))
- SOF-1091 increase threadedClass freezeLimit ([f852b99](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f852b99415000da334dffa370267e69314832956))
- test after casparcg-state update ([c93ab57](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c93ab5750344d67ae8d1ef6c34ca47ca7d60d3f9))
- **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
- unrelated build errors ([68791e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68791e9bc1602488e69c2fe3c5b49c74b6e5b538))
- update typings with datastore references ([2c0074b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2c0074bc74d8fa0eead89b44b558e73de4057638))
- use tlTime instead of time to remove future callbacks. ([0e70a3f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0e70a3f51253ede85c233714fd0b42fd83cffae2))

### Features

- **datastore:** newer tl objs will override entry ([9f31b9f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f31b9f614b1c54665ce4c379e912e19603abdce))
- **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
- **Hyperdeck:** add explicit support for Preview and Stopped states ([133776f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/133776f2cbc5bfc1ef9255b0f1e161357ae6e339))
- **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
- include more info about the request ([f17ad70](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f17ad70fd90afc819d878e143d6130edf672be1f))
- Send custom clear commands to Viz Engines ([40eb6e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40eb6e9a73cae2202389912d1f475a85be3598ae))
- timeline datastore prototype ([e122e8b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e122e8bff7404b1955853131d24144c660f76753))
- **vizMSE:** add logging of request body when client error caught ([85a2894](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85a2894c66c1a06cc0ddee2e1c72745f294f0998))

# [7.4.0-release46.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.3.0-release44.1...7.4.0-release46.0) (2022-09-26)

### Bug Fixes

- don't stop playback when clipId is null ([cfc8f2e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cfc8f2e2c5e467e783e2fcf18377078caf313ad1))
- invert warnOnEmptySlots to suppressEmptySlotWarnings ([edcd7b0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/edcd7b0fde747ae160c93f2ca1284661153f5647))
- lowered logging level for a apparent log call via an event. ([ca06e3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ca06e3bbe60acf27220ab9773c1751454bea8b8f))
- put 'em back to make linter happy ([e83a5ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e83a5ed87f1983b16c9b5b8c134e1441fb8d324a))
- re-add programInput ([b4a644f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b4a644fd24823af8903fdfab4a5bd28743bca20d))
- Remove listeners to prevent memory leak ([d0df778](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d0df778651256c4811ec39521285f3a28521bbc0))
- Retry to initialize the rundown ([583e32e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/583e32e4cb3eb5a7b46d9b4a460c13471ef0445d))
- SOF-1046 prevent resetting transition on startup ([e52cf60](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e52cf60c07e58062c346bf0a84e48a9106b28105))
- SOF-1091 increase threadedClass freezeLimit ([f852b99](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f852b99415000da334dffa370267e69314832956))
- test after casparcg-state update ([c93ab57](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c93ab5750344d67ae8d1ef6c34ca47ca7d60d3f9))
- **types:** remove unsupported/manual transport statuses ([b362072](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b362072424236f13f9c04bf477d6b98e41254359))
- unrelated build errors ([68791e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68791e9bc1602488e69c2fe3c5b49c74b6e5b538))

### Features

- **HyperDeck:** add "warnOnEmptySlots" option ([233a413](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/233a4132097f38723b7150b7e61635f39e08115d))
- **Hyperdeck:** add explicit support for Preview and Stopped states ([133776f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/133776f2cbc5bfc1ef9255b0f1e161357ae6e339))
- **Hyperdeck:** add support for play and goto commands ([50e9e15](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/50e9e156651ba250a4fa3d5fcc01a184ba928ade))
- include more info about the request ([f17ad70](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f17ad70fd90afc819d878e143d6130edf672be1f))
- Send custom clear commands to Viz Engines ([40eb6e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40eb6e9a73cae2202389912d1f475a85be3598ae))
- **vizMSE:** add logging of request body when client error caught ([85a2894](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85a2894c66c1a06cc0ddee2e1c72745f294f0998))

# [7.3.0-release44.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.3.0-release44.1...7.3.0-release44.2) (2022-09-29)

- timeout a device terminate operation if it takes too long and force-terminate ([59ec81a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/59ec81a2947a8f48b699fd52f6e9185dd1587f2e))

# [7.3.0-release44.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.3.0-release44.0...7.3.0-release44.1) (2022-09-22)

### Bug Fixes

- update v-connection dep ([53fbc96](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/53fbc9650f905ace72563f3b4f0e44f45e951685))

# [7.3.0-release44.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.1...7.3.0-release44.0) (2022-07-04)

# [7.1.0-release42.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.1.0-release42.1...7.1.0-release42.2) (2022-05-19)

### Bug Fixes

- update casparcg-state ([7698a5d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7698a5dff610fd74e79f9b6348beb872a319f018))

# [7.1.0-release42.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.2...7.1.0-release42.1) (2022-04-29)

### Bug Fixes

- Build errors ([249032d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/249032d8deb9bfd8568d9fb5275f1dd58e4b4647))
- Retry if retryInterval >=0 ([3616a03](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3616a03dd0b138414845b02c5553fac26342e3d9))
- update hyperdeck dep ([db75cc6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/db75cc666bdfd8e5133b604ec56699cee50f2d0b))
- update supertimeline ([251c8b5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/251c8b5a83d84e8457cabe8badcf2e52cf10d3ba))
- yarn upgrade ([40aa2e5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/40aa2e5a21149b89735fd8e6a85c9c2366a274d3))

### Features

- SOF-752 show init and cleanup ([44264b0](https://github.com/nrkno/sofie-timeline-state-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))

### Reverts

- Revert "7.1.0" ([8ce054c](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))
- Revert "test: Rename package on publish" ([855f772](https://github.com/nrkno/sofie-timeline-state-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))

## [1.0.2-release37.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.2-release37...1.0.2-release37.1) (2021-09-02)

## [1.0.2-release37](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.1-release37...1.0.2-release37) (2021-08-31)

## [1.0.1-release37](https://github.com/nrkno/sofie-timeline-state-resolver/compare/1.0.0-release37...1.0.1-release37) (2021-08-31)

# [1.0.0-release37](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.1.0-release36.1...1.0.0-release37) (2021-08-31)

### Bug Fixes

- allow multiple mappings to reference 1 casparcg layer ([a604b08](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a604b08d902b8d677fe9b7d296b605d3c8961504))
- bad merge ([dd6ea93](https://github.com/nrkno/sofie-timeline-state-resolver/commit/dd6ea93bfd0ee62a403df7abc251ede409c624b5))
- do not clear elements and engines when going rehearsal<->active ([09bf843](https://github.com/nrkno/sofie-timeline-state-resolver/commit/09bf84332eaab4ded856772f53ff0323df123b78))
- do not purge baseline items ([0fe088d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/0fe088d02330b289de97874ed92eba7b335b12ae))
- do not purge elements when going active<->rehearsal ([587b795](https://github.com/nrkno/sofie-timeline-state-resolver/commit/587b7953b258245b771aa611576affc10f82e77a))
- elements to keep criteria ([3146254](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3146254dacb22031124c10da33ee6b989f28773f))
- Errors from cherry pick ([4754a67](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4754a67e8dd38c081b91f07c5749b0e268cf9180))
- exceptions and timeouts ([6cb01ad](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6cb01ad5fc738a1bc6d97fc5718c95d1ecb73e2d))
- extend templateData when allowing multiple mappings to reference 1 casparcg layer ([eb04832](https://github.com/nrkno/sofie-timeline-state-resolver/commit/eb0483201f7d368bcadadfa5c6837c3f1c4c2903))
- keep checking status of loaded elements ([3085502](https://github.com/nrkno/sofie-timeline-state-resolver/commit/30855020b5b93ea10591fea2f45810a438966ba8))
- load only elements from the active playlist when restarting ([7d21e69](https://github.com/nrkno/sofie-timeline-state-resolver/commit/7d21e69dbfc959fee871746d83f9cfa1dade9b2d))
- make -1 disable caspar retry ([8069aaa](https://github.com/nrkno/sofie-timeline-state-resolver/commit/8069aaaab456dcaf9eb2533caf3670b3a32ee736))
- make makeReady execute faster ([913bcfc](https://github.com/nrkno/sofie-timeline-state-resolver/commit/913bcfcdd876fd85bdecf3855a6589f6d7b56fba))
- missing optional chaining ([11862a9](https://github.com/nrkno/sofie-timeline-state-resolver/commit/11862a95d5ee9caed0ec19f5abae7769eab17863))
- prevent duplicate external elements ([6472eaf](https://github.com/nrkno/sofie-timeline-state-resolver/commit/6472eaf267dc45fe423b7cd3d3fa0d5ba109cf5e))
- recreate removed mediaObjects after reconnecting ([1a7e65d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/1a7e65d0a3b5a0942f2f06deb7b58366d2827802))
- rehearsal<->active when gateway was restarted ([3c40715](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3c40715210230e1c864f92d9e814f05b2e2c0a42))
- reload external elements that became unloaded ([93bf3aa](https://github.com/nrkno/sofie-timeline-state-resolver/commit/93bf3aad6fbc53d2391e6a1eec013548cac27634))
- remove duplicates in incoming data ([e86f170](https://github.com/nrkno/sofie-timeline-state-resolver/commit/e86f170cd6753025347a42f4685716837543b089))
- Remove ExpectedPlayoutItemContentBase from tsr-types [publish] ([cd92561](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cd92561a02e58f02d5c97351cc67934f77ecb5fb))
- report channel name instead of engine name ([24387d5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/24387d59e9f2f329dcb4fdd2739288cb190e245e))
- Set fader label ([78a3ecd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/78a3ecd9c423a6866d7c7218acb368d61044ecd0))
- treat all status codes below 400 as correct ([d0791b1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d0791b188b2304722e5b12d4f3d36f6c07ebd269))

### Features

- Add layerName property to mappings ([c0d81eb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c0d81ebee21349515e8532fca9ef13250e31068d))
- indicate elements as missing when MSE disconnected ([68bf2fb](https://github.com/nrkno/sofie-timeline-state-resolver/commit/68bf2fb72f3871b0730751036e0a582a37d3ca2f))
- monitor viz engines over http ([ab6c76b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/ab6c76bad94f5c9e5a4407ef4d3b7c00a83cb3b8))
- rename activeRundown -> activePlaylist. ([fb2ae0b](https://github.com/nrkno/sofie-timeline-state-resolver/commit/fb2ae0b25a3899ad4f9be1981e67def713a053f8))
- sisyfos retrigger mechanism ([26033cd](https://github.com/nrkno/sofie-timeline-state-resolver/commit/26033cdba23618bc03bf4dee89c1db7907b40dcc))
- Use layerName as default label for sisyfos faders ([4e18a2a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4e18a2a910d1794993bab8716af41802049c9c0a))

# [7.1.0-release42.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.1.0-release42.1...7.1.0-release42.2) (2022-05-19)

### Bug Fixes

- update casparcg-state ([7698a5d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7698a5dff610fd74e79f9b6348beb872a319f018))

# [7.1.0-release42.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.0.0-release41.1...7.1.0-release42.1) (2022-04-29)

### Bug Fixes

- update hyperdeck dep ([db75cc6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/db75cc666bdfd8e5133b604ec56699cee50f2d0b))
- update supertimeline ([251c8b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/251c8b5a83d84e8457cabe8badcf2e52cf10d3ba))
- yarn upgrade ([40aa2e5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40aa2e5a21149b89735fd8e6a85c9c2366a274d3))

### Features

- SOF-752 show init and cleanup ([44264b0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/44264b08bddccbbe62c6779beb8acba18f438080))

### Reverts

- Revert "7.1.0" ([8ce054c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8ce054c6016fc0d23ef37a3ae1d233090a829fb9))

# [1.0.0-release37.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.0-release37.5...1.0.0-release37.6) (2022-02-17)

# [1.0.0-release37.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.4.0-release39.1...1.0.0-release37.5) (2022-02-15)

## [1.0.2-release37.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.7...1.0.2-release37.4) (2021-11-08)

## [1.0.2-release37.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.2-release37.2...1.0.2-release37.3) (2021-10-14)

## [1.0.2-release37.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.5...1.0.2-release37.2) (2021-10-14)

### Bug Fixes

- Build errors ([249032d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/249032d8deb9bfd8568d9fb5275f1dd58e4b4647))
- Retry if retryInterval >=0 ([3616a03](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3616a03dd0b138414845b02c5553fac26342e3d9))

### Reverts

- Revert "test: Rename package on publish" ([855f772](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/855f7725d73878d10caea077aec50429e3146b41))

## [1.0.2-release37.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.2-release37...1.0.2-release37.1) (2021-09-02)

## [1.0.2-release37](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.1-release37...1.0.2-release37) (2021-08-31)

## [1.0.1-release37](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.0-release37...1.0.1-release37) (2021-08-31)

## [1.0.0-release37](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.1...1.0.0-release37) (2021-08-31)

### Bug Fixes

- allow multiple mappings to reference 1 casparcg layer ([a604b08](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a604b08d902b8d677fe9b7d296b605d3c8961504))
- bad merge ([dd6ea93](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd6ea93bfd0ee62a403df7abc251ede409c624b5))
- do not clear elements and engines when going rehearsal<->active ([09bf843](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/09bf84332eaab4ded856772f53ff0323df123b78))
- do not purge baseline items ([0fe088d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0fe088d02330b289de97874ed92eba7b335b12ae))
- do not purge elements when going active<->rehearsal ([587b795](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/587b7953b258245b771aa611576affc10f82e77a))
- elements to keep criteria ([3146254](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3146254dacb22031124c10da33ee6b989f28773f))
- Errors from cherry pick ([4754a67](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4754a67e8dd38c081b91f07c5749b0e268cf9180))
- exceptions and timeouts ([6cb01ad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6cb01ad5fc738a1bc6d97fc5718c95d1ecb73e2d))
- extend templateData when allowing multiple mappings to reference 1 casparcg layer ([eb04832](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/eb0483201f7d368bcadadfa5c6837c3f1c4c2903))
- keep checking status of loaded elements ([3085502](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/30855020b5b93ea10591fea2f45810a438966ba8))
- load only elements from the active playlist when restarting ([7d21e69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7d21e69dbfc959fee871746d83f9cfa1dade9b2d))
- make -1 disable caspar retry ([8069aaa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8069aaaab456dcaf9eb2533caf3670b3a32ee736))
- make makeReady execute faster ([913bcfc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/913bcfcdd876fd85bdecf3855a6589f6d7b56fba))
- missing optional chaining ([11862a9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/11862a95d5ee9caed0ec19f5abae7769eab17863))
- prevent duplicate external elements ([6472eaf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6472eaf267dc45fe423b7cd3d3fa0d5ba109cf5e))
- recreate removed mediaObjects after reconnecting ([1a7e65d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1a7e65d0a3b5a0942f2f06deb7b58366d2827802))
- rehearsal<->active when gateway was restarted ([3c40715](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c40715210230e1c864f92d9e814f05b2e2c0a42))
- reload external elements that became unloaded ([93bf3aa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/93bf3aad6fbc53d2391e6a1eec013548cac27634))
- remove duplicates in incoming data ([e86f170](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e86f170cd6753025347a42f4685716837543b089))
- Remove ExpectedPlayoutItemContentBase from tsr-types [publish] ([cd92561](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd92561a02e58f02d5c97351cc67934f77ecb5fb))
- report channel name instead of engine name ([24387d5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/24387d59e9f2f329dcb4fdd2739288cb190e245e))
- Set fader label ([78a3ecd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/78a3ecd9c423a6866d7c7218acb368d61044ecd0))
- treat all status codes below 400 as correct ([d0791b1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d0791b188b2304722e5b12d4f3d36f6c07ebd269))

### Features

- Add layerName property to mappings ([c0d81eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c0d81ebee21349515e8532fca9ef13250e31068d))
- indicate elements as missing when MSE disconnected ([68bf2fb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68bf2fb72f3871b0730751036e0a582a37d3ca2f))
- monitor viz engines over http ([ab6c76b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ab6c76bad94f5c9e5a4407ef4d3b7c00a83cb3b8))
- rename activeRundown -> activePlaylist. ([fb2ae0b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb2ae0b25a3899ad4f9be1981e67def713a053f8))
- sisyfos retrigger mechanism ([26033cd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/26033cdba23618bc03bf4dee89c1db7907b40dcc))
- Use layerName as default label for sisyfos faders ([4e18a2a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4e18a2a910d1794993bab8716af41802049c9c0a))

# [7.0.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0...7.0.1) (2022-06-28)

### Bug Fixes

- test after casparcg-state update ([4674f37](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4674f37c393683bd74f9a4e7519a4cc4a1d42141))

# [7.0.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.2...7.0.0) (2022-06-27)

**Note:** Version bump only for package timeline-state-resolver-packages

# [7.0.0-release41.2](https://github.com/nrkno/sofie-timeline-state-resolver/compare/7.0.0-release41.0...7.0.0-release41.2) (2022-04-28)

### Bug Fixes

- event listeners must not return anything ([cb2fe13](https://github.com/nrkno/sofie-timeline-state-resolver/commit/cb2fe13c965bc3f8e221c1db08e970b454e92f69))
- move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/nrkno/sofie-timeline-state-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
- **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/nrkno/sofie-timeline-state-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))
- upgrade casparcg-state ([bbeee15](https://github.com/nrkno/sofie-timeline-state-resolver/commit/bbeee15e895be58100f4ddb88fb4e229a7aeb07b))

# [7.0.0-release41.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/7.0.0-release41.0...7.0.0-release41.1) (2022-04-12)

### Bug Fixes

- event listeners must not return anything ([cb2fe13](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb2fe13c965bc3f8e221c1db08e970b454e92f69))
- move the types DeviceStatus, StatusCode to timeline-state-resolver-types ([4d84179](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4d84179372ba243fe60d102ec52447ca87f0a8c9))
- **obs:** add missing mapping type to MappingOBSAny ([2ff5522](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2ff55222a8b5fc915c8926aa2bc9ea4f1e796000))
- upgrade casparcg-state ([bbeee15](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bbeee15e895be58100f4ddb88fb4e229a7aeb07b))

# [7.0.0-release41.0](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.4.0-release39.1...7.0.0-release41.0) (2022-03-21)

### Bug Fixes

- **casparcg:** update status on queue overflow ([c2ec5f5](https://github.com/nrkno/sofie-timeline-state-resolver/commit/c2ec5f58aa09dc357419eeb4ff06fdf9c0791b6e))
- failing tests ([d521ea4](https://github.com/nrkno/sofie-timeline-state-resolver/commit/d521ea4c3550b8f817c2495e54f37c4c1851d37b))
- Lawo: Typings issue, getElementByPath can return undefined. ([3846f3e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3846f3ec6b3c98eb0ac7b3dec9d398b74685d7c3))
- more tests ([031bbd1](https://github.com/nrkno/sofie-timeline-state-resolver/commit/031bbd1945ac47d3636744c4e6cd3bd302617dc4))

# [6.4.0-release39.1](https://github.com/nrkno/sofie-timeline-state-resolver/compare/6.3.0...6.4.0-release39.1) (2022-02-03)

### Bug Fixes

- add a multiplier to the options, to allow for adjusting estimateResolveTime ([3941a71](https://github.com/nrkno/sofie-timeline-state-resolver/commit/3941a710ab32fe3bfab89a9bec5cfb06a04d9b4f))
- allow for changing estimateResolveTimeMultiplier at runtime ([289a619](https://github.com/nrkno/sofie-timeline-state-resolver/commit/289a6195268998201c23356be03c83b740cacead))
- errors caught not casted before usage threw TS compiler errors ([167be0e](https://github.com/nrkno/sofie-timeline-state-resolver/commit/167be0e3e484f7a4cd27adc04325a0cf94ebf323))
- increase the estimateResolveTime values, to reflect measured performance ([1cba2f6](https://github.com/nrkno/sofie-timeline-state-resolver/commit/1cba2f664f4d622c44d56a6c6dae9fbb1849117e))
- update emberplus-connection ([f32e78a](https://github.com/nrkno/sofie-timeline-state-resolver/commit/f32e78af43e2a3b3d8bc3204c3f062299e1e0259))
- update emberplus-connection ([a1782db](https://github.com/nrkno/sofie-timeline-state-resolver/commit/a1782db8be17c68ede42fc9733cb6cc67791aa4a))

### Features

- disable control of unmapped atem auxes ([550e52d](https://github.com/nrkno/sofie-timeline-state-resolver/commit/550e52d9e417ec24deff6e22773c3e1deb5bfb39))

# [6.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.1...6.3.0) (2022-01-26)

### Bug Fixes

- Homogenized the headline with the other Sofie repos ([8325f53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8325f533f054f25acd317654f82ed345645f5b60))
- revert timeline dep, as it caused issues on air. ([71da109](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/71da1092ac99bccc9f947ce7f1c1ee445b83fcff))
- Updated links to match the changed repo name ([6fe910f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6fe910f69a313e1f7b84e88a6550c3e40ac29afa))
- Updated URLs to reflect the changed repo name ([4436674](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4436674988ce45a66bafbb2161f9cbf6c850694d))

# [6.3.0-release38.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0...6.3.0-release38.0) (2021-12-17)

### Bug Fixes

- update timeline dependency ([2c75df1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2c75df103d82f7ef239a1d3701a8987ac67c5061))

# [6.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.7...6.2.0) (2021-12-08)

### Bug Fixes

- bug fix: the http-watcher wouldn't check the status on startup, only after ~30 seconds ([1dd1567](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1dd1567507bd3dddf03805ea3f5c4003cdc241ec))

# [6.2.0-release37.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.6...6.2.0-release37.7) (2021-10-22)

### Bug Fixes

- catch some quantel releasePort errors ([#199](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/199)) ([10007c2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/10007c2bd52caed401fcf576cfc03b8a9031914f))

# [6.2.0-release37.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.5...6.2.0-release37.6) (2021-10-20)

### Bug Fixes

- disable casparcg retry for negative values ([dc0e2ae](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc0e2aecd5a8142c1a0bfbda80ed8988d3bb2f3c))

# [6.2.0-release37.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.4...6.2.0-release37.5) (2021-10-13)

### Bug Fixes

- don't emit resolveTimeline when not active ([f37f79b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f37f79b851164e042991a49a2f73add445075918))
- improve robustness ([6296d8c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6296d8c01195739b2f1022980de486c7448eb348))
- update atem-state ([9f250c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f250c3d02bfdef052f154c5c2a66de102df20c3))

### Features

- separate the init from device creation ([20cdd68](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/20cdd6802ee6ff5151e03e2b84d035db638b6d87))

# [6.2.0-release37.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.3...6.2.0-release37.4) (2021-09-30)

### Bug Fixes

- emitting of 'debug' events should only be done if the debug property is truthy. ([5d015a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5d015a1dfde3ffc86f9aea9366bf72f76537d9a4))

# [6.2.0-release37.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.2...6.2.0-release37.3) (2021-09-30)

### Bug Fixes

- update quantel-gateway-client dependency to latest ([6f3e904](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6f3e90434e71d651688febc1b67dfbbac2d503b8))
- wait for releaseing quantel port before creating a new one ([da4c862](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/da4c862df1b5dacbd03862bd192092a0b78b50a9))

# [6.2.0-release37.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.1...6.2.0-release37.2) (2021-09-21)

### Features

- emit more detailed slowCommands ([91bda43](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91bda43cf499d14c43aef96e0af7b3df78591a05))

# [6.2.0-release37.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.2.0-release37.0...6.2.0-release37.1) (2021-09-21)

### Bug Fixes

- allow retry in \_getRundown ([8e37d5a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8e37d5a13d79d0cdb8a06b84a5571e75289347eb))
- Build errors ([13dce42](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/13dce42a5eb9a75ddddf69591fdb075f030a56ee))
- don't update elements after first connect an extra time ([cc5ffc8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cc5ffc8d1bd6fd63892e9b023a1f1233246c25be))
- load only elements from the active playlist when restarting ([fee2962](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fee29626071c81e9daf8848933091d5a4ef5e98e))
- rehearsal<->active when gateway was restarted ([595fbce](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/595fbceb4aaf65f9d444e70b592dbf791fe202df))
- trigger `activate` to reload elements after VizEngine restart ([40d26a0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40d26a0ecb74acf48fc1fa8358ffcd661133aa9c))
- wait after activation ([5bace5a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5bace5a88ea373db040dd7b5735ff1150dafe6e8))

### Features

- map sisyfos channel by its label ([afcf056](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/afcf056a568f5e18545379c2655b8c1769b98be2))
- purge unknown elements from the viz-rundown upon activation ([cff4d0c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cff4d0cbcd46b7da97a8de31cb92381286294350))
- rename activeRundown -> activePlaylist. ([868beec](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/868beec3462035ea5f2f5a336931dbd9548b1bd2))

# [6.2.0-release37.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.2...6.2.0-release37.0) (2021-09-13)

### Bug Fixes

- do not remove unknown vmix sources ([c6a262b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c6a262baff1318701c1f494175918b49ca058fa5))
- do not send unnecessary lawo commands ([91cf76a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91cf76a4723dff5c8ae18ae3fa8a5603046bfd07))
- reduce logging amount by only emitting some logs when active ([9af530b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9af530bb55f09359be3cf7b50b427412986c1cc6))
- remove redundant log lines ([216a3f5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/216a3f57c808b86d7e4d5a749dc7a4a2317070f4))
- vmix overlay/multiview input selection diffing ([b915d51](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b915d517489b021480f69c3057341749c4adcd42))

### Features

- OBS video production app support ([#181](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/181)) ([3d312a6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d312a69db128f2f33af6308cba7baebfd9d0155))

### Reverts

- Revert "feat: OBS video production app support (#181)" (#186) ([3831891](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/383189119c470c948c59c66460915819678ec6c2)), closes [#181](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/181) [#186](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/186)

# [6.1.0-release36.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.1...6.1.0-release36.2) (2021-09-07)

### Bug Fixes

- only retry http commands for network failures ([dd28e4c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd28e4c816e0130e5c8185b9a4780789fffc3814))

# [6.1.0-release36.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.1.0-release36.0...6.1.0-release36.1) (2021-07-12)

### Bug Fixes

- prerelease workflow not setting version correctly ([4f4fced](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4f4fcedebc742e2fd279f137e6e43fd6d74cd6fd))

# [6.1.0-release36.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/6.0.3...6.1.0-release36.0) (2021-07-12)

### Bug Fixes

- always send http param data if present ([af326e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/af326e1ce7e3ffcf9a3626210563e6fe552553e1))
- **OBS:** incompatible/outdated OBS DeviceOptions topology ([c83cd7b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c83cd7bde54a18f4f54dcd6ae900cd36c4f683c8))

### Features

- **OBS:** Support OBS Live Video Production Software ([#187](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/187)) ([f2fe81a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f2fe81a3ae87ccd3c8db812e88ef9a94b74673d5))

# [5.9.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.8.0...5.9.0) (2021-06-25)

### Bug Fixes

- don't create device which already exists ([b00edf3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b00edf3e780fc191a1752383e9eae32531c81d44))

### Features

- resend failing http commands ([cb2ee39](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb2ee3967f587520c8dd1e3b6d3543af6fcae687))

### Reverts

- Revert "chore: enable docs after rls" ([dcf6f0d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dcf6f0d6744fb50ac6ded9652bf215fdcefb515b))
