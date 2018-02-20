const {AMCP} = require('casparcg-connection');

function fromStartEvent (event) {
    console.log(event);

    return {};
}

function fromEndEvent (event) {
    console.log(event);

    return {};
}

function fromKeyFrameEvent (event) {
    console.warn('Not implemented!');

    return {}
}

module.exports = {fromStartEvent, fromStopEvent, fromKeyFrameEvent}