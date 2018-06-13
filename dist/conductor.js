"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const superfly_timeline_1 = require("superfly-timeline");
exports.TriggerType = superfly_timeline_1.TriggerType;
let clone = require('fast-clone');
const casparCG_1 = require("./devices/casparCG");
const abstract_1 = require("./devices/abstract");
const httpSend_1 = require("./devices/httpSend");
const mapping_1 = require("./devices/mapping");
const atem_1 = require("./devices/atem");
const events_1 = require("events");
const lawo_1 = require("./devices/lawo");
const doOnTime_1 = require("./doOnTime");
const LOOKAHEADTIME = 5000; // Will look ahead this far into the future
const PREPARETIME = 2000; // Will prepare commands this time before the event is to happen
const MINTRIGGERTIME = 10; // Minimum time between triggers
const MINTIMEUNIT = 1; // Minimum unit of time
var device_1 = require("./devices/device");
exports.Device = device_1.Device;
/**
 * The main class that serves to interface with all functionality.
 */
class Conductor extends events_1.EventEmitter {
    constructor(options) {
        super();
        this._timeline = [];
        this._mapping = {};
        this.devices = {};
        this._nextResolveTime = 0;
        this._isInitialized = false;
        this._sentCallbacks = {};
        this._options = options;
        this._options = this._options; // ts-lint fix: not used
        if (options.getCurrentTime)
            this._getCurrentTime = options.getCurrentTime;
        setInterval(() => {
            if (this.timeline) {
                this._resolveTimeline();
            }
        }, 2500);
        this._doOnTime = new doOnTime_1.DoOnTime(() => {
            return this.getCurrentTime();
        });
        // this._doOnTime.on('callback', (...args) => {
        // 	this.emit('timelineCallback', ...args)
        // })
        if (options.autoInit) {
            this.init()
                .catch((e) => {
                this.emit('error', 'Error during auto-init: ', e);
            });
        }
    }
    /**
     * Initialization, TODO, maybe do something here?
     */
    init() {
        this._isInitialized = true;
        this.resetResolver();
        return Promise.resolve();
    }
    /**
     * Returns a nice, synchronized time.
     */
    getCurrentTime() {
        if (this._getCurrentTime) {
            // return 0
            return this._getCurrentTime();
        }
        else {
            return Date.now();
        }
    }
    get mapping() {
        return this._mapping;
    }
    set mapping(mapping) {
        // Set mapping
        // re-resolve timeline
        this._mapping = mapping;
        _.each(this.devices, (device) => {
            device.mapping = this.mapping;
        });
        if (this._timeline) {
            this._resolveTimeline();
        }
    }
    get timeline() {
        return this._timeline;
    }
    set timeline(timeline) {
        this._timeline = timeline;
        // We've got a new timeline, anything could've happened at this point
        // Highest priority right now is to determine if any commands have to be sent RIGHT NOW
        // After that, we'll move further ahead in time, creating commands ready for scheduling
        this.resetResolver();
    }
    getDevices() {
        return _.values(this.devices);
    }
    getDevice(deviceId) {
        return this.devices[deviceId];
    }
    addDevice(deviceId, deviceOptions) {
        try {
            let newDevice;
            if (deviceOptions.type === mapping_1.DeviceType.ABSTRACT) {
                // Add Abstract device:
                newDevice = new abstract_1.AbstractDevice(deviceId, deviceOptions, {
                    getCurrentTime: () => { return this.getCurrentTime(); }
                });
            }
            else if (deviceOptions.type === mapping_1.DeviceType.CASPARCG) {
                // Add CasparCG device:
                newDevice = new casparCG_1.CasparCGDevice(deviceId, deviceOptions, {
                    getCurrentTime: () => { return this.getCurrentTime(); }
                }, this);
            }
            else if (deviceOptions.type === mapping_1.DeviceType.ATEM) {
                newDevice = new atem_1.AtemDevice(deviceId, deviceOptions, {
                    getCurrentTime: () => { return this.getCurrentTime(); }
                });
            }
            else if (deviceOptions.type === mapping_1.DeviceType.HTTPSEND) {
                newDevice = new httpSend_1.HttpSendDevice(deviceId, deviceOptions, {
                    getCurrentTime: () => { return this.getCurrentTime(); }
                });
            }
            else if (deviceOptions.type === mapping_1.DeviceType.LAWO) {
                newDevice = new lawo_1.LawoDevice(deviceId, deviceOptions, {
                    // TODO: Add options
                    getCurrentTime: () => { return this.getCurrentTime(); }
                });
            }
            else {
                return Promise.reject('No matching device type for "' + deviceOptions.type + '" ("' + mapping_1.DeviceType[deviceOptions.type] + '") found');
            }
            this.emit('info', 'Initializing ' + mapping_1.DeviceType[deviceOptions.type] + '...');
            this.devices[deviceId] = newDevice;
            newDevice.mapping = this.mapping;
            return newDevice.init(deviceOptions.options)
                .then(() => {
                console.log(mapping_1.DeviceType[deviceOptions.type] + ' initialized!');
                return newDevice;
            });
        }
        catch (e) {
            this.emit('error', e);
            return Promise.reject(e);
        }
    }
    removeDevice(deviceId) {
        let device = this.devices[deviceId];
        if (device) {
            return device.terminate()
                .then((res) => {
                if (res) {
                    delete this.devices[deviceId];
                }
            });
        }
        else {
            return Promise.reject('No device found');
        }
    }
    destroy() {
        return Promise.all(_.map(_.keys(this.devices), (deviceId) => {
            return this.removeDevice(deviceId);
        }))
            .then(() => {
            return;
        });
    }
    // 	return Promise.all(ps)
    // }
    /**
     * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
     * next time
     */
    resetResolver() {
        this._nextResolveTime = 0; // This will cause _resolveTimeline() to generate the state for NOW
        this._triggerResolveTimeline();
    }
    /**
     * This is the main resolve-loop.
     */
    _triggerResolveTimeline(timeUntilTrigger) {
        // console.log('_triggerResolveTimeline', timeUntilTrigger)
        if (this._resolveTimelineTrigger) {
            clearTimeout(this._resolveTimelineTrigger);
        }
        if (timeUntilTrigger) {
            // resolve at a later stage
            this._resolveTimelineTrigger = setTimeout(() => {
                this._resolveTimeline();
            }, timeUntilTrigger);
        }
        else {
            // resolve right away:
            this._resolveTimeline();
        }
    }
    /**
     * Resolves the timeline for the next resolve-time, generates the commands and passes on the commands.
     */
    _resolveTimeline() {
        let timeUntilNextResolve = LOOKAHEADTIME;
        try {
            if (!this._isInitialized) {
                console.log('TSR is not initialized yet');
                return;
            }
            const now = this.getCurrentTime();
            let resolveTime = this._nextResolveTime || now;
            console.log('resolveTimeline ' + resolveTime + ' -----------------------------');
            if (resolveTime > now + LOOKAHEADTIME) {
                console.log('Too far ahead (' + resolveTime + ')');
                this._triggerResolveTimeline(LOOKAHEADTIME);
                return;
            }
            this._fixNowObjects(resolveTime);
            let timeline = this.timeline;
            _.each(timeline, (o) => {
                delete o['parent'];
                if (o.isGroup) {
                    if (o.content.objects) {
                        _.each(o.content.objects, (o2) => {
                            delete o2['parent'];
                        });
                    }
                }
            });
            // @ts-ignore
            // console.log('timeline', JSON.stringify(timeline, ' ', 2))
            // Generate the state for that time:
            let tlState = superfly_timeline_1.Resolver.getState(clone(timeline), resolveTime);
            _.each(tlState.LLayers, (obj) => {
                delete obj['parent'];
            });
            _.each(tlState.GLayers, (obj) => {
                delete obj['parent'];
            });
            // @ts-ignore
            // console.log('tlState', JSON.stringify(tlState.LLayers,' ', 2))
            // Split the state into substates that are relevant for each device
            let getFilteredLayers = (layers, device) => {
                let filteredState = {};
                _.each(layers, (o, layerId) => {
                    let mapping = this._mapping[o.LLayer + ''];
                    if (mapping) {
                        if (mapping.deviceId === device.deviceId &&
                            mapping.device === device.deviceType) {
                            filteredState[layerId] = o;
                        }
                    }
                });
                return filteredState;
            };
            _.each(this.devices, (device /*, deviceName: string*/) => {
                // The subState contains only the parts of the state relevant to that device
                let subState = {
                    time: tlState.time,
                    LLayers: getFilteredLayers(tlState.LLayers, device),
                    GLayers: getFilteredLayers(tlState.GLayers, device)
                };
                // console.log('State of device ' + device.deviceName, tlState.LLayers )
                // Pass along the state to the device, it will generate its commands and execute them:
                try {
                    device.handleState(subState);
                }
                catch (e) {
                    console.log('Error in device "' + device.deviceId + '"', e);
                }
            });
            // Now that we've handled this point in time, it's time to determine what the next point in time is:
            // console.log(tlState.time)
            const timelineWindow = superfly_timeline_1.Resolver.getTimelineInWindow(timeline, tlState.time, tlState.time + LOOKAHEADTIME);
            const nextEvents = superfly_timeline_1.Resolver.getNextEvents(timelineWindow, tlState.time + MINTIMEUNIT, 1);
            const now2 = this.getCurrentTime();
            if (nextEvents.length) {
                let nextEvent = nextEvents[0];
                // console.log('nextEvent', nextEvent)
                timeUntilNextResolve = Math.max(MINTRIGGERTIME, Math.min(LOOKAHEADTIME, (nextEvent.time - now2) - PREPARETIME));
                // console.log('timeUntilNextResolve', timeUntilNextResolve)
                // resolve at nextEvent.time next time:
                this._nextResolveTime = nextEvent.time;
            }
            else {
                // there's nothing ahead in the timeline
                // console.log('no next events')
                // Tell the devices that the future is clear:
                _.each(this.devices, (device) => {
                    device.clearFuture(tlState.time);
                });
                // resolve at "now" then next time:
                this._nextResolveTime = 0;
            }
            // Special function: send callback to Core
            let sentCallbacksOld = this._sentCallbacks;
            let sentCallbacksNew = {};
            _.each(tlState.GLayers, (o) => {
                if (o.content.callBack) {
                    let callBackId = o.id + o.content.callBack + o.resolved.startTime + JSON.stringify(o.content.callBackData);
                    sentCallbacksNew[callBackId] = true;
                    if (!sentCallbacksOld[callBackId]) {
                        // this._doOnTime.queue(resolveTime, o.id, o.content.callBack, o.content.callBackData)
                        // this._doOnTime.queue(o.resolved.startTime, o.id, o.content.callBack, o.content.callBackData)
                        this._doOnTime.queue(o.resolved.startTime, () => {
                            this.emit('timelineCallback', o.resolved.startTime, o.id, o.content.callBack, o.content.callBackData);
                        });
                    }
                    else {
                        // callback already sent, do nothing
                        console.log('callback already sent', callBackId);
                    }
                }
            });
            this._sentCallbacks = sentCallbacksNew;
        }
        catch (e) {
            this.emit('error', e);
        }
        try {
            // console.log('this._nextResolveTime', this._nextResolveTime)
            this._triggerResolveTimeline(timeUntilNextResolve);
        }
        catch (e) {
            this.emit('error', e);
        }
    }
    _fixNowObjects(now) {
        let objectsFixed = [];
        let setObjectTime = (o, time) => {
            o.trigger.value = time; // set the objects to "now" so that they are resolved correctly temporarily
            objectsFixed.push({
                id: o.id,
                time: time
            });
        };
        let timeline = this.timeline;
        // First: fix the ones on the first level (i e not in groups), because they are easy:
        _.each(timeline, (o) => {
            if ((o.trigger || {}).type === superfly_timeline_1.TriggerType.TIME_ABSOLUTE &&
                o.trigger.value === 'now') {
                setObjectTime(o, now);
            }
        });
        // Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
        let dontIterateAgain;
        let wouldLikeToIterateAgain;
        let tl;
        let tld;
        let fixObjects = (objs, parentObject) => {
            _.each(objs, (o) => {
                if ((o.trigger || {}).type === superfly_timeline_1.TriggerType.TIME_ABSOLUTE &&
                    o.trigger.value === 'now') {
                    // find parent, and set relative to that
                    if (parentObject) {
                        let developedParent = _.findWhere(tld.groups, { id: parentObject.id });
                        if (developedParent && developedParent['resolved'].startTime) {
                            dontIterateAgain = false;
                            setObjectTime(o, now - developedParent['resolved'].startTime);
                        }
                        else {
                            // the parent isn't found, it's probably not resolved (yet), try iterating once more:
                            wouldLikeToIterateAgain = true;
                        }
                    }
                    else {
                        // no parent object
                        dontIterateAgain = false;
                        setObjectTime(o, now);
                    }
                }
                if (o.isGroup && o.content.objects) {
                    fixObjects(o.content.objects, o);
                }
            });
        };
        for (let i = 0; i < 10; i++) {
            wouldLikeToIterateAgain = false;
            dontIterateAgain = true;
            tl = superfly_timeline_1.Resolver.getTimelineInWindow(timeline);
            tld = superfly_timeline_1.Resolver.developTimelineAroundTime(tl, now);
            fixObjects(timeline);
            if (!wouldLikeToIterateAgain && dontIterateAgain)
                break;
        }
        // fixObjects(this.timeline, 0)
        // console.log('objectsFixed', objectsFixed)
        if (objectsFixed.length) {
            let r = objectsFixed;
            // console.log('setTimelineTriggerTime', r)
            this.emit('setTimelineTriggerTime', r);
        }
    }
}
exports.Conductor = Conductor;
//# sourceMappingURL=conductor.js.map