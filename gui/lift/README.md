lift
===========

Medicine Management

## On a new machine

1. `gem install sass compass`
2. `npm install -g bower grunt-cli`

## Setup

1. `npm install -g grunt-cli`
2. `npm install`
3. `bower install`
3. `grunt server`

## Development

1. `grunt server`
2.  Browser will open and starts serving on http://localhost:9000 (with live reload)

## Test

1. `grunt test`

## To Run the app on serve

1. `grunt build`
2. `cd dist`
3.  `export NODE_ENV=production`
4.  `node server.js` - This will start the server on 0.0.0.0 and port 8888
5. A tool like foreman can be used to keep the server running forever
    


