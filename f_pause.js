const sessions = require('./sessions.js');
const codes = require('./codes.js');
const hex2int = require('./hex2int.js');
module.exports = function (req, res) {
    let fullid = req.params.fullid;
    let songindex = hex2int(req.params.songindex);
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
    let sockets = sessions.sockets(easyID, hardID);
    if (sockets === null) {
        codes.send(res, codes.notConnected);
        return;
    }
    for (let socket of sockets) {
        socket.emit('pause', songindex);
    }
    codes.send(res, codes.ok);
};
