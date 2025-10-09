let logger = function (s) {
    console.log('[CATCHER] ' + s);
};

module.exports = function (route) {
    return function (...args) {
        try {
            route(...args);
        } catch (e) {
            logger(e);
            let res = args[1];
            res.status(500).send('Internal Server Error');
        }
    };
};
