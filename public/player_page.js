function devLog(songid, msg) {
    if (localStorage.getItem('devMode') !== '1') {
        return;
    }
    let d = new Date();
    let songidAsHex = '';
    if (songid !== null) {
        songidAsHex = songid.toString(16).padStart(4, '0');
        songidAsHex = `<span data-sn="${songidAsHex}">[${songidAsHex}]</span> `;
    }

    msg = String(msg).replace(/\n/g, '\n                ');
    let ts =
        `[${String(d.getHours()).padStart(2, '0')}:` +
        `${String(d.getMinutes()).padStart(2, '0')}:` +
        `${String(d.getSeconds()).padStart(2, '0')}.` +
        `${String(d.getMilliseconds()).padStart(3, '0')}` +
        ']: ' +
        songidAsHex +
        msg;
    logs.innerHTML += ts + '\n';
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
        localStorage.setItem('nosleep', '1');
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
        localStorage.removeItem('nosleep');
        if (acquiredLock) {
            acquiredLock.release().then(() => {
                acquiredLock = null;
                console.log('lock released!');
            });
        }
    }
});
if (localStorage.getItem('nosleep') === '1') {
    document.getElementById('nosleep').checked = true;
    document.getElementById('nosleep').dispatchEvent(new Event('change'));
}

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
            fadeInterval: null,
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
        //TODO: make this activateable
        //devLog(`Fetched playlist data: ${JSON.stringify(data, null, 2)}`);
        socket.emit('playlistReady');
    });

    socket.on('play', (index) => {
        devLog(index, `Play command received for index ${index}`);
        if (players[index]) {
            if (players[index].rewindOnPlay && !players[index].audio.paused) {
                players[index].audio.currentTime = 0;
            }
            players[index].audio.play();
        } else {
            devLog(index, `No audio player for index ${index}`);
        }
    });

    socket.on('pause', (index) => {
        devLog(index, `Pause command received for index ${index}`);
        if (players[index]) {
            players[index].audio.pause();
        } else {
            devLog(index, `No audio player for index ${index}`);
        }
    });

    socket.on('stop', (index) => {
        devLog(index, `Stop command received for index ${index}`);
        if (players[index]) {
            players[index].audio.currentTime = 0;
            players[index].audio.pause();
            players[index].audio.currentTime = 0;
        } else {
            devLog(index, `No audio player for index ${index}`);
        }
    });

    socket.on('volume', (index, targetVolume, instant) => {
        instant = !!instant;
        let volumeAsPercent = Math.round(targetVolume * 10000) / 100;
        let volumeAsHex = (targetVolume * 255).toString(16).padStart(2, '0');
        if (instant) {
            devLog(
                index,
                `Instant volume command received for index ${index} and volume ${volumeAsHex} / ${volumeAsPercent}%`
            );
            if (!players[index]) {
                devLog(index, `No audio player for index ${index}`);
                return;
            }
            targetVolume = Math.min(Math.max(parseFloat(targetVolume), 0), 1);
            if (isNaN(targetVolume)) {
                devLog(index, `Invalid target volume: ${targetVolume}`);
                return;
            }
            players[index].audio.volume = targetVolume;
            return;
        }
        devLog(
            index,
            `volume command received for index ${index} and volume ${volumeAsHex} / ${volumeAsPercent}%`
        );
        if (players[index]) {
            let currentVolume = players[index].audio.volume;
            targetVolume = Math.min(Math.max(parseFloat(targetVolume), 0), 1);
            if (isNaN(targetVolume)) {
                devLog(index, `Invalid target volume: ${targetVolume}`);
                return;
            }
            let fadeMs = players[index].fadeMs;
            if (fadeMs <= 0) {
                players[index].audio.volume = targetVolume;
                return;
            }
            let partialFadeMs = fadeMs * Math.abs(currentVolume - targetVolume);
            devLog(
                index,
                `Fading volume from ${currentVolume} to ${targetVolume} over ${partialFadeMs} ms`
            );
            let steps = Math.max(Math.floor(partialFadeMs / 25), 1);
            let step = (targetVolume - currentVolume) / steps;
            let currentStep = 0;
            if (players[index].interval) {
                clearInterval(players[index].interval);
            }
            players[index].interval = setInterval(() => {
                currentStep++;
                currentVolume += step;

                if (currentStep >= steps) {
                    players[index].audio.volume = targetVolume;
                    clearInterval(players[index].interval);
                    devLog(index, `Volume fade completed to ${targetVolume}`);
                    return;
                }
                players[index].audio.volume = currentVolume;
            }, partialFadeMs / steps);
        } else {
            devLog(index, `No audio player for index ${index}`);
        }
    });

    socket.on('stopAll', () => {
        devLog(null, 'StopAll command received');
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

document.addEventListener('mouseover', function (event) {
    //check if event target has data-sn set and reurn if not
    let target = event.target;
    if (!target.dataset.sn) {
        return;
    }
    //remove all highlights first
    let highlightedElements = document.querySelectorAll('.highlighted');
    highlightedElements.forEach((el) => {
        el.classList.remove('highlighted');
    });

    //highlight all elements with the same data-sn
    let sn = target.dataset.sn;
    let elements = document.querySelectorAll(`[data-sn="${sn}"]`);
    elements.forEach((el) => {
        el.classList.add('highlighted');
    });
});

document.addEventListener('mouseout', function (event) {
    //check if event target has data-sn set and reurn if not
    let target = event.target;
    if (!target.dataset.sn) {
        return;
    }
    //remove highlight from all elements with the same data-sn
    let sn = target.dataset.sn;
    let elements = document.querySelectorAll(`[data-sn="${sn}"]`);
    elements.forEach((el) => {
        el.classList.remove('highlighted');
    });
});
