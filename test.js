const jest = require("Jest");



const TSR = require("/lib/TSR.js");
const Timeline = require("superfly-timeline")

const {CasparCG, AMCP} = require('casparcg-connection');



// mock casparcg-connection:

function getMockCCGConn() {

	return {
		do: jest.fn((command => {
			return Promise.resolve(command);
		})) // mock 
	}
}

// Test:

test('Timeline: Play AMB for 60s', () => {

	jest.useFakeTimers();

	var mockCCGConn = getMockCCGConn();

	var myLayerMapping = {
		'myLayer': {
			device: 'myCCG',
			channel: 2,
			layer: 42
		}
	}

	var myTSR = new TSR({
		mapping: myLayerMapping,
		devices: {
			myCCG: mockCCGConn
		},
		initializeAsClear: true // don't do any initial checks with devices to determine state, instead assume that everything is clear, black and quiet
	});

	// fast-forward:
	jest.runOnlyPendingTimers();

	// Check that none ACMP-command has been sent:
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

	// fast-forward:
	jest.advanceTimersByTime(100);

	// Check that an ACMP-command has been sent
	expect(mockCCGConn.do.mock.calls.length).toBe(1);
	expect(mockCCGConn.do.mock.calls[0][0]).toBeInstanceOf(AMCP.PlayCommand);

	expect(mockCCGConn.do.mock.calls[0][0].ccgString).toMatch(/LOOP/);
	expect(mockCCGConn.do.mock.calls[0][0].ccgString).toMatch(/AMB/);
	expect(mockCCGConn.do.mock.calls[0][0].seek).toBeGreaterThanOrEqual(10*50);
	expect(mockCCGConn.do.mock.calls[0][0].seek).toBeLessThan(10*50 + 10);
	expect(mockCCGConn.do.mock.calls[0][0].layer).toEqual(42);
	expect(mockCCGConn.do.mock.calls[0][0].channel).toEqual(2);


	// fast-forward:
	jest.advanceTimersByTime(20000);

	expect(mockCCGConn.do.mock.calls.length).toBe(2);
	expect(mockCCGConn.do.mock.calls[1][0]).toBeInstanceOf(AMCP.StopCommand);

	expect(mockCCGConn.do.mock.calls[1][0].layer).toEqual(2);
	expect(mockCCGConn.do.mock.calls[1][0].channel).toEqual(2);

	// fast-forward:
	jest.advanceTimersByTime(10000);

	// Nothing more should've happened:
	expect(mockCCGConn.do.mock.calls.length).toBe(2);
});