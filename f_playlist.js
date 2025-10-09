const sessions = require('./sessions.js');
const codes = require('./codes.js');
module.exports = function (req, res) {
    let fullid = req.params[0];
    let easyID = fullid.slice(0, 4);
    let hardID = fullid.slice(4, 8);
    if (!sessions.verify(easyID, hardID)) {
        codes.send(res, codes.unknownSession);
        return;
    }
    let playlistUrl = 'https://' + req.params[1];
    sessions.setPlaylistURL(easyID, playlistUrl);

    for (let socket of sessions.sockets(easyID, hardID)) {
        console.log('Emitting playlist to', easyID, playlistUrl);
        socket.emit('playlist', playlistUrl);
    }

    codes.send(res, codes.ok);
};
