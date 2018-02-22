const Timeline = require('superfly-timeline');

const Command = require('./command-generator');


function processTimeline(object) {
    // @todo: limit time window for performance?
    let tl = Timeline.resolver.getTimelineInWindow(object);
    let eventsQueue = Timeline.resolver.getNextEvents(tl);
    let commandQueue = [];
    
    for (let event of eventsQueue) {
        switch (event.type) {
            case Timeline.enums.TimelineEventType.START :
                commandQueue.push({time: event.time, command: Command.fromStartEvent(event)});
                break;
            case Timeline.enums.TimelineEventType.END :
                commandQueue.push({time: event.time, command: Command.fromEndEvent(event)});
                break;
            case Timeline.enums.TimelineEventType.KEYFRAME :
                commandQueue.push({time: event.time, command: Command.fromKeyFrameEvent(event)});
                break;
        }
    }

    return commandQueue;
}

// call with test data:
processTimeline([
    {
        id: 'obj0', // the id must be unique
    
        trigger: {
            type: Timeline.enums.TriggerType.TIME_ABSOLUTE, 
            value: Date.now()/1000 - 10 // 10 seconds ago
        },
        duration: 60, // 1 minute long
        LLayer: 1, // Logical layer
        content: {
            type: 'video',
            attributes: {
                file: 'AMB'
            }
        }
    },{
        id: 'obj1', // the id must be unique
    
        trigger: {
            type: Timeline.enums.TriggerType.TIME_RELATIVE, 
            value: '#obj0.end'
        },
        duration: 60, // 1 minute long
        LLayer: 1, // Logical layer
        content: {
            type: 'video',
            attributes: {
                file: 'TEST'
            }
        }
    },{

        id: 'obj2',
        duration: 50,
        trigger: {
            type: Timeline.enums.TriggerType.TIME_ABSOLUTE, 
            value: Date.now()/1000 + 120,
        },
        LLayer: 1,
        content: {
            media: 'AMB',
            attributes: {
                positionY: 0,
                positionX: 0,
                scale: 1
            },
            keyframes: [
                {
                    id: 'K0', // id must be unique
                    duration: 5, // duration of keyframe
                    trigger: {
                        type: Timeline.enums.TriggerType.TIME_ABSOLUTE,
                        value: 5 // Abslute time means "relative to parent start time" for a keyframe
                    },
                    content: {
                        attributes: {
                            scale: 0.5
                        }
                    }
                },
            ]
        }
    }
]);

// incoming call from pm2:
process.on('timeline', function (data) {
    /*
        @todo: definition of data object, ideas:
        {
            device: 'CasparCG',
            timeline: {timelineObj},
            attributes: {
                channel: 1
            }
        }
    */

    // the rest of the chain assumes there exists only casparcg
    // @todo: we need something reasonably flexible to deal with multiple integrations.
    const commands = processTimeline(data.timeline);

    if (process.send)
        process.send(`commandQueue`, { attributes: data.attributes, commands });
})