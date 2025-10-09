const sessions = require('./sessions.js');
const codes = require('./codes.js');
module.exports = function (req, res) {
    let playlistUrl = 'https://' + req.params[0];
    let id = sessions.register(playlistUrl);
    res.send(codes.ok.byte + id.easyID + id.hardID);
};
