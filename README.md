
# Sofie: The Modern TV News Studio Automation System (Timeline State Resolver)

[![CircleCI](https://circleci.com/gh/nrkno/tv-automation-state-timeline-resolver.svg?style=svg)](https://circleci.com/gh/nrkno/tv-automation-state-timeline-resolver)

## Abstract
This library orchestrates and control different devices.
It's input is a [supertimeline](https://github.com/SuperFlyTV/supertimeline) data structure and a layer-to-device-map.
Using the input, it resolves the expected state, diffs the state against current state and sends commands where necessary. Created by SuperFly.tv

## Supported devices
* [CasparCG](http://casparcg.com/) - using the [casparcg-connection](https://github.com/SuperFlyTV/casparcg-connection) library
* ATEM vision mixers - using the [atem-connection](https://github.com/nrkno/tv-automation-atem-connection) library
* Lawo sound mixers - using the [emberplus](https://github.com/nrkno/tv-automation-emberplus-connection) library
* Arbitrary HTTP-interfaces

## Dev install instructions

* Install yarn
	https://yarnpkg.com

* Install jest
	`yarn global add jest`
	This is our resting framework

* Install dependencies
	`yarn`
	or
	`yarn install`

Then you can:

* Build:
	`yarn build`

* run test
	`jest`

* watch
	`yarn watch`
