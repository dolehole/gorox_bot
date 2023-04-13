import Chunk from "./Chunk.js";
import WebSocket from "ws";
import {argbToId, bgrPalette} from "./color.js";
function boardToChunk(x, y) {
    let cx = x / 256 | 0;
    let cy = y / 256 | 0;

    let offx = x % 256;
    let offy = y % 256;

    return [
        cx,
        cy,
        offx,
        offy
    ]
}
class ChunkManager {
    constructor(bot) {
        this.chunks = new Map();

        this.bot = bot;

        this.loadingChunks = new Set();

        this.reconnect();

        const me = this;
        this.bot.on("opened",()=>{
            me.reconnect();
            console.log("\x1b[32m[!]\x1b[0m Rebinded!")
        })
    }

    reconnect() {
        this.bot.socket.on('chunk', (cx, cy, cdata) => {
            let key = this.getChunkKey(cx, cy);
            if (!this.loadingChunks.has(key)) return
            this.loadingChunks.delete(key);
            let chunk = new Chunk(cx, cy, cdata);
            this.chunks.set(key, chunk);
        })

        this.bot.socket.on('place', (x, y, col) => {
            this.setChunkPixel(x, y, col);
        })
    }

    getChunkKey(x, y) {
        return x << 4 | y
    }

    loadChunk(x, y) {
        let key = this.getChunkKey(x, y);

        if (this.bot.socket.readyState === WebSocket.OPEN && !this.loadingChunks.has(key) && this.loadingChunks.size < 3) {
            this.bot.requestChunk(x, y);

            this.loadingChunks.add(key);
        }
    }

    hasChunk(x, y) {
        let key = this.getChunkKey(x, y);

        return this.chunks.has(key);
    }

    getChunk(x, y) {
        let key = this.getChunkKey(x, y);

        if (!this.chunks.has(key)) {
            return 0
        }
        return this.chunks.get(key)
    }

    getChunkPixel(x, y) {
        let [cx, cy, offx, offy] = boardToChunk(x, y);
        let chunk = this.getChunk(cx, cy);

        if (!chunk || x < 0 || y < 0) return -1

        let argb = chunk.get(offx, offy);

        return argbToId[argb]
    }

    setChunkPixel(x, y, col) {
        let [cx, cy, offx, offy] = boardToChunk(x, y);

        let key = this.getChunkKey(cx, cy);
        if (this.chunks.has(key)) {
            this.chunks.get(key).set(offx, offy, bgrPalette[col])
        }
    }
}


export {ChunkManager,boardToChunk}