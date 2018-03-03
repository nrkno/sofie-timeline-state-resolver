
// mock CasparCG
import * as _ from "underscore"
import {AMCP as AMCP2, AMCPUtil as util} from '../../node_modules/casparcg-connection'



var test = 0;

var mockDo = jest.fn();

var instances = [];

export const AMCP = AMCP2;
export const AMCPUtil = util;

export class CasparCG {
	constructor() {
		//console.log('Mock CasparCG: constructor was called');

		setTimeout(() => {
			// simulate that we're connected
			this.onConnected();
		},10)

		instances.push(this);
	}
	

	do() {
		mockDo.apply(this,arguments);
	}



	static get mockDo() {
		return mockDo;
	}
	static get instances() {
		return instances;
	}
}
/*

//jest.mock("casparcg-connection")


export const mockDo = jest.fn();

const CasparCG = jest.fn().mockImplementation(() => {
  return {do: mockDo};
});

export default CasparCG;

*/

//const CasparCG = jest.genMockFromModule('casparcg-connection');


//console.log('mock CasparCG',CasparCG);

//export default CasparCG;