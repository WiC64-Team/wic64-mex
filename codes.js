module.exports = {
    ok: { byte: String.fromCharCode(0x00), description: 'OK' },
    unknownSession: {
        byte: String.fromCharCode(0x01),
        description:
            "your 8 byte session id is unknown, either it's plain wrong or its invalid now since it was not used for more than 60 minutes",
    },
    notConnected: {
        byte: String.fromCharCode(0x02),
        description:
            'everything is fine on your end, but there is no browser connected to your session',
    },
    songIndexOutOfRange: {
        byte: String.fromCharCode(0x03),
        description: 'the song index you tried to play is out of range',
    },
    send: function (res, code) {
        res.header('X-Error-Info', code.description);
        res.send(code.byte);
    },
};
