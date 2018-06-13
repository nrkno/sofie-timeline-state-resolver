"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const _ = require("underscore");
class DoOnTime extends events_1.EventEmitter {
    constructor(getCurrentTime) {
        super();
        this._i = 0;
        this._queue = {};
        this._checkQueueTimeout = 0;
        this.getCurrentTime = getCurrentTime;
    }
    queue(time, fcn, ...args) {
        if (!(time > 0))
            throw Error('time argument must be > 0');
        if (!_.isFunction(fcn))
            throw Error('fcn argument must be a function!');
        let id = '_' + (this._i++);
        this._queue[id] = {
            time: time,
            fcn: fcn,
            args: args
        };
        this._checkQueue();
        return id;
    }
    remove(id) {
        delete this._queue[id];
    }
    getQueue() {
        return _.map(this._queue, (q, id) => {
            return {
                id: id,
                time: q.time
            };
        });
    }
    clearQueueAfter(time) {
        _.each(this._queue, (q, id) => {
            if (q.time >= time) {
                this.remove(id);
            }
        });
    }
    _checkQueue() {
        clearTimeout(this._checkQueueTimeout);
        let now = this.getCurrentTime();
        let nextTime = now + 99999;
        _.each(this._queue, (o, id) => {
            if (o.time <= now) {
                o.fcn(...o.args);
                this.remove(id);
            }
            else {
                if (o.time < nextTime)
                    nextTime = o.time;
            }
        });
        // next check
        let timeToNext = Math.min(1000, nextTime - now);
        this._checkQueueTimeout = setTimeout(() => {
            this._checkQueue();
        }, timeToNext);
    }
}
exports.DoOnTime = DoOnTime;
//# sourceMappingURL=doOnTime.js.map