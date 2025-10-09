module.exports = function (hexNumber) {
    if (typeof hexNumber !== 'string') return null;
    if (hexNumber.length !== 4 && hexNumber.length !== 2) return null;
    if (hexNumber.length === 4) {
        let firstHalf = hexNumber.slice(0, 2);
        let secondHalf = hexNumber.slice(2, 4);
        hexNumber = secondHalf + firstHalf;
    }
    return parseInt(hexNumber, 16);
};
