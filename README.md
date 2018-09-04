# Sofie: The Modern TV News Studio Automation System (State Timeline Resolver)
[![CircleCI](https://circleci.com/gh/nrkno/tv-automation-state-timeline-resolver.svg?style=svg)](https://circleci.com/gh/nrkno/tv-automation-state-timeline-resolver)

This takes an output from the SuperFlyTV/supertimeline library and converts it into device states, diffs these states against previous states and sends commands where necessary. Created by SuperFly.tv

Dev install instructions:

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
