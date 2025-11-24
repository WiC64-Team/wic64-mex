const fs = require('node:fs');

let sessions = {};

let easyChars = 'ABCDEFGHKMNPQRSUVWXYZ2345689';
let hardChars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@-_=+;:,.';

let sess = {
    persist: function () {
        let dataToSave = {};
        for (let id in sessions) {
            dataToSave[id] = {
                hardID: sessions[id].hardID,
                playlistURL: sessions[id].playlistURL,
                lastTouch: sessions[id].lastTouch,
                sockets: [],
                volumes: sessions[id].volumes,
            };
        }
        fs.writeFileSync('sessions.json', JSON.stringify(dataToSave), {
            encoding: 'utf8',
            flag: 'w',
        });
    },
    load: function () {
        if (fs.existsSync('sessions.json')) {
            let data = fs.readFileSync('sessions.json', {
                encoding: 'utf8',
                flag: 'r',
            });
            try {
                sessions = JSON.parse(data);
            } catch (e) {
                console.error(
                    'Error parsing sessions.json, starting with empty sessions.',
                    e
                );
                sessions = {};
            }
        }
        sessions['1234'] = sessions['1234'] || {};

        sessions['1234'].hardID = 'test';
        sessions['1234'].playlistURL =
            'https://wsmplaylists.shnbk.de/demo.json';
        sessions['1234'].lastTouch = Date.now() * 10;
        sessions['1234'].sockets = [];
        this.persist();
    },
    register: function (playlistURL) {
        let easyID;
        let hardID = makeID(4, hardChars);
        do {
            easyID = makeID(4, easyChars);
        } while (sessions[easyID] || !easyID.match(/[0-9]/));
        sessions[easyID] = {
            hardID: hardID,
            playlistURL: playlistURL,
            lastTouch: Date.now(),
            sockets: [],
        };
        return { easyID: easyID, hardID: hardID };
    },
    touch: function (id) {
        if (!sessions[id]) return false;
        sessions[id].lastTouch = Math.max(Date.now(), sessions[id].lastTouch);
        return true;
    },
    connect: function (id, socket) {
        if (!sessions[id]) return false;
        sessions[id].sockets.push(socket);
        this.touch(id);
        return true;
    },
    disconnect: function (id, socket) {
        if (!sessions[id]) return false;
        let index = sessions[id].sockets.indexOf(socket);
        if (index === -1) return false;
        sessions[id].sockets.splice(index, 1);
        this.touch(id);
        return true;
    },
    cleanup: function () {
        let now = Date.now();
        for (let id in sessions) {
            if (now - sessions[id].lastTouch > 12 * 60 * 60 * 1000) {
                delete sessions[id];
            }
        }
    },
    debug: function () {
        console.log(sessions);
    },
    getConnectedNumber: function (id) {
        if (!sessions[id]) return 0;
        return sessions[id].sockets.length;
    },
    getPlaylistURL: function (id) {
        if (!sessions[id]) return null;
        return sessions[id].playlistURL;
    },
    setPlaylistURL(id, url) {
        if (!sessions[id]) return false;
        sessions[id].playlistURL = url;
        this.touch(id);
        return true;
    },
    verify: function (easyID, hardID) {
        if (!sessions[easyID]) return false;
        return sessions[easyID].hardID === hardID;
    },
    sockets: function (easyID, hardID) {
        if (!this.verify(easyID, hardID)) return null;
        return sessions[easyID].sockets;
    },
    saveVolume: function (easyID, hardID, songIndex, volume) {
        if (!this.verify(easyID, hardID)) return false;
        if (isNaN(songIndex) || songIndex < 0) return false;
        if (isNaN(volume) || volume < 0 || volume > 255) return false;
        this.touch(easyID);
        if (!sessions[easyID].volumes) sessions[easyID].volumes = {};
        sessions[easyID].volumes[songIndex] = volume;
        return true;
    },
    getVolumes: function (easyID) {
        if (!sessions[easyID].volumes) return {};
        return sessions[easyID].volumes;
    },
};

function makeID(length, characters) {
    let result = '';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    return result;
}

module.exports = sess;
