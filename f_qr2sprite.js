const qr = require('qr');

const urlprefix = 'https://mex.wic64.net/l/';
module.exports = function (req, res) {
    let fullid = req.params.fullid;
    fullid = fullid.slice(0, 4);
    let url = urlprefix + fullid;
    let qrData;
    for (let border = 3; border >= 1; border--) {
        for (let ecc of ['high', 'quartile', 'medium', 'low']) {
            qrData = qr.encodeQR(url, 'raw', { ecc: ecc, border: border });
            if (qrData.length <= 42 && qrData[0].length <= 42) {
                console.log('Using ecc', ecc, 'border', border);
                res.send(sprite(qrData));
                return;
            }
        }
    }
};

function sprite(qrData) {
    let emptySprite = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    let sprites = [
        emptySprite.slice(),
        emptySprite.slice(),
        emptySprite.slice(),
        emptySprite.slice(),
    ];
    for (let spriteNum = 0; spriteNum < 4; spriteNum++) {
        for (let x = 0; x < 24; x++) {
            let qrOffsetX = (spriteNum % 2) * 24;
            if (x + qrOffsetX >= qrData[0].length) {
                continue;
            }
            for (let y = 0; y < 21; y++) {
                let qrOffsetY = Math.floor(spriteNum / 2) * 21;

                if (y + qrOffsetY >= qrData.length) {
                    continue;
                }
                let qrValue = qrData[y + qrOffsetY][x + qrOffsetX];
                if (!qrValue) {
                    let targetSpriteNum = spriteNum;
                    let targetByte = Math.floor(x / 8) + y * 3;
                    let targetBit = 7 - (x % 8);
                    let substractingValue = 1 << targetBit;
                    sprites[targetSpriteNum][targetByte] += substractingValue;
                }
            }
        }
    }

    const bytes = new Uint8ClampedArray(1 + 64 * sprites.length);

    bytes[0] = 0;
    for (let i = 0; i < sprites.length; i++) {
        for (let j = 0; j < sprites[i].length; j++) {
            bytes[1 + i * 64 + j] = sprites[i][j];
        }
    }

    console.log(bytes.buffer);

    return bytes;
}
