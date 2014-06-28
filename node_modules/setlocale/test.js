var addon = require('./build/Release/setlocale');
console.log(addon.setlocale(addon.LC_ALL, 'mattn'));
console.log(addon.setlocale(addon.LC_ALL, 'C'));
console.log(addon.setlocale(addon.LC_ALL, 'en_US.UTF-8'));
console.log(addon.LC_ALL);
console.log(addon.LC_TIME);
