const qr = require('qr');

const chars2 = {
    '0000': 32,
    1010: 97,
    '0011': 98,
    1001: 127,

    1111: 160,
    '0101': 225,
    1100: 226,
    '0110': 255,
    '0001': 108,
    '0010': 123,
    '0100': 124,
    1000: 126,
    1110: 236,
    1101: 251,
    1011: 252,
    '0111': 254,
};

const chars1 = [chars2['0000'], chars2['1111']];

function renderTo25(qrdata) {
    let out = new Uint8ClampedArray(1001);
    out[0] = 0;
    let n = 1;
    for (let y = 0; y < 25; y++) {
        for (let x = 0; x < 40; x++) {
            let pixelBlack = qrdata[y] && qrdata[y][x];
            out[n] = pixelBlack ? chars1[1] : chars1[0];
            n++;
        }
    }
    return out;
}

function renderTo50(qrdata) {
    let out = new Uint8ClampedArray(1001);
    out[0] = 0;
    let n = 1;
    console.log(qrdata);
    for (let y = 0; y < 50; y += 2) {
        for (let x = 0; x < 80; x += 2) {
            let pixelsBlack = '';
            pixelsBlack += qrdata[y] && qrdata[y][x] ? '1' : '0';
            pixelsBlack += qrdata[y] && qrdata[y][x + 1] ? '1' : '0';
            pixelsBlack += qrdata[y + 1] && qrdata[y + 1][x] ? '1' : '0';
            pixelsBlack += qrdata[y + 1] && qrdata[y + 1][x + 1] ? '1' : '0';
            out[n] = chars2[pixelsBlack];
            n++;
        }
    }
    return out;
}

const urlprefix = 'https://mex.wic64.net/l/';
module.exports = function (req, res) {
    let fullid = req.params.fullid;
    fullid = fullid.slice(0, 4);
    let url = urlprefix + fullid;
    let qrData;
    for (let ecc of ['high', 'quartile', 'medium', 'low']) {
        for (let border = 3; border >= 1; border--) {
            qrData = qr.encodeQR(url, 'raw', { ecc: ecc, border: border });
            if (qrData.length <= 25 && qrData[0].length <= 25) {
                res.send(renderTo25(qrData));
                return;
            }
        }
    }
    for (let ecc of ['high', 'quartile', 'medium', 'low']) {
        for (let border = 3; border >= 1; border--) {
            qrData = qr.encodeQR(url, 'raw', { ecc: ecc, border: border });
            if (qrData.length <= 50 && qrData[0].length <= 50) {
                res.send(renderTo50(qrData));
                return;
            }
        }
    }
    res.send(0);
};
