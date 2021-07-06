# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [6.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.8.0...6.0.0) (2021-07-06)


### Bug Fixes

* bad merge ([1d40684](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1d406842447da08170f24062a17ecddea7c996a7))
* do not clear elements and engines when going rehearsal<->active ([b3eca72](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b3eca72a303f0749fc0c09c468b05b6032574ded))
* do not purge baseline items ([904e165](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/904e165b15f6bcabe38eddd060db0f86a85d8a87))
* do not purge elements when going active<->rehearsal ([a8a14d9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a8a14d9ce06651ad98f13e9d63b2d09e3f3f1bf4))
* elements to keep criteria ([2352aa2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2352aa2759f6e25abab93063313859ba2ce6cb85))
* exceptions and timeouts ([937a821](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/937a821f2dd5dd6fd82c2fe94bcc3d980347177d))
* keep checking status of loaded elements ([c6d6f53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c6d6f5309447023fa367eee5eec893d25b7fb06a))
* make makeReady execute faster ([16bd275](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/16bd2755db4e520b75e7a0866f0a4bac5bd5007b))
* missing optional chaining ([7a9b97e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7a9b97efaf334b9df7a001b23639df22a7aae214))
* prevent duplicate external elements ([ca5fe2d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ca5fe2df430f8705216daa5c8fc10577010c43a8))
* recreate removed mediaObjects after reconnecting ([fcda605](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fcda6058adb98793fda79b028b14c23b4f19d2d6))
* reload external elements that became unloaded ([9ee8423](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9ee8423a03fa98205407e6efe0cbd9de5595662c))
* remove duplicates in incoming data ([bf0ca04](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bf0ca0434c768a60e0508db3a62c3c909fe2d0fc))
* report channel name instead of engine name ([f65214f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f65214ff64b387ac151df2521fec9b1ab87ce5df))
* treat all status codes below 400 as correct ([6b6ce54](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6b6ce54f3d5987083bc19462b19f26318cee37c9))
* update supertimeline ([f13129d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f13129dcfbc8a6dd3418c6372a2a17891c072be1))


### Features

* add boolean values to osc [publish] ([2e157e7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2e157e7ae7d2c523318ff0739208910d9df4eddd))
* indicate elements as missing when MSE disconnected ([75db0a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/75db0a1a2b92f449ac04e61f182dfe241e879191))
* monitor viz engines over http ([321fff1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/321fff112c0d6a8b6fad482a93fa8a69d348dda4))
* mono repo ([#180](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/180)) ([7349e20](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7349e2007dff661329bb44b3407ab4adbd390082))
