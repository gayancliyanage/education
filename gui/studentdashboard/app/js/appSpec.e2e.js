/* jshint camelcase: false*/
/* global describe, protractor, it, browser, takeScreenShot, element, by, expect */

(function() {
  'use strict';

  var path = require('path'),
    readMe = path.resolve(__dirname, '../../README.md');


  describe('dashboard', function() {

    var ptor = protractor.getInstance(),
      httpBackendMock = function() {
        angular.module('httpBackendMock', ['ngMockE2E', 'scDashboard', 'scDashboardMocked.fixtures'])
          .run(function($httpBackend, SC_DASHBOARD_FIXTURES) {
            var fix = SC_DASHBOARD_FIXTURES,
              students = fix.data.students;

            $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);

            $httpBackend.whenGET(fix.urls.students).respond({
              'students': Object.keys(students).map(function(k) {return students[k];}),
              'cursor': 'E-ABAOsB8gEJZnVsbF9uYW1l-gENGgt0YXlsb3IsIGJvYuwBggInahRkZXZ-c3R1ZGVudGRhc2hib2FyZHIPCxIHU3R1ZGVudCICeDIMFA=='
            });

            $httpBackend.whenGET(fix.urls.studentFiles).respond({
              'files': fix.data.files(students['12346'], 2),
              'cursor': 'E-ABAOsB8gELdXBsb2FkZWRfYXT6AQkI98SWrqPCvQLsAYICOmoUZGV2fnN0dWRlbnRkYXNoYm9hcmRyIgsSBEZpbGUiGDRSYlBuS0xBUFgtb1JfR0xQQUZ3N1E9PQwU'
            });

            $httpBackend.whenPOST(
              fix.urls.uploadUrl).respond(fix.data.uploadUrl
            );

            $httpBackend.whenPOST(fix.urls.upload).respond(
              fix.data.newFile('new file', '12346', fix.data.user.displayName)
            );

            $httpBackend.whenGET(/.*/).passThrough();


          });
      };

    ptor.addMockModule('httpBackendMock', httpBackendMock);

    var RepositoryHomepage = function() {
      this.studentSelector = element(by.css('#selected-student'));

      this.files = function() {
        return element.all(by.css('.file-details'));
      };

      this.studentOptions = function() {
        return this.studentSelector.all(by.tagName('option'));
      };

      this.fileSelect = function() {
        return element(by.css('#file-select'));
      };

      this.fileTypeSelectOptions = function() {
        return element(by.css('#selected-doc-type')).all(by.tagName('option'));
      };

      this.fileName = function() {
        return element(by.css('#file-name'));
      };

      this.uploadButton = function() {
        return element(by.css('#upload-form button[type=submit]'));
      };

      this.get = function() {
        return browser.get('http://0.0.0.0:5557/app-e2e/');
      };

      this.selectStudent = function(index) {
        return this.studentOptions().then(function(options) {
          return options[index].click();
        });
      };

      this.selectFileType = function(index) {
        return this.fileTypeSelectOptions().then(function(options) {
          return options[index].click();
        });
      };

      this.selectFile = function(path) {
        return this.fileSelect().sendKeys(path);
      };

    };

    it('should let an admin select a student repository', function() {
      var page = new RepositoryHomepage();

      page.get();

      expect(page.studentSelector.isPresent()).toBe(true);

      takeScreenShot('home').then(function(){
        return page.studentSelector.click();
      }).then(page.studentOptions.bind(page)).then(function(options) {
        expect(options.length).toBe(3);
        options[1].click();
      }).then(function(){
        takeScreenShot('student-selected');
      }).then(page.files.bind(page)).then(function(files){
        expect(files.length).toBe(2);
      });

    });

    it('should let an admin upload a file', function() {
      var page = new RepositoryHomepage();

      page.get();

      page.selectStudent(1);
      expect(element(by.css('#upload-form')).isDisplayed()).toBe(true);
      page.selectFile(readMe);
      expect(page.fileName().getAttribute('value')).toBe('README.md');
      page.selectFileType(1);
      takeScreenShot('file-selected');

      var button = page.uploadButton();
      expect(page.uploadButton().isDisplayed()).toBe(true);
      button.click();


      page.files().then(function(files) {
        expect(files.length).toBe(3);
        takeScreenShot('file-uploaded');
      });

    });

  });

})();
