# WiC64meX, the WiC64-Media-Extension Developer Documentation

## Prerequirements

You'll need a playlist and your media-files accessible on a webserver served via https(!) and with CORS header setup that a browsers serving from another domain can access the files.

These media-files can be anything [that your user's browser can handle](https://caniuse.com/?search=audio%20format).

A playlist is a JSON file, containing an array at the top most level, each entry is an object.

You can have up to 65535 entries in your playlist. that's 2^16 - 1, more on that in section stop.

These object's have a mandatory `url` property, which is the full URL to the media-file.

And may have these optional properties:

- preload: boolean, default false
    - If true, the mediafile will be preloaded into the browsers memory. That's a good idea for action sounds, like a gunshot, so it plays on time even on the first occurrence. For lager background-music, especially if there are alot of them, it's a bad idea.
- loop: boolean, default false
    - If true, the mediafile will loop forever, until stopped. Good for background-music.
- rewindOnPlay: boolean, default false
    - If true, the mediafile will be rewound to the start when played. Good for action sounds, like a gunshot, if played t times in fast succession, the first playback will be dropped, otherwise the second would be dropped.
- skipTo: integer, default -1
    - it is used to organize sounds into groups.
        - setting skipTo to something larger than your actual index will leave room "below" this sound.
        - example: if you have 4 sounds, there indexes are 0, 1, 2, 3.
        - if you set the second sound's skipTo to 10, the indexes will be 0, 10, 11, 12.
        - this way you can easily group sounds for example to rooms, using the high-byte as room-index and the low-byte as sound-index inside that room.
- volume: float, default 1.0
    - volume is a float between 0.0 and 1.0, where 1.0 is 100% volume, 0.5 is 50% volume and 0.0 is silent.
    - this is sets the default-volume for this sound, it can be changed at any time via the volume api-call.
- fadeMs: integer, default 1000
    - fadeMs controls the fading-time when volume is changed via the volume api-call.
    - a fade form 0 to 1 or 1 to 0 will fade for exactly the given time, fades in between will be linear interpolated.
        - so if fadeMs is set to 1000, fading from 0 to 0.5 will take 500ms, fading from 0.9 to 1 will take 100ms.
        - This ensures a constant change rate in volume.
- name: string, default <basename without extention of the url>
    - there is no functional use for this value, but the playlist-editor has a code-exporter that utilizes the name and provides aconfigurable editor to give you a lookup table like this:

```6502 assembly
wicmex_Gun          = $0000
wicmex_gun2         = $0001
wicmex_technoloop   = $0100
wicmex_technoloop_2 = $0101
wicmex_technoloop_3 = $0102
```

This is what an example playlist could look like:

```json
[
    {
        "url": "https://wsmplaylists.shnbk.de/gun1.mp3",
        "rewindOnPlay": true,
        "name": "Gun"
    },
    {
        "url": "https://wsmplaylists.shnbk.de/gun2.mp3",
        "preload": true
    },
    {
        "url": "https://wsmplaylists.shnbk.de/technoloop.mp3",
        "loop": true,
        "skipTo": 256
    },
    {
        "url": "https://wsmplaylists.shnbk.de/technoloop.mp3",
        "loop": true,
        "rewindOnPlay": true
    },
    {
        "url": "https://wsmplaylists.shnbk.de/technoloop.mp3",
        "loop": true,
        "rewindOnPlay": true,
        "volume": 0.5
    }
]
```

this playlist ist availiable at https://wsmplaylists.shnbk.de/pl.json so you can try it out.

There is a [playlist-checker](/pl-check.html) available, that can validate your playlist and media-files.

There is also a [playlist-editor](/pl-edit.html) available if you don't feel like writing JSON by hand.

## workflow / api call from the WiC64

Every api-call gets you at least a single-byte response code, it's always the first byte of the response.

These codes are used:

- `0x00`: OK, everything went fine
- `0x01`: ERROR: unknown / invalid session
- `0x02`: WARNING: no browser connected
- `0x03`: ERROR: songindex out of range

### register

At first, the C64 needs to register a session.

You do that by calling `/r/<absolute-url-to-the-playlist-file.json but without https://>`

Example: your playlist lives at https://example.com/sound/playlist-awesome.json

Then the C64 needs to call `/r/example.com/sound/playlist-awesome.json`

You'll always get back a `0x00` (OK) status followed by 8 bytes, they are printable ASCII characters, they are your session-id.

The first 4 are doubling as your user's join-code.

you might want to prompt your user to either:

- visit https://mex.wic64.net/ and enter the 4-char join-code
- or visit https://mex.wic64.net/l/<4-char-join-code>, maybe by providing a QR-Code, see "Showing the user a qr-code instead or in addition to the url" below.

#### WARNING

A Sessions is valid for 12 hours after the last activity.
After that the Session will be deleted and all api-calls and website visits will fail as invalid session.
What resets the Session Timeout:

- any api-call from the C64 with the session-id
- a browser connected to a session, even without any user or api connection.

what you can do as a developer to ensure a session lives at least as long as your program runs: periodically call the connection check api, see "connection check" below.

### swaping Playlists

If you want to swap the playlist of an existing session, just call `/P/<your-session-id>/<absolute-url-to-the-playlist-file.json but without https:// as in /r/>`

You'll get back:

- `0x00`: OK, everything went fine
- `0x01`: ERROR: unknown / invalid session

### connection check

You may or may not, at any given time, want to know if a browser is connected to your session.

calling `/c/<your-session-id>` will return:

- `0x00`: OK, everything went fine, and a browser is connected
- `0x01`: ERROR: unknown / invalid session
- `0x02`: WARNING: no browser connected

Depending on your use case this is either totally fine or a deal breaker, do with that what you want.

### Media Control

All Media Control calls are basically the same, expect the initial command character.

All Media Controls uses the song-index, that is a hex representation of the array-index of the song in your playlist (first sound is 00, second is 01, 9th is 08, 10th is 09, 11th is 0A, 12th is 0B).

If you give a 2 byte song-index, bite-order is little-endian, so the first byte is the least significant byte.

That makes the second sound `0100`, the 256th sound `FF00` and the 257th sound `0001`.

#### play

calling `/p/<your-session-id>/<song-index>` will play the song at the given index in your playlist, considering `loop` and `rewindOnPlay` properties.
You'll get back:

- `0x00`: OK, everything went fine
- `0x01`: ERROR: unknown / invalid session
- `0x02`: WARNING: no browser connected
- `0x03`: ERROR: songindex out of range (if you try to play a song-index that doesn't exist in your playlist)

#### pause

calling `/h/<your-session-id>/<song-index>` will pause the song at the given index in your playlist.
You'll get back:

- `0x00`: OK, everything went fine
- `0x01`: ERROR: unknown / invalid session
- `0x02`: WARNING: no browser connected
- `0x03`: ERROR: songindex out of range (if you try to play a song-index that doesn't exist in your playlist)

#### stop

calling `/s/<your-session-id>/<song-index>` will stop (and rewind) the song at the given index in your playlist.
You'll get back:

- `0x00`: OK, everything went fine
- `0x01`: ERROR: unknown / invalid session
- `0x02`: WARNING: no browser connected
- `0x03`: ERROR: songindex out of range (if you try to play a song-index that doesn't exist in your playlist)

##### stop all

stopall is a bit , it's just `/a/<yoursession-id>`, but feel free to call it with any song-index you like, it will be ignored.

as implied, it stops all playing sounds.
You'll get back:

- `0x00`: OK, everything went fine
- `0x01`: ERROR: unknown / invalid session
- `0x02`: WARNING: no browser connected

### Showing the user a qr-code instead or in addition to the url

if you like you can call `/q/<your-session-id>` to get a qrcode that you can show the user so they doesn't have to type in the join-url
You'll get back:

- `0x00`: OK, everything went fine, 256 bytes, that's for times 64 bytes for 4 sprites. oriented like that:

```text
1 2
3 4
```

The sprite is the foreground color, the background is transparent.
this should be displayed on a dark background with a bright color, ideally a white sprite on a black background.
