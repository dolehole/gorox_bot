import EventEmitter from 'events';
import WebSocket from 'ws';
import {packPixel} from "./color.js";
import pako from 'pako'
function unpackPixel(num) {
    return [
        num >>> 19,
        num >>> 7 & 0xFFF,
        num & 0b1111111
    ]
}
class Gorox extends EventEmitter {
    constructor(token,cooldown,name = "#") {
        super();
        this.url = "wss://goroxels.ru:443";
        this.token = token;
        this.cooldown = cooldown;
        this.ready = false;
        this.name = name;
        this.pendingPixels = {};
        this.echo(`Bot inited!`);
    }

    echo(message) {
        console.log(`\x1b[33m[${this.name}]\x1b[0m ` + message);
    }
    async connect() {
        const me = this
        this.socket = await new Promise(function(resolve, reject) {

            const server = new WebSocket(me.url, {
                headers: {
                    'Cookie': me.token,
                }
            });
            server.binaryType = 'arraybuffer';
            server.bot = me;
            server.onmessage = me.onmessage.bind(server);
            server.onopen = function() {
                resolve(server);
            };
            server.onerror = function(err) {
                reject(err);
            };
            server.onclose = () => {
                me.emit('closed');
                me.ready = false;
                setTimeout(() => {
                    me.connect();
                }, Math.random()*5000);
            }

        });
        await this.sendCanvas(0);
        this.emit('opened');
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.ready = true;
    }

    onmessage({data: msg}) {
        if (typeof msg !== 'string')  {

            if (!msg.byteLength) return;

            const dv = new DataView(msg);

            switch (dv.getUint8(0)) {
                case 0x0: {
                    const cx = dv.getUint8(1);
                    const cy = dv.getUint8(2);

                    const chunkData = pako.inflate(dv.buffer.slice(3));

                    this.emit('chunk', cx, cy, chunkData);

                    break
                }
                case 0x1: {
                    const [x, y, col] = unpackPixel(dv.getUint32(1));

                    const id = dv.getUint32(5);

                    this.emit('place', x, y, col, id);

                    break
                }
            }
        }
    }

    async sendCanvas(id) {
        const dv = new DataView(new ArrayBuffer(2));
        dv.setUint8(0, 3);
        dv.setUint8(1, id);
        await this.socket.send(dv.buffer);
    }
    async sendPixel(x, y, c) {
        this.ready = false;
        let dv = new DataView(new ArrayBuffer(5))
        dv.setUint8(0, 1);
        dv.setUint32(1, packPixel(x | 0, y | 0, c));
        await this.checkConnection();
        this.socket.send(dv.buffer);
        await new Promise(resolve => setTimeout(resolve, this.cooldown));
        this.ready = true;
    }

    async sendPixels(pixelsArray, t=!1) {
        this.ready = false;
        if (pixelsArray === undefined){
            this.ready = true;
            return;
        }
        let dv = new DataView(new ArrayBuffer(6 + 4 * pixelsArray.length));
        await this.checkConnection();
        dv.setUint8(0, 4);
        dv.setUint8(1, t ? 1 : 0);
        for (let t = 0; t < pixelsArray.length; t++) {
            let r = 4 * t + 6;
            if (!(t in pixelsArray)) continue;
    
            try {
                const [o, i, a] = pixelsArray[t]
                    , s = packPixel(o, i, a);
                dv.setUint32(r, s)
            } catch (e) { }
        }
        this.socket.send(dv.buffer);
        await new Promise(resolve => setTimeout(resolve, 500));
        this.ready = true;
    }

    async checkConnection() {
        if (this.socket.readyState !== WebSocket.OPEN) {
            this.ready = false;
        }
    }
    async requestChunk(x, y) {
        let dv = new DataView(new ArrayBuffer(1 + 1 + 1));
        dv.setUint8(0, 0x0);
        dv.setUint8(1, x);
        dv.setUint8(2, y);
        await this.socket.send(dv.buffer)
    }

}

export {Gorox};