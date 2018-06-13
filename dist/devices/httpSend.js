"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
const doOnTime_1 = require("../doOnTime");
const request = require("request");
var ReqestType;
(function (ReqestType) {
    ReqestType["POST"] = "post";
    ReqestType["GET"] = "get";
})(ReqestType || (ReqestType = {}));
class HttpSendDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options) {
        super(deviceId, deviceOptions, options);
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver)
                this._commandReceiver = deviceOptions.options.commandReceiver;
            else
                this._commandReceiver = this._defaultCommandReceiver;
        }
        this._doOnTime = new doOnTime_1.DoOnTime(options.getCurrentTime);
    }
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init() {
        return new Promise((resolve /*, reject*/) => {
            // This is where we would do initialization, like connecting to the devices, etc
            // myDevide.onConnectionChange((connected: boolean) => {
            // this.emit('connectionChanged', connected)
            // })
            resolve(true);
        });
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        // console.log('handleState')
        let oldState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} };
        let oldAbstractState = this.convertStateToHttpSend(oldState);
        let newAbstractState = this.convertStateToHttpSend(newState);
        let commandsToAchieveState = this._diffStates(oldAbstractState, newAbstractState);
        // clear any queued commands later than this time:
        this._doOnTime.clearQueueAfter(newState.time);
        // add the new commands to the queue:
        this._addToQueue(commandsToAchieveState, newState.time);
        // store the new state, for later use:
        this.setState(newState);
    }
    clearFuture(clearAfterTime) {
        // Clear any scheduled commands after this time
        this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime; });
    }
    get connected() {
        return false;
    }
    convertStateToHttpSend(state) {
        // convert the timeline state into something we can use
        return state;
    }
    get deviceType() {
        return mapping_1.DeviceType.HTTPSEND;
    }
    get deviceName() {
        return 'HTTP-Send ' + this.deviceId;
    }
    get queue() {
        return _.values(this._queue);
    }
    _addToQueue(commandsToAchieveState, time) {
        _.each(commandsToAchieveState, (cmd) => {
            // add the new commands to the queue:
            this._doOnTime.queue(time, (cmd) => {
                if (cmd.commandName === 'added' ||
                    cmd.commandName === 'changed') {
                    this._commandReceiver(time, cmd.content);
                }
            }, cmd);
        });
    }
    _diffStates(oldhttpSendState, newhttpSendState) {
        // in this httpSend class, let's just cheat:
        let commands = [];
        _.each(newhttpSendState.LLayers, (newLayer, layerKey) => {
            let oldLayer = oldhttpSendState.LLayers[layerKey];
            if (!oldLayer) {
                // added!
                commands.push({
                    commandName: 'added',
                    content: newLayer.content
                });
            }
            else {
                // changed?
                if (!_.isEqual(oldLayer.content, newLayer.content)) {
                    // changed!
                    commands.push({
                        commandName: 'changed',
                        content: newLayer.content
                    });
                }
            }
        });
        // removed
        _.each(oldhttpSendState.LLayers, (oldLayer, layerKey) => {
            let newLayer = newhttpSendState.LLayers[layerKey];
            if (!newLayer) {
                // removed!
                commands.push({
                    commandName: 'removed',
                    content: oldLayer.content
                });
            }
        });
        return commands;
    }
    _defaultCommandReceiver(time, cmd) {
        time = time;
        if (cmd.type === ReqestType.POST) {
            console.log('Sending POST request to ', cmd.url, cmd.params);
            request.post(cmd.url, // 'http://www.yoursite.com/formpage',
            { json: cmd.params }, (error, response, body) => {
                if (error) {
                    console.log('Error in httpSend: ' + error);
                }
                else if (response.statusCode === 200) {
                    console.log('200 Response from ' + cmd.url, body);
                }
                else {
                    console.log(response.statusCode + ' Response from ' + cmd.url, body);
                }
            });
        }
        else if (cmd.type === ReqestType.GET) {
            console.log('Sending POST request to ', cmd.url, cmd.params);
            request.get(cmd.url, // 'http://www.yoursite.com/formpage',
            { json: cmd.params }, (error, response, body) => {
                if (error) {
                    console.log('Error in httpSend: ' + error);
                }
                else if (response.statusCode === 200) {
                    console.log('200 Response from ' + cmd.url, body);
                }
                else {
                    console.log(response.statusCode + ' Response from ' + cmd.url, body);
                }
            });
        }
        else
            throw new Error('Unknown HTTP-send type: "' + cmd.type + '"');
    }
}
exports.HttpSendDevice = HttpSendDevice;
//# sourceMappingURL=httpSend.js.map