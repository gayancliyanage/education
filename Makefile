ROOT=$(shell pwd)

PYENV=./pyenv
PTH=${PYENV}/lib/python2.7/site-packages/gae.pth
BIN=${PYENV}/bin
PYTHON=${BIN}/python
PIP=${BIN}/pip
NOSE=${BIN}/nosetests
COVERAGE ?= ${ROOT}/pyenv/bin/coverage
ZIP ?= zip

GAEPATH ?= ${HOME}/google-cloud-sdk/platform/google_appengine/
APPSERVER=dev_appserver.py
APPCFG=appcfg.py

PORT=8080
SRC=${ROOT}/src
PYSRC=$(shell find ${SRC} -name "*.py")

appversion ?= development


.PHONY: help serve setup-dev coverage test submodules submodules-update deploy marketplace.app clean-lib src/lib/mapreduce


help:
	@echo "Usage:"
	@echo ""
	@echo "\tmake serve|serve-fresh|test|coverage|deploy"
	@echo ""
	@echo "Targets:"
	@echo ""
	@echo "serve\t\tRun development server."
	@echo "serve-fresh\tReset datastore and run development server."
	@echo ""
	@echo "test [target=path]\tRun tests."
	@echo "coverage\t\tShow tests coverages."
	@echo ""
	@echo "deploy [appversion=development]\tDeploy app."
	@echo ""
	@echo "marketplace.app\tCreate the Marketplace App manifest packages."
	@echo ""
	@echo ""
	@echo "The following targets are automatically run before running the server"
	@echo "or deploying the app, but they might be usefull before commit changes"
	@echo "or to update the GUI without restarting the dev. server:"
	@echo ""
	@echo "src/static/core\t\tRebuild core GUI."
	@echo "src/static/dashboard\tRebuild dashboard GUI."
	@echo "src/static/lift\t\tRebuild LIFT GUI."
	@echo ""
	@echo ""

.coverage: ${PYSRC}
	# One or more module have been updated.
	# Rebuilding coverage...
	# 
	${COVERAGE} run --source=${SRC}/education runtests.py

coverage: .coverage
	# Showing coverage report...
	# 
	${COVERAGE} report -m

deploy: src/static/dashboard src/static/lift
	# Deploying to App Engine...
	# 
	# Note: you can specify to which version to deploy to using "appversion"
	# variable.
	# 
	# e.g.:
	# 
	#     make deploy appversion=1
	# 
	${APPCFG} --oauth2 update --version=${appversion} ${SRC}

gui/core/app-build: gui/core/app/lib $(shell find gui/core/app)
	cd gui/core/; grunt build
	touch gui/core/app-build

gui/core/app/lib: gui/core/node_modules
	cd gui/core/; bower install
	touch gui/core/app/lib

gui/core/node_modules: gui/core/package.json
	cd gui/core/; npm install
	touch gui/core/node_modules

gui/lift/app/bower_components: gui/lift/node_modules
	cd gui/lift/; bower install
	touch gui/lift/app/bower_components

gui/lift/gae: gui/lift/node_modules gui/lift/app/bower_components gui/lift/Gruntfile.js $(shell find gui/lift/app)
	cd gui/lift/; grunt gae
	touch gui/lift/gae

gui/lift/node_modules: gui/lift/package.json
	cd gui/lift/; npm install
	touch gui/lift/node_modules

gui/studentdashboard/app-build: gui/studentdashboard/node_modules gui/studentdashboard/Gruntfile.js $(shell find gui/studentdashboard/app)
	cd gui/studentdashboard/; ./node_modules/.bin/grunt build
	touch gui/studentdashboard/app-build

gui/studentdashboard/node_modules: gui/studentdashboard/package.json gui/studentdashboard/bower.json
	cd gui/studentdashboard/; npm install
	touch gui/studentdashboard/node_modules

marketplace/dashboard-manifest.zip: marketplace/dashboard.manifest.json marketplace/icons/*
	# Creating zipped manifest for Google Apps Marketplace...
	# 
	cp marketplace/dashboard.manifest.json marketplace/manifest.json 
	cd marketplace/; ${ZIP} dashboard-manifest.zip manifest.json icons/sd_*
	rm marketplace/manifest.json

marketplace.app: marketplace/dashboard-manifest.zip

serve: src/static/dashboard src/static/lift
	# Starting development server...
	# 
	${APPSERVER} --host=0.0.0.0 --port=${PORT} ${SRC}

serve-fresh: src/static/dashboard src/static/lift
	# Resetting datastore...
	# Starting development server...
	# 
	${APPSERVER} --host=0.0.0.0 --port=${PORT} ${SRC} --clear_datastore

submodules:
	# Resetting submodules...
	# 
	git submodule update --init

submodules-update:
	# Updating submodules...
	# 
	git submodule update --init
	git submodule foreach git stash
	cd gui/core; git pull origin master
	cd gui/lift; git pull origin master
	cd gui/studentdashboard; git checkout master; git pull origin master


clean-lib:
	rm -rf ${SRC}/lib/*

src/lib: requirements.txt clean-lib src/lib/mapreduce
	# Updating dependencies...
	# 
	PIP_REQUIRE_VIRTUALENV=false ${PIP} install -r requirements.txt -t ${SRC}/lib
	rm -rf ${SRC}/lib/*.egg-info
	rm -rf ${SRC}/lib/*.dist-info
	touch ${SRC}/lib

src/lib/mapreduce:
	rm -rf ${SRC}/lib/mapreduce
	mkdir tmp/
	cd tmp/; wget https://github.com/GoogleCloudPlatform/appengine-mapreduce/archive/master.zip
	cd tmp; unzip master.zip
	mv tmp/appengine-mapreduce-master/python/src/mapreduce ${SRC}/lib/
	rm -rf tmp/

setup-dev:
	# Setting up python virtual environment...
	# 
	rm -rf ${PYENV}

	# create python virtual environment
	virtualenv ${PYENV}

	# install dependencies for development
	PIP_REQUIRE_VIRTUALENV=false ${PIP} install -r requirements-dev.txt

	# add GAE to path
	echo ${GAEPATH} >> ${PTH}
	echo ${SRC} >> ${PTH}
	echo 'import site; site.addsitedir("'${SRC}/lib'")' >> ${PTH}
	echo "import dev_appserver; dev_appserver.fix_sys_path()" >> ${PTH}

	@echo "A virtual environment has been created in ${PYENV}"
	@echo 'Make sure to run "source '${BIN}'/activate'
	@echo "Make sure you have google app engine installed in ${GAEPATH}"
	@echo "or set GAEPATH to an alternative location."

src/static/core: gui/core/app-build
	# Rebuilding core GUI for production...
	# 
	rm -rf src/static/core
	cp -r gui/core/app-build src/static/core

src/static/dashboard: gui/studentdashboard/app-build
	# Rebuilding dashboard GUI for production...
	# 
	rm -rf src/static/dashboard
	cp -r gui/studentdashboard/app-build src/static/dashboard

src/static/lift: gui/lift/gae
	# Rebuilding LIFT GUI for production...
	# 
	rm -rf src/static/lift
	cp -r gui/lift/gae src/static/lift

test:
	# You can restrict tests to specific test suites with the "target" variable
	# 
	# e.g: 
	#     make test target=./src/tests/core
	# 
	# 
	${PYTHON} runtests.py ${target}
