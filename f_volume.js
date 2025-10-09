const sessions = require('./sessions.js');
const codes = require('./codes.js');
const hex2int = require('./hex2int.js');
module.exports = function (req, res) {
    let fullid = req.params.fullid;
    let songindex = hex2int(req.params.songindex);
    let volume = hex2int(req.params.volume) / 255;

    if (fullid.length !== 8) {
        codes.send(res, codes.unknownSession);
        return;
    }
    let easyID = fullid.slice(0, 4);
    let hardID = fullid.slice(4, 8);
    if (!sessions.verify(easyID, hardID)) {
        codes.send(res, codes.unknownSession);
        return;
    }
    sessions.touch(easyID);
    if (isNaN(songindex) || songindex < 0) {
        codes.send(res, codes.songIndexOutOfRange);
        return;
    }
    sessions.saveVolume(easyID, hardID, songindex, volume);

    let sockets = sessions.sockets(easyID, hardID);
    if (sockets === null || sockets.length === 0) {
        codes.send(res, codes.notConnected);
        return;
    }
    codes.send(res, codes.ok);
    for (let socket of sockets) {
        socket.emit('volume', songindex, volume);
    }
};
