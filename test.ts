import * as _ from 'underscore'

let objs: any = []

// prepare
_.range(0, 1000000).forEach((i) => {
	objs.push({
		_id: 'id' + i,
		rank: i,
		asdfasdf: 'awsdfasdf1asdf',
		w25yu4gh2w4: 'awsdfas2dfasdf',
		v28h53g: 'awsdfasdfasd3f',
		vnw248i35g72: 'awsdfasd1fasdf',
		gbv2vn84537g2543: 'awsd5fasdfasdf',
		bgfb89247tr5g2: 'awsdfas4dfasdf',
		bgn3875hg: 'awsdfasdfasdf',
		g2j85t: 'awsdfasdfasdf4',
		bjg29t9: 'awsdfasdfas5df',
	})
})

const ids: string[] = objs.map((o) => o._id)

// objs = _.sortBy(objs, () => Math.random())

// objs.sort((a, b) => {
// 	if (a.id)
// })

{
	let start = Date.now()
	let foundId = ''
	for (const o of objs) {
		if (o.rank > 135) foundId = o._id
	}
	console.log('objs of', Date.now() - start)
}
{
	let start = Date.now()

	let foundId = ''
	for (const i in objs) {
        const o = objs[i]
        if (o.rank > 135) foundId = o._id
	}

	console.log('objs in', Date.now() - start)
}
{
	let start = Date.now()

	let foundId = ''
	for (let i = 0; i < objs.length; i++) {
        const o = objs[i]
        if (o.rank > 135) foundId = o._id
	}

	console.log('objs index', Date.now() - start)
}
{
	let start = Date.now()

	let foundId = ''
	for (let i = 0; i < ids.length; i++) {
		if (i > 135) foundId = ids[i]
	}

	console.log('ids', Date.now() - start)
}
{
	let start = Date.now()

	let foundId = ''
	for (let i = 0; i < ids.length; i++) {
		if (i > 135) foundId = 'abc'
	}

	console.log('ids', Date.now() - start)
}
