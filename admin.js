const admin_pass = process.env.ADMIN_PASS || null;

let startupTime = Date.now();

module.exports = async function (req, res) {
    if (!admin_pass) {
        res.status(403).send('Forbidden, no one allowed here');
    }
    if (req.query.pass !== admin_pass) {
        res.status(403).send('Forbidden, you are not allowed here');
        return;
    }
    if (req.params.action === 'restart') {
        res.send('Server is restarting...');
        console.log('Admin: Restarting server...');
        process.exit(0);
    } else if (req.params.action === 'status') {
        let uptime = Date.now() - startupTime;
        res.send(
            `Server is running. Uptime: ${Math.floor(uptime / 1000)} seconds.`
        );
    } else {
        res.status(400).send('Unknown action');
    }
};
