const sessions = require('./sessions.js');
const codes = require('./codes.js');
module.exports = function (req, res) {
    let fullid = req.params.fullid;
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
    let sockets = sessions.sockets(easyID, hardID);
    if (sockets === null) {
        codes.send(res, codes.notConnected);
        return;
    }
    for (let socket of sockets) {
        socket.emit('stopAll');
    }
    codes.send(res, codes.ok);
};
