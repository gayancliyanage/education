'use strict';

var express = require('express');

/**
 * Main application file
 */

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Application Config
var config = require('./lib/config/config');

var app = express();

// Express settings
require('./lib/config/express')(app);

// Routing
require('./lib/routes')(app);

app.set("domain", config.host);
// Start server
app.listen(config.port, config.host, function () {
  console.log('Express server listening on port %d(%s)in %s mode', config.port,config.host, app.get('env'));
});

// Expose app
exports = module.exports = app;