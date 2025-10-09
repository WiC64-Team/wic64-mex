const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { join } = require('node:path');
const app = express();
const server = createServer(app);
const io = new Server(server);
const sessions = require('./sessions.js');
const catcher = require('./catcher.js');

app.use(express.static('public'));

sessions.load();
setInterval(sessions.persist, 60 * 1000);

process.on('exit', sessions.persist);
process.on('SIGINT', () => {
    process.exit();
});
process.on('SIGTERM', () => {
    process.exit();
});

app.get('/page/playlist-check', (req, res) => {
    res.sendFile(join(__dirname, 'pl-check.html'));
});

app.get('/l/:shortid', (req, res) => {
    let shortid = req.params.shortid;
    if (shortid !== shortid.toUpperCase()) {
        res.redirect('/l/' + shortid.toUpperCase());
        return;
    }

    if (!sessions.touch(shortid)) {
        res.redirect('/?error=unknownSession');
        return;
    }
    res.sendFile(join(__dirname, 'public/player.html'));
});

app.get(/^\/r(\/.*)?/, catcher(require('./f_register.js')));

app.get('/c/:longid', catcher(require('./f_connect.js')));
app.get('/c/:longid/*ignore', catcher(require('./f_connect.js')));

app.get(/^\/P\/([^/]+)(\/.*)$/, catcher(require('./f_playlist.js')));

app.get('/p/:fullid/:songindex', catcher(require('./f_play.js')));
app.get('/p/:fullid/:songindex/*ignore', catcher(require('./f_play.js')));

app.get('/h/:fullid/:songindex', catcher(require('./f_pause.js')));
app.get('/h/:fullid/:songindex/*ignore', catcher(require('./f_pause.js')));

app.get('/s/:fullid/:songindex', catcher(require('./f_stop')));
app.get('/s/:fullid/:songindex/*ignore', catcher(require('./f_stop')));

app.get('/a/:fullid/', catcher(require('./f_stopAll')));
app.get('/a/:fullid/*ignore', catcher(require('./f_stopAll')));

app.get('/v/:fullid/:songindex/:volume', catcher(require('./f_volume')));

app.get('/q/:fullid', catcher(require('./f_qr2sprite')));
app.get('/q/:fullid/*ignore', catcher(require('./f_qr2sprite')));

app.get('/page/:pagename', catcher(require('./page.js')));

app.get('/admin/:action', catcher(require('./admin.js')));

io.on('connection', (socket) => {
    console.log('a user connected');
    let shortid;
    socket.on('join', (sid) => {
        shortid = sid;
        if (sessions.connect(shortid, socket)) {
            socket.emit('playlist', sessions.getPlaylistURL(shortid));
        }
    });

    socket.on('playlistReady', () => {
        let volumes = sessions.getVolumes(shortid);
        for (let songindex in Object.keys(volumes)) {
            socket.emit('volume', songindex, volumes[songindex], true);
        }
    });

    socket.on('disconnect', () => {
        sessions.disconnect(shortid, socket);
    });

    socket.on('ping', () => {
        socket.emit('pong');
        sessions.touch(shortid);
    });
});

setInterval(sessions.cleanup, 15 * 60 * 1000);

server.listen(
    3000,
    /*'localhost',*/ () => {
        console.log('server running at http://localhost:3000');
    }
);
