const mdit = require('markdown-it')();

let pages = {
    dev: { style: 'dev', content: null },
    what: { style: 'user', content: null },
};

module.exports = function (req, res) {
    let page = req.params.pagename;
    if (!(page in pages)) {
        res.status(404).send('404 Page Not Found');
        return;
    }
    if (pages[page].content === null) {
        const fs = require('node:fs');
        pages[page].content =
            "<body class='markdown-body " + pages[page].style + "'>";
        if (pages[page].style === 'dev') {
            pages[page].content +=
                '<link rel="stylesheet" href="/doc-style.css"/>';
        }
        if (pages[page].style === 'user') {
            pages[page].content +=
                '<link rel="stylesheet" href="/style.css"/><header></header>';
        }
        pages[page].content += mdit.render(
            fs.readFileSync('./pages/' + page + '.md', {
                encoding: 'utf8',
                flag: 'r',
            })
        );
        pages[page].content += '</body>';
    }
    res.send(pages[page].content);
};
