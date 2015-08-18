/* global browser */

var fs = require('fs');

// An example configuration file.
exports.config = {
  // Do not start a Selenium Standalone sever - only run this using chrome.
  chromeOnly: true,
  chromeDriver: '../node_modules/protractor/selenium/chromedriver',

  // Capabilities to be passed to the webdriver instance.
  capabilities: {
    'browserName': 'chrome'
  },

  // Options to be passed to Jasmine-node.
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000
  },

  onPrepare: function() {
    'use strict';

    var tss = function(name, res) {
      var path = './screenshots/' + name +
        '-' + res.width + 'x' + res.height +
        '.png';

      return browser.driver.manage().window().setSize(res.width, res.height).then(function() {
        return browser.takeScreenshot();
      }).then(function(png) {
        var stream = fs.createWriteStream(path);

        stream.write(new Buffer(png, 'base64'));
        stream.end();

        return png;
      });
    };

    global.takeScreenShot = function(name) {
      var resolutions = [{
        width: 1024,
        height: 768
      }, {
        width: 320,
        height: 568
      }];

      return resolutions.reduce(function(promise, res) {
        if (!promise.then) {
          promise = tss(name, promise);
        }
        return promise.then(function(){
          return tss(name, res);
        });
      });
    };
  }
};