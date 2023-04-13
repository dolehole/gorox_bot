import {ChunkManager} from "./utils/chunks.js";
import settings from "./options.json" assert {type: "json"};
import {Gorox} from "./utils/socket_bot.js";
import {closestColor, getPixelData} from "./utils/color.js";

const Checker = new Gorox(settings.bots[0].token, 0, "Checker");
await Checker.connect();

let Chunks = new ChunkManager(Checker);

const [imageData, imgW, imgH, NeedChunks] = await getPixelData(settings.imageLink);

///////
let activeBots = [];

settings.bots.forEach(bot => {
    if (bot.cooldown !== 123)
        activeBots.push(new Gorox(bot.token, bot.cooldown, bot.name));
});
for (let i = 0; i < activeBots.length; i++) {
    await activeBots[i].connect();
}

async function selectReadyBot() {
    while (true) {
        for (let i = 0; i < activeBots.length; i++) {
            if (activeBots[i].ready) {
                return activeBots[i];
            }
        }
        await new Promise(resolve => setTimeout(resolve, 2));
    }
}

//////


let PackPixelsBuffer = [];
let OriginalBuffer = {};

let pixelCounter = 0;
let currentArray = 0;

for (let i = imgW + imgH - 2; i >= 0; i--) {
    for (let x = Math.max(0, i - imgH + 1); x <= Math.min(i, imgW - 1); x++) {
        const y = i - x;
        const index = (y * imgW + x) * 4;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];
        const color = closestColor(r, g, b);

        OriginalBuffer[x + ":" + y] = {
            x:settings.position.x + x,
            y:settings.position.y + y,
            c:color
        }
    }
}
console.log(`\x1b[32m[@]\x1b[0m Builed image map ${Object.keys(OriginalBuffer).length} pixel's`)
async function UpdateProtectZone() {

    for (const [key, n_chunks] of Object.entries(NeedChunks)) {
        Chunks.loadChunk(n_chunks.x, n_chunks.y);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    PackPixelsBuffer = [];
    pixelCounter = 0;
    currentArray = 0;
    for (const [key, pixel] of Object.entries(OriginalBuffer)) {

        if (Chunks.getChunkPixel(pixel.x,pixel.y) != pixel.c ) {

            if (pixelCounter === 30) {
                pixelCounter = 0;
                currentArray++;
            }

            if (!(currentArray in PackPixelsBuffer))
                PackPixelsBuffer[currentArray] = [];
            
            if (pixel.x > 1279 || pixel.y > 1279)
                continue;
            PackPixelsBuffer[currentArray][pixelCounter] = [pixel.x, pixel.y, pixel.c]
            pixelCounter++;

        }
    }

    if (PackPixelsBuffer.length > 0) {
        console.log(`\x1b[32m[@]\x1b[0m Rebuiled plan to draw: ${PackPixelsBuffer.length} pack's`)
    }


}

while (true) {
    if (PackPixelsBuffer.length > 0) {
        for (let i = 0; i < PackPixelsBuffer.length; i++) {
            try {
                const bot = await selectReadyBot();
                bot.sendPixels(PackPixelsBuffer[i], false);
                await new Promise(resolve => setTimeout(resolve, 5));
            } catch (e) {
                console.log(`[!] Error place pixel, continue`);
            }
        }
        console.log(`\x1b[32m[@]\x1b[0m Draw fixed!`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    await UpdateProtectZone();
}