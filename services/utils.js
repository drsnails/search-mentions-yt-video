function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

function mapRange(value, originalMin, originalMax, finalMin, finalMax) {
    return ((value - originalMin) * (finalMax - finalMin)) / (originalMax - originalMin) + finalMin;
}