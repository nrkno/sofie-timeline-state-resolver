"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
const atem_connection_1 = require("atem-connection");
const atem_state_1 = require("atem-state");
var TimelineContentTypeAtem;
(function (TimelineContentTypeAtem) {
    TimelineContentTypeAtem["ME"] = "me";
    TimelineContentTypeAtem["DSK"] = "dsk";
    TimelineContentTypeAtem["AUX"] = "aux";
    TimelineContentTypeAtem["SSRC"] = "ssrc";
    TimelineContentTypeAtem["MEDIAPLAYER"] = "mp";
})(TimelineContentTypeAtem = exports.TimelineContentTypeAtem || (exports.TimelineContentTypeAtem = {}));
class AtemDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options) {
        super(deviceId, deviceOptions, options);
        this._initialized = false;
        this._connected = false; // note: ideally this should be replaced by this._device.connected
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver)
                this._commandReceiver = deviceOptions.options.commandReceiver;
            else
                this._commandReceiver = this._defaultCommandReceiver;
        }
        setInterval(() => {
            // send any commands due:
            let now = this.getCurrentTime();
            this._queue = _.reject(this._queue, (q) => {
                if (q.time <= now) {
                    if (this._commandReceiver) {
                        this._commandReceiver(now, q.command);
                    }
                    return true;
                }
                return false;
            });
        }, 100);
    }
    /**
     * Initiates the connection with the ATEM through the atem-connection lib.
     */
    init(options) {
        return new Promise((resolve /*, reject*/) => {
            // This is where we would do initialization, like connecting to the devices, etc
            this._state = new atem_state_1.AtemState();
            this._device = new atem_connection_1.Atem();
            this._device.connect(options.host, options.port);
            this._device.once('connected', () => {
                // console.log('-------------- ATEM CONNECTED')
                // this.emit('connectionChanged', true)
                // check if state has been initialized:
                this._connected = true;
                this._initialized = true;
                resolve(true);
            });
            this._device.on('connected', () => {
                this._connected = true;
                this.emit('connectionChanged', true);
            });
            this._device.on('disconnected', () => {
                this._connected = false;
                this.emit('connectionChanged', false);
            });
        });
    }
    terminate() {
        return new Promise((resolve) => {
            // TODO: implement dispose function in atem-connection
            // this._device.dispose()
            // .then(() => {
            // resolve(true)
            // })
            resolve(true);
        });
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        // @ts-ignore
        // console.log('handleState', JSON.stringify(newState, ' ', 2))
        if (!this._initialized) {
            // before it's initialized don't do anything
            return;
        }
        let oldState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} };
        let oldAtemState = this.convertStateToAtem(oldState);
        let newAtemState = this.convertStateToAtem(newState);
        // @ts-ignore
        // console.log('newAtemState', JSON.stringify(newAtemState, ' ', 2))
        let commandsToAchieveState = this._diffStates(oldAtemState, newAtemState);
        // clear any queued commands on this time:
        this._queue = _.reject(this._queue, (q) => { return q.time === newState.time; });
        // add the new commands to the queue:
        _.each(commandsToAchieveState, (cmd) => {
            this._queue.push({
                time: newState.time,
                command: cmd
            });
        });
        // store the new state, for later use:
        this.setState(newState);
    }
    clearFuture(clearAfterTime) {
        // Clear any scheduled commands after this time
        this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime; });
    }
    get connected() {
        return this._connected;
    }
    convertStateToAtem(state) {
        if (!this._initialized)
            throw Error('convertStateToAtem cannot be used before inititialized');
        // Convert the timeline state into something we can use easier:
        const deviceState = this._getDefaultState();
        _.each(state.LLayers, (tlObject, layerName) => {
            let content = tlObject.content;
            const mapping = this.mapping[layerName];
            if (mapping) {
                if (!(mapping.index !== undefined && mapping.index >= 0))
                    return; // index must be 0 or higher
                // 	obj = {}
                // 	obj[mapping.index] = tlObject.content
                // }
                switch (mapping.mappingType) {
                    case mapping_1.MappingAtemType.MixEffect:
                        if (content.type === TimelineContentTypeAtem.ME) {
                            let me = deviceState.video.ME[mapping.index];
                            _.extend(me, content.attributes);
                        }
                        break;
                    case mapping_1.MappingAtemType.DownStreamKeyer:
                        if (content.type === TimelineContentTypeAtem.DSK) {
                            let dsk = deviceState.video.downstreamKeyers[mapping.index];
                            _.extend(dsk, content.attributes);
                        }
                        break;
                    case mapping_1.MappingAtemType.SuperSourceBox:
                        if (content.type === TimelineContentTypeAtem.SSRC) {
                            let ssrc = deviceState.video.superSourceBoxes;
                            _.extend(ssrc, content.attributes.boxes);
                        }
                        break;
                    case mapping_1.MappingAtemType.Auxilliary:
                        if (content.type === TimelineContentTypeAtem.AUX) {
                            let aux = deviceState.video.auxilliaries[mapping.index];
                            _.extend(aux, content.attributes);
                        }
                        break;
                    case mapping_1.MappingAtemType.MediaPlayer:
                        if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
                            let ms = deviceState.media.players[mapping.index];
                            _.extend(ms, content.attributes);
                        }
                        break;
                }
            }
            // const traverseState = (mutation, mutableObj) => {
            // 	for (const key in mutation) {
            // 		if (typeof mutation[key] === 'object' && mutableObj[key]) {
            // 			traverseState(mutation[key], mutableObj[key])
            // 		} else {
            // 			mutableObj[key] = mutation[key]
            // 		}
            // 	}
            // }
            // traverseState(obj, deviceState)
        });
        return deviceState;
    }
    get deviceType() {
        return mapping_1.DeviceType.ATEM;
    }
    get deviceName() {
        return 'Atem ' + this.deviceId;
    }
    get queue() {
        return _.values(this._queue);
    }
    _diffStates(oldAbstractState, newAbstractState) {
        let commands = this._state.diffStates(oldAbstractState, newAbstractState);
        return commands;
    }
    _getDefaultState() {
        let deviceState = new atem_state_1.State();
        for (let i = 0; i < this._device.state.info.capabilities.MEs; i++) {
            deviceState.video.ME[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.MixEffect));
        }
        for (let i = 0; i < this._device.state.video.downstreamKeyers.length; i++) {
            deviceState.video.downstreamKeyers[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.DownStreamKeyer));
        }
        for (let i = 0; i < this._device.state.info.capabilities.auxilliaries; i++) {
            deviceState.video.auxilliaries[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.defaultInput));
        }
        for (let i = 0; i < 4 /* @todo from _SSC */; i++) {
            deviceState.video.superSourceBoxes[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.SuperSourceBox));
        }
        return deviceState;
    }
    _defaultCommandReceiver(time, command) {
        time = time; // seriously this needs to stop
        this._device.sendCommand(command).then(() => {
            // @todo: command was acknowledged by atem, how will we check if it did what we wanted?
        });
    }
}
exports.AtemDevice = AtemDevice;
//# sourceMappingURL=atem.js.map