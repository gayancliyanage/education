# core-education

Common education components:

- login service and directives.

TODO: add a notification service.


## usage

Install with bower
```
bower install git@github.com:ChrisBoesch/core-education.git --save
```

Add the script and its dependencies to your page:
```
<script src="path/to/bower_components/jquery/dist/jquery.js"></script>
<script src="path/to/bower_components/lodash/dist/lodash.js"></script>
<script src="path/to/bower_components/angular/angular.js"></script>
<script src="path/to/bower_components/angular-route/angular-route.js"></script>
<script src="path/to/bower_components/restangular/dist/restangular.js"></script>
<script src="path/to/bower_components/core-education/app-build/js/app.js"></script>

<!-- Add template module if you need to use the directive of controller -->
<script src="path/to/bower_components/core-education/app-build/js/app-templates.js"></script>
```

### User api

#### scceUserOptions

`scceUserOptions` define the app name to be used for the `X-App-Name` header.

The authentication endpoint will save and retrieve authentication info in
session named after that "app name".

```
angular.module('myApp', ['scceUser.services']).

config(function(scceUserOptionsProvider) {
  scceUserOptionsProvider.setAppName('dashboard');
});

```


#### scceCurrentUserApi

Module: `scceUser.services`

`scceCurrentUserApi.auth` returns a promise that resolves to an object
with either a logoutUrl or loginUrl properties depending if the user
is logged in or not.

It also returns [additional info](http://development.nextucloud.appspot.com/swagger/#!/user/isloggedIn_get_0)
if the user is logged in.

```
(function() {
  'use strict';

  angular.module('myApp', ['scceUser.services']).

  controller('MyCtrl', function($scope, scceCurrentUserApi) {
    $scope.user = scceCurrentUserApi;
    // $scope.user.info == null (no info available)
    scceCurrentUserApi.auth().then(function(user){
      // log in/out infos are available.
      // $scope.user.info === user
      if (user.name) {
        return queryMoreService();
      } else {
        alert('logging 1st please')
      }
    });
  });

})();
```

#### scceUserLogin

Module: `scceUser.directives`

`scceUserLogin` Directive creating a login info link for a boostrap navbar.

```
<header class="navbar navbar-default navbar-fixed-top" role="navigation">
  <div class="container-fluid">
    <div class="navbar-header">
      <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#main-nav">
      <span class="sr-only">Toggle navigation</span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
      </button>
      <a class="navbar-brand" href="">My App</a>
    </div>
    <div class="navbar-collapse collapse" id="main-nav">
      <ul class="nav navbar-nav">
        <li ng-class="{active: isActive('/link1')}">
          <a ng-href="#/link1">Link 1</a>
        </li>
      </ul>
      <scce-user-login></scce-user-login>
    </div>
  </div>
</header>
```

### SVG helpers

#### scceSvgContainer

Module: `scceSvg.directives`

`scceSvgContainer` set the a SVG element `viewBox` attribute and keep it
responsive.

```
[...]
  $scope.layout = {width: 200, height: 100, margin: {top: 10, left: 20}};
[...]

  <scce-svg-container scce-viewbox="layout">
   <svg><text>Hello</text></svg>
  </scce-svg-container>
```


## Development

### setup

Fork [Upstream](https://github.com/ChrisBoesch/core-education) and clone it:
```
git clone git@github.com:you-user-name/core-education.git
cd core-education/
git remote add upstream git@github.com:ChrisBoesch/core-education.git
```

install dependencies
```
npm install -g grunt-cli
npm install
```


### build

To run the development server:
```
grunt dev
```

To run the tests continously:
```
grunt autotest
```
