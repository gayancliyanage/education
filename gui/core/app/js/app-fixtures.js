/* jshint bitwise: false*/

(function() {
  'use strict';

  angular.module('scCoreEducationMocked.fixtures', []).

  constant('SC_CORE_EDUCATION_FIXTURES', {
    urls: {
      login: /\/api\/v1\/user($|\?.+)/,
      users: '/api/v1/users',
      oneUser: /api\/v1\/users\/(.+)$/,
      students: '/api/v1/students',
      oneStudent: /api\/v1\/students\/(A\d+)$/i,
      oneStudentName: /api\/v1\/students\/(A\d+)\/name$/i,
      newStudentUploadUrl: '/api/v1/students/_uploadurl',
      pgy: '/api/v1/pgy',
      onePgy: /api\/v1\/pgy\/(\d+)$/,
      staff: '/api/v1/staff',
      newStaff: /\/api\/v1\/staff\/(\d+)/,
      newAdmin: /\/api\/v1\/admin\/(\d+)/
    },
    data: {
      user: {
        'image': {
          'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
          'isDefault': true
        },
        'emails': [{
          'type': 'account',
          'value': 'damien@example.com'
        }],
        'hasCredentials': true,
        'isStudent': true,
        'studentId': 'A0123',
        'verified': false,
        'isLoggedIn': true,
        'domain': 'example.com',
        'id': '12345',
        'loginUrl': '/api/login',
        'logoutUrl': '/_ah/login?continue=http%3A//localhost%3A8080/dashboard/&action=logout',
        'displayName': 'Damien Lebrun',
        'isStaff': true,
        'isAdmin': true,
        'isDomainAdmin': false,
        'name': {
          'givenName': 'Damien',
          'familyName': 'Lebrun'
        }
      },
      loginError: {
        'hasCredentials': false,
        'isStudent': false,
        'isLoggedIn': false,
        'isDomainAdmin': false,
        'isAdmin': false,
        'isStaff': false,
        'loginUrl': '/api/login'
      },
      userList: {
        '12345': {
          'image': {
            'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
            'isDefault': true
          },
          'verified': false,
          'isStudent': true,
          'studentId': 'A0124',
          'isStaff': true,
          'isAdmin': true,
          'domain': 'chrisboesch.com',
          'displayName': 'Chris Boesch',
          'id': '12345',
          'name': {
            'givenName': 'Chris',
            'familyName': 'Boesch'
          }
        },
        '12346': {
          'image': {
            'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
            'isDefault': true
          },
          'verified': false,
          'isStudent': true,
          'studentId': 'A0123',
          'isStaff': false,
          'isAdmin': true,
          'domain': 'chrisboesch.com',
          'displayName': 'Damien Lebrun',
          'id': '12346',
          'name': {
            'givenName': 'Damien',
            'familyName': 'Lebrun'
          }
        },
        '12347': {
          'image': {
            'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
            'isDefault': true
          },
          'verified': false,
          'isGuest': true,
          'isStudent': false,
          'isStaff': false,
          'isAdmin': false,
          'domain': null,
          'displayName': 'Bob Smith',
          'id': '12347',
          'name': {
            'givenName': 'Bob',
            'familyName': 'Smith'
          }
        },
      },

      studentList: {
        'A0123': {
          'studentId': 'A0123',
          'displayName': 'Damien Lebrun',
          'name': {
            'givenName': 'Damien',
            'familyName': 'Lebrun'
          },
          'year': 2015,
          'secondaryEmail': 'a0123@nus.edu.sg',
        },
        'A0124': {
          'studentId': 'A0124',
          'displayName': 'Chris Boesch',
          'name': {
            'givenName': 'Chris',
            'familyName': 'Boesch'
          },
          'year': 2015,
          'secondaryEmail': 'a0124@nus.edu.sg',
        },
        'A0125': {
          'studentId': 'A0125',
          'displayName': 'Jon Doe',
          'name': {
            'givenName': 'Jon',
            'familyName': 'Doe'
          },
          'year': 2015,
          'secondaryEmail': 'a0125@nus.edu.sg',
        }
      }
    }
  })

  ;

})();
