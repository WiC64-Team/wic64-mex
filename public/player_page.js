function devLog(msg) {
    if (localStorage.getItem('devMode') !== '1') {
        return;
    }
    let d = new Date();

    msg = String(msg).replace(/\n/g, '\n                ');
    let ts =
        `[${String(d.getHours()).padStart(2, '0')}:` +
        `${String(d.getMinutes()).padStart(2, '0')}:` +
        `${String(d.getSeconds()).padStart(2, '0')}.` +
        `${String(d.getMilliseconds()).padStart(3, '0')}` +
        ']: ' +
        msg;
    logs.innerText += ts + '\n';
    if (localStorage.getItem('autoscroll') === '1') {
        window.scrollTo(0, document.body.scrollHeight);
    }
}
/*
function isdev() {
    return localStorage.getItem('devMode') === '1';
}*/

let latencyPool = [];
document
    .getElementById('explanation_link')
    .addEventListener('click', function () {
        let m = document.getElementById('explanation_max');
        if (m.classList.contains('hidden')) {
            m.classList.remove('hidden');
        } else {
            m.classList.add('hidden');
        }
    });
let acquiredLock;
document.getElementById('nosleep').addEventListener('change', function () {
    if (this.checked) {
        navigator.wakeLock
            .request('screen')
            .then((lock) => {
                acquiredLock = lock;
                console.log('lock acquired!');
            })
            .catch(() => {
                console.log('lock failed!');
            });
    } else {
        if (acquiredLock) {
            acquiredLock.release().then(() => {
                acquiredLock = null;
                console.log('lock released!');
            });
        }
    }
});

