'use strict'

// Vendored from the abandoned `builtin-status-codes` package (zero-dep leaf).
// In Node this exposes the live status-code map from the core http module; the
// browser build is remapped to lib/status-codes-browser.js via the package.json
// "browser" field.
module.exports = require('http').STATUS_CODES
