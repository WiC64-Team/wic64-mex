const connect_code = document.getElementById('connect_code');
const connect_button = document.getElementById('connect_button');

function sub() {
    let code = connect_code.value.trim();
    code = code.toUpperCase();
    if (code.length !== 4) {
        alert('Please enter a 4 characters long connection code.');
    } else {
        window.location.href = `/l/${code}`;
    }
}

connect_code.addEventListener('keydown', function (event) {
    this.value = this.value.toUpperCase();
    window.setTimeout(function () {
        connect_code.value = connect_code.value.toUpperCase();
    }, 1);
    if (event.key === 'Enter') {
        sub();
    }
});

connect_button.addEventListener('click', sub);
let error = new URLSearchParams(window.location.search).get('error');
const possibleErrors = {
    unknownSession:
        "This code was invalid. Please check it's correct and try again.",
};
if (error && possibleErrors[error]) {
    document.getElementById('errors').innerText = possibleErrors[error];
}
