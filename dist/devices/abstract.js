"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
class AbstractDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options) {
        super(deviceId, deviceOptions, options);
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver)
                this._commandReceiver = deviceOptions.options.commandReceiver;
            else
                this._commandReceiver = this._defaultCommandReceiver;
        }
        setInterval(() => {
            // send any commands due:
            let now = this.getCurrentTime();
            // console.log('check queue ' + now, _.values(this._queue).length )
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
        let oldAbstractState = this.convertStateToAbstract(oldState);
        let newAbstractState = this.convertStateToAbstract(newState);
        let commandsToAchieveState = this._diffStates(oldAbstractState, newAbstractState);
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
        return false;
    }
    convertStateToAbstract(state) {
        // convert the timeline state into something we can use
        return state;
    }
    get deviceType() {
        return mapping_1.DeviceType.ABSTRACT;
    }
    get deviceName() {
        return 'Abstract ' + this.deviceId;
    }
    get queue() {
        return _.values(this._queue);
    }
    _diffStates(oldAbstractState, newAbstractState) {
        // in this abstract class, let's just cheat:
        let commands = [];
        _.each(newAbstractState.LLayers, (newLayer, layerKey) => {
            let oldLayer = oldAbstractState.LLayers[layerKey];
            if (!oldLayer) {
                // added!
                commands.push({
                    commandName: 'addedAbstract',
                    content: newLayer.content
                });
            }
            else {
                // changed?
                if (oldLayer.id !== newLayer.id) {
                    // changed!
                    commands.push({
                        commandName: 'changedAbstract',
                        content: newLayer.content
                    });
                }
            }
        });
        // removed
        _.each(oldAbstractState.LLayers, (oldLayer, layerKey) => {
            let newLayer = newAbstractState.LLayers[layerKey];
            if (!newLayer) {
                // removed!
                commands.push({
                    commandName: 'removedAbstract',
                    content: oldLayer.content
                });
            }
        });
        return commands;
    }
    _defaultCommandReceiver(time, cmd) {
        time = time;
        // execute the command here
        cmd = cmd;
    }
}
exports.AbstractDevice = AbstractDevice;
//# sourceMappingURL=abstract.js.map