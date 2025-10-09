const sessions = require('./sessions.js');
const codes = require('./codes.js');
module.exports = function (req, res) {
    let longid = req.params.longid;
    if (longid.length !== 8) {
        codes.send(res, codes.unknownSession);
        return;
    }
    let easyID = longid.slice(0, 4);
    let hardID = longid.slice(4, 8);
    if (!sessions.verify(easyID, hardID)) {
        codes.send(res, codes.unknownSession);
        return;
    }
    if (sessions.getConnectedNumber(easyID) === 0) {
        codes.send(res, codes.notConnected);
        return;
    }
    codes.send(res, codes.ok);
};
