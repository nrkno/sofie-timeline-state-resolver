const {AMCP} = require('casparcg-connection');

function fromStartEvent (event) {
    console.log('start', event.obj);
    
    let content = event.obj.content;
    let command;

    if (!content.type) {
        console.warn('Content type is undefined, cannot create command.'); // @todo: try to guess content type.
    } else {
        switch (content.type) {
            case 'video' :
                // @todo: generate loadbg command for preloading?
                // @todo: channel specifier.
                // @todo: all the edge cases.
                command = new AMCP.PlayCommand({channel: 1, layer: content.GLayer, name: content.attributes.file});
                break;
            default :
                console.warn('Content type is either unimplemented or mallformed!');
        }
    }

    return command;
}

function fromEndEvent (event) {
    console.log('stop', event.obj);

    let content = event.obj.content;
    let command;

    if (!content.type) {
        console.warn('Content type is undefined, falling back to clearing layer.');
        command = new AMCP.ClearCommand({channel: 1, layer: content.GLayer});
    } else {
        switch (content.type) {
            case 'video' :
                command = new AMCP.StopCommand({channel: 1, layer: content.GLayer});
                break;
            default :
                console.warn('Content type is either unimplemented or mallformed!');
        }
    }

    return command;
}

function fromKeyFrameEvent (event) {
    console.warn('Not implemented!');

    return {}
}

module.exports = {fromStartEvent, fromEndEvent, fromKeyFrameEvent}