import {wepixels} from "./settings.js";
import sharp from "sharp";
import fetch from "node-fetch";
import {boardToChunk} from "./chunks.js";
import settings from "../options.json" assert { type: "json" };
function closestColor(r, g, b) {
    let minDistance = Number.MAX_VALUE;
    let closestColor = 0;

    for (let i = 0; i < wepixels.length; i++) {
        const color = wepixels[i];
        const x = color[0];
        const y = color[1];
        const z = color[2];
        const distance = Math.sqrt((r - x) ** 2 + (g - y) ** 2 + (b - z) ** 2);

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = i;
        }
    }
    return closestColor;
}
function packPixel(x, y, col) {
    return (x << 12 | y) << 7 | col
}

async function getPixelData(image) {


    const bufferImage = await (await fetch(image)).arrayBuffer(); // download image
    const metadata = await sharp(bufferImage).metadata(); // get image metadata
    const rgbaBuffer = await sharp(bufferImage).raw().toBuffer() // convert rgba image

    const width = metadata.width; // get image width
    const height = metadata.height; // get image height
    let pixelData = new Uint8ClampedArray(width * height * 4);

    let NeedChunks = {};
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let [cx, cy, offx, offy] = boardToChunk(x+ settings.position.x, y+ settings.position.y);
            if (!(cx+":"+cy in NeedChunks))
                NeedChunks[cx+":"+cy] = {x: cx, y: cy};
        }
    }

    for (let i = 0; i < rgbaBuffer.length / 4; i++) {
        const r = rgbaBuffer[i * 4];
        const g = rgbaBuffer[i * 4 + 1];
        const b = rgbaBuffer[i * 4 + 2];
        const index = i * 4;

        pixelData[index] = r;
        pixelData[index + 1] = g;
        pixelData[index + 2] = b;
        pixelData[index + 3] = 255;
    }

    return [pixelData,width,height,NeedChunks];
}

function rgb2abgr(r, g, b) {
    return 0xff000000 | b << 16 | g << 8 | r;
}

let argbToId = {};


const bgrPalette = new Uint32Array(wepixels.map((rgb) => rgb2abgr(...rgb)))
Array.from(bgrPalette.values()).forEach((argb, i) => argbToId[argb] = i);

export {closestColor,packPixel,getPixelData,rgb2abgr,bgrPalette,argbToId}