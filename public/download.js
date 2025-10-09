// eslint-disable-next-line no-unused-vars
function download(filename, text, minetype) {
    if (minetype === undefined) {
        minetype = 'text/plain;charset=utf-8';
    }
    var element = document.createElement('a');
    element.setAttribute(
        'href',
        'data:' + minetype + ',' + encodeURIComponent(text)
    );
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
