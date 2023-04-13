import {wepixels} from "./settings.js";
function rgb2abgr(r, g, b) {
    return 0xff000000 | b << 16 | g << 8 | r;
}
const bgrPalette = new Uint32Array(wepixels.map((rgb) => rgb2abgr(...rgb)))
export default class Chunk{
    constructor(x, y, buffer){
        this.x = x;
        this.y = y;
        this.view = new Uint32Array(65536);
        this.fromBuffer(buffer);
    }


    fromBuffer(buf){
        let col, isProtected;
        for(let i = 0; i < buf.byteLength; i++){
            col = buf[i];

            this.view[i] = bgrPalette[col & 0x7F];
        }
    }

    get(x, y){
        return this.view[x + y * 256]
    }

    set(x, y, c){
        const i = x + y * 256

        this.view[i] = c;
    }
}