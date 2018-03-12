import {CasparCG, AMCP} from 'casparcg-connection'
// import {Resolver, Enums} from "superfly-timeline"
import {Resolver, Enums} from "../../../supertimeline/dist"

import {Conductor, DeviceTypes} from "../conductor"




//jest.mock('../conductor');
jest.mock('casparcg-connection');
	

var myLayerMapping = {
	'myLayer': {
		device: 'myCCG',
		channel: 2,
		layer: 42
	}
}




var myConductor = new Conductor({
	devices: {
		'myCCG': {
			type: DeviceTypes.CASPARCG
		}
	},
	initializeAsClear: true 
});



test('Timeline: Play AMB for 60s', async () => {
	

	myConductor.mapping = myLayerMapping;
	await myConductor.init();


	// Check that no commands has been sent:
	expect(CasparCG.mockDo).toHaveBeenCalledTimes(0)

	
	jest.useFakeTimers();

	var now = myConductor.getCurrentTime();
	Date.now = jest.fn();
	Date.now
		.mockReturnValue(now*1000);

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: Enums.TriggerType.TIME_ABSOLUTE,
				value: now-10, // 10 seconds ago
			},
			duration: 20,
			LLayer: 'myLayer',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true,
				}
			}
		}
	];

	// fast-forward:

	Date.now
		.mockReturnValue(now*1000 + 5000);
	// jest.advanceTimersByTime(5000);
	jest.runOnlyPendingTimers();

	// Check that an ACMP-command has been sent
	expect(CasparCG.mockDo).toHaveBeenCalledTimes(1);
	expect(CasparCG.mockDo.mock.calls[0][0]).toBeInstanceOf(AMCP.PlayCommand);

	// looping doesn't work with seeking.
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.loop).toEqual(true);
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.clip).toMatch(/AMB/);
	// expect(CasparCG.mockDo.mock.calls[0][0].seek).toBeGreaterThanOrEqual(10*50);
	// expect(CasparCG.mockDo.mock.calls[0][0].seek).toBeLessThan(10*50 + 10);
	expect(CasparCG.mockDo.mock.calls[0][0].layer).toEqual(42);
	expect(CasparCG.mockDo.mock.calls[0][0].channel).toEqual(2);


	// fast-forward:
	// jest.advanceTimersByTime(20000);

	Date.now
		.mockReturnValue(now*1000 + 15000);
	// jest.advanceTimersByTime(10000);
	jest.runOnlyPendingTimers();

	expect(CasparCG.mockDo.mock.calls.length).toBe(2);
	expect(CasparCG.mockDo.mock.calls[1][0]).toBeInstanceOf(AMCP.StopCommand);

	expect(CasparCG.mockDo.mock.calls[1][0].layer).toEqual(2);
	expect(CasparCG.mockDo.mock.calls[1][0].channel).toEqual(2);

	// fast-forward:
	// jest.advanceTimersByTime(10000);

	// Nothing more should've happened:

	Date.now
		.mockReturnValue(now*1000 + 35000);
	jest.advanceTimersByTime(20000);

	expect(CasparCG.mockDo.mock.calls.length).toBe(2);



	
	//expect(Conductor.mock.instances).toHaveLength(1);
	//expect(mockConductorInstance._initializeDevices).toHaveBeenCalledTimes(1)
	//let mockConductorInstance = Conductor.mock.instances[0];
	

	//expect(CasparCG.mock.instances).toHaveLength(1)

	/*
	// fast-forward:
	jest.runOnlyPendingTimers();

	console.log('CasparCG',CasparCG)

	expect(CasparCG).toHaveBeenCalledTimes(1)
	let mockCCGCall = CasparCG.mock.calls[0];

	expect(CasparCG.mock.instances).toHaveLength(1)
	let mockCCGInstance = CasparCG.mock.instances[0];	

	//console.log('CasparCG.mock',mockCCGInstance);

	/*

	// Check that no commands has been sent:
	expect(mockCCGConn.do.mock.calls.length).toBe(0);

	myTSR.setTimeline([
		{
			id: 'obj0',
			trigger: {
				type: Timeline.enums.TriggerType.TIME_ABSOLUTE,
				value: Date.now()/1000 - 10 // 10 seconds ago
			},
			duration: 20,
			LLayer: 'myLayer',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true,
				}
			}
		}
	]);

	
	*/
});

test('Timeline: AMB with transitions', async () => {
	
	myConductor.mapping = myLayerMapping;
	await myConductor.init();


	// Check that no commands has been sent:
	expect(CasparCG.mockDo).toHaveBeenCalledTimes(0)

	
	jest.useFakeTimers();

	var now = myConductor.getCurrentTime();
	Date.now = jest.fn();
	Date.now
		.mockReturnValue(now*1000);

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: Enums.TriggerType.TIME_ABSOLUTE,
				value: now-10, // 10 seconds ago
			},
			duration: 20,
			LLayer: 'myLayer',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true,
				},
				transitions: {
					inTransition: {
						type: 'MIX',
						duration: 10,
						easing: 'linear',
						direction: 'left'
					},
					outTransition: {
						type: 'MIX',
						duration: 10,
						easing: 'linear',
						direction: 'right'
					}
				}
			}
		}
	];

	// fast-forward:

	Date.now
		.mockReturnValue(now*1000 + 5000);
	// jest.advanceTimersByTime(5000);
	jest.runOnlyPendingTimers();

	// Check that an ACMP-command has been sent
	expect(CasparCG.mockDo).toHaveBeenCalledTimes(1);
	expect(CasparCG.mockDo.mock.calls[0][0]).toBeInstanceOf(AMCP.PlayCommand);

	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.loop).toEqual(true);
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.clip).toMatch(/AMB/);
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.transition).toMatch(/MIX/);
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.transitionDuration).toEqual(500);
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.transitionEasing).toMatch(/linear/);
	expect(CasparCG.mockDo.mock.calls[0][0]._objectParams.transitionDirection).toMatch(/LEFT/);
	expect(CasparCG.mockDo.mock.calls[0][0].layer).toEqual(42);
	expect(CasparCG.mockDo.mock.calls[0][0].channel).toEqual(2);


	// fast-forward:
	// jest.advanceTimersByTime(20000);

	Date.now
		.mockReturnValue(now*1000 + 15000);
	// jest.advanceTimersByTime(10000);
	jest.runOnlyPendingTimers();

	expect(CasparCG.mockDo.mock.calls.length).toBe(2);
	expect(CasparCG.mockDo.mock.calls[1][0]).toBeInstanceOf(AMCP.StopCommand);
	// @todo: add tests for removal
	expect(CasparCG.mockDo.mock.calls[1][0].layer).toEqual(42);
	expect(CasparCG.mockDo.mock.calls[1][0].channel).toEqual(2);
	// @todo: do some more checks for transitions

	// Nothing more should've happened:

	Date.now
		.mockReturnValue(now*1000 + 35000);
	jest.advanceTimersByTime(20000);

	expect(CasparCG.mockDo.mock.calls.length).toBe(2);
})