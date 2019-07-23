import { EventEmitter } from "events"

export class UDPPort extends EventEmitter {

    open () {
        this.emit('ready')
    }

    send ({ address }) {
        if (address === '/state/full') {
            this.emit('message', {
                address: '/state/full',
                args: [{
                    type: 's',
                    value: `{ "channel": [{
                        "faderLevel": 0.75,
                        "pgmOn": false,
                        "pstOn": false
                    }, {
                        "faderLevel": 0.75,
                        "pgmOn": false,
                        "pstOn": false
                    }] }`
                }]
            })
        }
    }

    close () {}

}
