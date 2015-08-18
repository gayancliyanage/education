# studentdashboard

## Setup


Clone your fork of https://github.com/ChrisBoesch/studentdashboard:
```
git clone git@github.com:your-gihub-user-name/studentdashboard.git
cd studentdashboard
git remote add upstream git@github.com:SingaporeClouds/studentdashboard.git
```

Then install dependencies:
```
grunt install -g grunt-cli
npm install
```

## Development

To run the development server:
```
grunt dev
```

To run the unit tests automaticaly:
```
grunt autotest
```

To run the e2e tests and update the screenshots:
```
grunt autotest:e2e
```