let players = {};
function run() {
    document.getElementById('explanation_min').remove();
    document.querySelector('button').remove();
    // io() is defined in socket.io script
    // eslint-disable-next-line no-undef
    const socket = io();
    const code = window.location.pathname.split('/').pop();
    document.getElementById('code').innerText = code;
    document.getElementById('disconnected').classList.add('hidden');
    document.getElementById('connected').classList.remove('hidden');
    let started = false;

    socket.on('playlist', (playlist) => {
        let data = playlist.map((item) => ({
            url: item.url,
            loop: !!item.loop,
            preload: !!item.preload,
            rewindOnPlay: !!item.rewindOnPlay,
            skipTo: parseInt(item.skipTo) || -1,
            volume:
                item.volume !== undefined
                    ? Math.min(Math.max(parseFloat(item.volume), 0), 1)
                    : 1,
            fadeMs:
                item.fadeMs !== undefined
                    ? Math.max(parseInt(item.fadeMs), 0)
                    : 1000,
        }));
        players = {};
        let lasedUsedIdx = -1;
        for (let i = 0; i < data.length; i++) {
            const audio = new Audio();
            audio.src = data[i].url;
            audio.loop = data[i].loop;
            audio.preload = data[i].preload ? 'auto' : 'none';
            audio.volume = data[i].volume;
            if (data[i].preload) {
                audio.load();
            }
            audio.onerror = (e) => {
                console.error(`Error loading audio file: ${data[i].url}`, e);
            };
            let myIndex = Math.max(lasedUsedIdx + 1, data[i].skipTo);

            lasedUsedIdx = myIndex;

            data[i].audio = audio;

            players[myIndex] = data[i];
            data[i].index = myIndex;
        }
        devLog(`Fetched playlist data: ${JSON.stringify(data, null, 2)}`);
        socket.emit('playlistReady');
    });

    socket.on('play', (index) => {
        devLog(`Play command received for index ${index}`);
        if (players[index]) {
            if (players[index].rewindOnPlay) {
                players[index].audio.currentTime = 0;
            }
            players[index].audio.play();
        } else {
            devLog(`No audio player for index ${index}`);
        }
    });

    socket.on('pause', (index) => {
        devLog(`Pause command received for index ${index}`);
        if (players[index]) {
            players[index].audio.pause();
        } else {
            devLog(`No audio player for index ${index}`);
        }
    });

    socket.on('stop', (index) => {
        devLog(`Stop command received for index ${index}`);
        if (players[index]) {
            players[index].audio.currentTime = 0;
            players[index].audio.pause();
            players[index].audio.currentTime = 0;
        } else {
            devLog(`No audio player for index ${index}`);
        }
    });

    socket.on('volume', (index, targetVolume, instant) => {
        instant = !!instant;
        if (instant) {
            devLog(
                `Instant volume command received for index ${index} and volume ${targetVolume}`
            );
            if (!players[index]) {
                devLog(`No audio player for index ${index}`);
                return;
            }
            targetVolume = Math.min(Math.max(parseFloat(targetVolume), 0), 1);
            if (isNaN(targetVolume)) {
                devLog(`Invalid target volume: ${targetVolume}`);
                return;
            }
            players[index].audio.volume = targetVolume;
            return;
        }
        devLog(
            `volume command received for index ${index} and volume ${targetVolume}`
        );
        if (players[index]) {
            let currentVolume = players[index].audio.volume;
            targetVolume = Math.min(Math.max(parseFloat(targetVolume), 0), 1);
            if (isNaN(targetVolume)) {
                devLog(`Invalid target volume: ${targetVolume}`);
                return;
            }
            let fadeMs = players[index].fadeMs;
            if (fadeMs <= 0) {
                players[index].audio.volume = targetVolume;
                return;
            }
            let partialFadeMs = fadeMs * Math.abs(currentVolume - targetVolume);
            devLog(
                `Fading volume from ${currentVolume} to ${targetVolume} over ${partialFadeMs} ms`
            );
            let steps = Math.max(Math.floor(partialFadeMs / 25), 1);
            let step = (targetVolume - currentVolume) / steps;
            let currentStep = 0;
            let interval = setInterval(() => {
                currentStep++;
                currentVolume += step;

                if (currentStep >= steps) {
                    players[index].audio.volume = targetVolume;
                    clearInterval(interval);
                    devLog(`Volume fade completed to ${targetVolume}`);
                    return;
                }
                players[index].audio.volume = currentVolume;
            }, partialFadeMs / steps);
        } else {
            devLog(`No audio player for index ${index}`);
        }
    });

    socket.on('stopAll', () => {
        devLog('StopAll command received');
        for (let playerIdx of Object.keys(players)) {
            let player = players[playerIdx];
            player.audio.currentTime = 0;
            player.audio.pause();
            player.audio.currentTime = 0;
        }
    });

    socket.emit('join', code);
    let lastPong = 0;
    let lastPing = 0;

    setInterval(() => {
        socket.emit('ping');
        lastPing = Date.now();
        setTimeout(() => {
            started = true;
        }, 1000);
    }, 1000);

    socket.on('pong', () => {
        lastPong = Date.now();
        latencyPool.push(lastPong - lastPing);
        if (latencyPool.length > 10) latencyPool.shift();
        let latency = Math.round(
            latencyPool.reduce((a, b) => a + b, 0) / latencyPool.length
        );

        while (latencyPool.length > 60) {
            latencyPool.shift();
        }
        if (latency < 0) latency = 0;
        document.getElementById('latency').innerText =
            ` latency (roundtrip): ${latency} ms)`;
    });

    setInterval(() => {
        if (!started) {
            return;
        }
        let status = document.getElementById('con_status');
        if (Date.now() - lastPong <= 1500) {
            status.innerText = 'Connection is healthy.';
        } else if (Date.now() - lastPong <= 2000) {
            status.innerText = 'Connection is slow.';
        } else {
            status.innerText = 'Connection lost. Trying to reconnect...';
            socket.emit('reconnect');
        }
    }, 250);
}

document.getElementById('letsstart').addEventListener('click', run);

const devModeCheckBox = document.getElementById('devMode');
const devContainer = document.getElementById('devContainer');
devModeCheckBox.addEventListener('change', function () {
    if (this.checked) {
        localStorage.setItem('devMode', '1');
    } else {
        localStorage.removeItem('devMode');
    }
    devMode();
});

const autoscroll = document.getElementById('autoscroll');
autoscroll.addEventListener('change', function () {
    if (this.checked) {
        localStorage.setItem('autoscroll', '1');
    } else {
        localStorage.removeItem('autoscroll');
    }
});
if (localStorage.getItem('autoscroll') === '1') {
    autoscroll.checked = true;
}

if (localStorage.getItem('devMode') === '1') {
    devModeCheckBox.checked = true;
}
devMode();

function devMode() {
    if (localStorage.getItem('devMode') !== '1') {
        devContainer.classList.add('hidden');
        return;
    }
    devContainer.classList.remove('hidden');
}
const logs = document.getElementById('log');
