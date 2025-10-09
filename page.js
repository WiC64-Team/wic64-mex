const mdit = require('markdown-it')();

let pages = { dev: null };

module.exports = function (req, res) {
    let page = req.params.pagename;
    if (!(page in pages)) {
        res.status(404).send('404 Not Found');
        return;
    }
    if (pages[page] === null) {
        const fs = require('node:fs');
        pages[page] = '<link rel="stylesheet" href="/doc-style.css"/>';
        pages[page] += mdit.render(
            fs.readFileSync('./pages/' + page + '.md', {
                encoding: 'utf8',
                flag: 'r',
            })
        );
    }
    res.send(pages[page]);
};
