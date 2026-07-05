// Load native addon; if it fails to build/load, export a stub (available:false).
let addon
try {
  addon = require('./build/Release/day3spout.node')
} catch (e) {
  addon = {
    open: () => false,
    sendHandle: () => false,
    close: () => {},
    available: () => false
  }
}
module.exports = addon
