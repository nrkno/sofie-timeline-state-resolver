
// mock CasparCG
import * as _ from "underscore"



var test = 0;

var mockDo = jest.fn();

var instances = [];

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