"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = require("underscore");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
const emberplus_1 = require("emberplus");
class LawoDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options) {
        super(deviceId, deviceOptions, options);
        this._resolveMappingsOnConnect = false;
        this._mappingToAttributes = {};
        this._savedNodes = {};
        this._sourceNames = {};
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver)
                this._commandReceiver = deviceOptions.options.commandReceiver;
            else
                this._commandReceiver = this._defaultCommandReceiver;
        }
        let host = deviceOptions.options && deviceOptions.options.host ? deviceOptions.options.host : null;
        let port = deviceOptions.options && deviceOptions.options.port ? deviceOptions.options.port : null;
        this._device = new emberplus_1.DeviceTree(host, port);
        this._device.on('connected', () => {
            this._savedNodes = {}; // reset cache
            if (this._resolveMappingsOnConnect) {
                this._resolveMappings();
            }
            this._device.getNodeByPath([1, 1]).then((node) => {
                this._device.getDirectory(node).then((res) => {
                    const children = node.getChildren();
                    if (node === undefined || children === undefined || res === undefined)
                        return; // no sources here.
                    for (const child of children) {
                        this._sourceNames[child.number] = child.identifier;
                    }
                });
            });
        });
        this._enforceDeviceState();
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
            this._device.connect().then(() => resolve(true));
            // @todo: timeout
        });
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        // console.log('handleState')
        let oldState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} };
        let oldLawoState = this.convertStateToLawo(oldState);
        let newLawoState = this.convertStateToLawo(newState);
        let commandsToAchieveState = this._diffStates(oldLawoState, newLawoState);
        // clear any queued commands on this time:
        this._queue = _.reject(this._queue, (q) => { return q.time === newState.time; });
        // add the new commands to the queue:
        _.each(commandsToAchieveState, (cmd) => {
            this._queue.push({
                time: newState.time,
                command: cmd
            });
        });
        console.log(this._queue);
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
    convertStateToLawo(state) {
        // convert the timeline state into something we can use
        const lawoState = {};
        _.each(state.LLayers, (tlObject, layerName) => {
            const mapping = this.mapping[layerName];
            if (typeof mapping !== 'undefined') {
                lawoState[mapping.path.join('/')] = Object.assign({}, lawoState[mapping.path.join('/')], tlObject.content);
            }
        });
        return lawoState;
    }
    get deviceType() {
        return mapping_1.DeviceType.LAWO;
    }
    get deviceName() {
        return 'Lawo ' + this.deviceId;
    }
    get queue() {
        return _.values(this._queue);
    }
    set mapping(mappings) {
        super.mapping = mappings;
        if (this._device.isConnected()) {
            this._resolveMappings();
        }
        else {
            this._resolveMappingsOnConnect = true;
        }
    }
    get mapping() {
        return super.mapping;
    }
    _diffStates(oldLawoState, newLawoState) {
        // in this abstract class, let's just cheat:
        let commands = [];
        _.each(newLawoState, (newNode, path) => {
            let oldNode = oldLawoState[path];
            const mapping = _.find(this.mapping, (mapping) => mapping.path.join('/') === path);
            const mappingAttrs = this._mappingToAttributes[path];
            if (!oldNode)
                oldNode = mapping.defaults;
            for (const attr in newNode) {
                if (newNode[attr] !== oldNode[attr] && mappingAttrs[attr] !== undefined) {
                    // @todo: typings!!
                    if (typeof newNode[attr] === 'object')
                        commands.push({ path, attribute: attr, value: newNode[attr].value, transitionDuration: newNode[attr].transitionDuration });
                    else
                        commands.push({ path, attribute: attr, value: newNode[attr] });
                }
            }
        });
        // removed
        _.each(oldLawoState, (oldNode, path) => {
            let newNode = newLawoState[path];
            if (!newNode)
                newNode = _.find(this.mapping, (mapping) => mapping.path.join('/') === path).defaults;
            for (const attr in newNode) {
                if (newNode[attr] !== oldNode[attr]) {
                    commands.push({ path, attribute: attr, value: newNode[attr] });
                }
            }
        });
        return commands;
    }
    // @ts-ignore no-unused-vars
    _defaultCommandReceiver(time, command) {
        if (command.transitionDuration !== undefined && command.attribute === 'Motor dB Value') { // I don't think we can transition any other values
            const source = this._sourceNames[command.path.substr(4, 1)]; // theoretically speaking anyway
            if (!source)
                return; // maybe warn user?
            const faderRamp = new emberplus_1.Ember.QualifiedFunction([1, 2, 2]);
            this._device.invokeFunction(faderRamp, { source, value: command.value, duration: command.transitionDuration });
        }
        else {
            const path = _.map(command.path.split('/'), (val) => Number(val));
            path.push(this._mappingToAttributes[command.path][command.attribute]);
            this._getNodeByPath(path).then((node) => {
                this._device.setValue(node, command.value).catch(console.log);
            });
        }
    }
    _getNodeByPath(path) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                if (this._savedNodes[path.join('/')] !== undefined) {
                    resolve(this._savedNodes[path.join('/')]);
                }
                else {
                    this._device.getNodeByPath(path).then((node) => {
                        this._savedNodes[path.join('/')] = node;
                        resolve(node);
                    });
                }
            });
        });
    }
    _resolveMappings() {
        // @ts-ignore no-unused-vars
        _.each(this.mapping, (mapping, layerName) => {
            const pathStr = mapping.path.join('/');
            this._getNodeByPath(mapping.path).then((node) => {
                // @todo: this might need a getDirectory() first.
                // @todo: should we subscribe to the node?
                _.each(node.getChildren(), (element) => {
                    if (!this._mappingToAttributes[pathStr]) {
                        this._mappingToAttributes[pathStr] = {};
                    }
                    this._mappingToAttributes[pathStr][element.contents.identifier] = element.number;
                });
            });
        });
    }
    _enforceDeviceState() {
        const curState = this.getStateBefore(this.getCurrentTime());
        const emptyState = {};
        const defaultState = curState ? this.convertStateToLawo(curState) : {};
        _.each(this.mapping, (mapping) => {
            if (mapping.defaults) {
                const path = mapping.path.join('/');
                emptyState[path] = {};
                if (defaultState[path] === undefined)
                    defaultState[path] = {};
                _.each(mapping.defaults, (val, attr) => {
                    if (defaultState[path][attr] === undefined)
                        defaultState[path][attr] = val;
                });
            }
        });
        const commandsToAchieveState = this._diffStates(emptyState, defaultState);
        // clear any queued commands on this time:
        this._queue = _.reject(this._queue, (q) => { return q.time === this.getCurrentTime(); });
        // add the new commands to the queue:
        _.each(commandsToAchieveState, (cmd) => {
            this._queue.push({
                time: this.getCurrentTime(),
                command: cmd
            });
        });
    }
}
exports.LawoDevice = LawoDevice;
//# sourceMappingURL=lawo.js.map