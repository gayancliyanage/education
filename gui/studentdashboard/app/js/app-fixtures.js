/* jshint bitwise: false*/

(function() {
  'use strict';

  function newFile(fileName, destId, destName, senderName, senderId) {
    senderName = senderName || 'system';
    senderId = senderId || null;

    return {
      'dest': destName,
      'destId': destId,
      'id': 'abcd12345',
      'lastDownloadAt': '',
      'name': fileName,
      'sender': senderName,
      'senderId': senderId,
      'type': 'SHELF',
      'uploadedAt': 'Wed, 02 Apr 2014 21:39:03 -0000',
      'url': '/README.md',
    };
  }

  angular.module('scDashboardMocked.fixtures', []).

  factory('SC_DASHBOARD_FIXTURES', [
    function() {
      var fix = {
        urls: {
          baseLogin: '/api/v1/dashboard/user',
          login: /\/api\/v1\/dashboard\/user\?.*/,
          users: /\/api\/v1\/dashboard\/users/,
          students: '/api/v1/dashboard/students',
          allStudents: '/api/v1/dashboard/students?limit=0',
          oneStudent: /\/api\/v1\/dashboard\/students\/([^\/]+)/,
          studentAttribute: /\/api\/v1\/dashboard\/students\/([^\/]+)\/([^\/]+)/,
          studentFiles: /\/api\/v1\/dashboard\/repository\/([^\/]+)\/files/,
          uploadUrl: /api\/v1\/dashboard\/uploadurl\/repository\/([^\/]+)/,
          upload: /_ah\/upload\/(.*)/,
          oneStudentFile: /\/api\/v1\/dashboard\/repository\/([^\/]+)\/files\/([^\/]+)/,
          pgy: '/api/v1/dashboard/pgy',
          roshReviewTopics: '/api/v1/dashboard/roshreview/topic',
          roshReviewStats: /\/api\/v1\/dashboard\/roshreview\/stats\?.*/,
          oneStudentRoshReviewStats: /\/api\/v1\/dashboard\/roshreview\/stats\/([^\/]+)/,
          firstAidTopics: '/api/v1/dashboard/firstaid/topics',
          firstAidStats: /\/api\/v1\/dashboard\/firstaid\/stats\?.*/,
          oneStudentFirstAidStats: /\/api\/v1\/dashboard\/firstaid\/stats\/([^\/]+)/
        },
        data: {
          user: {
            'domain': 'example.com',
            'isDomainAdmin': true,
            'name': {
              'fullName': 'Bob Smith',
              'givenName': 'Bob',
              'familyName': 'Smith'
            },
            'image': {
              'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
              'isDefault': true
            },
            'primaryEmail': 'bob@example.com',
            'isDelegatedAdmin': false,
            'isAdmin': true,
            'logoutUrl': '/api/logout',
            'isStaff': false,
            'isLoggedIn': true,
            'displayName': 'Bob Smith',
            'loginUrl': '/api/login',
            'id': '12347',
            'orgUnitPath': '/'
          },
          users: {
            'cursor': '',
            'type': 'users',
            'users': [{
              'domain': 'example.com',
              'isDomainAdmin': true,
              'name': {
                'fullName': 'Bob Smith',
                'givenName': 'Bob',
                'familyName': 'Smith'
              },
              'image': {
                'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
                'isDefault': true
              },
              'isDelegatedAdmin': false,
              'isAdmin': true,
              'isStaff': false,
              'displayName': 'Bob Smith',
              'id': '12347',
            }]
          },
          loginError: {
            'isLoggedIn': false,
            'isDomainAdmin': false,
            'isAdmin': false,
            'isStaff': false,
            'loginUrl': '/api/login'
          },
          studentUser: {
            'image': {
              'url': 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
              'isDefault': true
            },
            'studentId': 'A00001',
            'isStaff': false,
            'isAdmin': false,
            'primaryEmail': 'chris@example.com',
            'domain': 'example.com',
            'displayName': 'Chris Boesch',
            'id': '12345',
            'name': {
              'givenName': 'Chris',
              'familyName': 'Boesch'
            },
            'isLoggedIn': true,
            'loginUrl': '/#_login',
            'logoutUrl': '/#_logout'
          },
          students: {
            '12345': {
              'id': '12345',
              'isSetup': true,
              'studentId': 'A9999999',
              'displayName': 'Clark Kent',
              'name': {
                'givenName': 'Clark',
                'familyName': 'Kent'
              },
              'image': {
                'url': 'https://lh6.ggpht.com/cGU1P9w6peye957X8dUv6CfyQIhcdzGM-1OG4cpAtyjgO5X4FKtqDD262BfUeVttnrW9LwL0c0V6NTzPTcwK-BWmMU6M1A'
              },
              'secondaryEmail': 'a9999999@education.duke-nus.edu.sg',
              'year': 2000,
              'isActive': true
            },
            '12346': {
              'id': '12346',
              'isSetup': true,
              'studentId': 'A9999998',
              'displayName': 'Diana Prince',
              'name': {
                'givenName': 'Diana',
                'familyName': 'Prince'
              },
              'image': {
                'url': 'https://lh6.ggpht.com/9I-gNfDRHGEo8tT4CPlHiOjCZPdISuyHbYtqQK2VLGjg6f1dqS45D4trWWhmOU8is05JfiIZmPa6GdMW-QFQ_ZLo0tgTtP4'
              },
              'secondaryEmail': 'a9999998@education.duke-nus.edu.sg',
              'year': 2000,
              'isActive': true
            }
          },
          files: function(dest, count, senderName) {
            var results = [],
              destName = dest.displayName;

            while (count > 0) {
              results.push(
                newFile('File ' + count--, dest.studentId, destName, senderName)
              );
            }

            return results;
          },
          newFile: newFile,
          uploadUrl: {
            'url': '/_ah/upload/some-key'
          },
          portfolio: {},
          pgy: {
            'pgy': [{
              'id': 2000,
              'isActive': true,
              'label': 'Year 2000'
            }]
          },
          roshReviewTopics: {
            'topics': [{
              'id': 'ABDOMINAL AND GI DISORDERS',
              'label': 'Abdominal And Gi Disorders'
            }, {
              'id': 'CARDIOVASCULAR DISORDERS',
              'label': 'Cardiovascular Disorders'
            }, {
              'id': 'CUTANEOUS DISORDERS',
              'label': 'Cutaneous Disorders'
            }, {
              'id': 'ENDOCRINE/METABOLIC DISORDERS',
              'label': 'Endocrine/Metabolic Disorders'
            }, {
              'id': 'ENVIRONMENTAL DISORDERS',
              'label': 'Environmental Disorders'
            }, {
              'id': 'HEENT DISORDERS',
              'label': 'Heent Disorders'
            }, {
              'id': 'HEMATOLOGIC DISORDERS',
              'label': 'Hematologic Disorders'
            }, {
              'id': 'IMMUNE SYSTEM DISORDERS',
              'label': 'Immune System Disorders'
            }, {
              'id': 'MSKL DISORDERS (NONTRAUMATIC)',
              'label': 'Mskl Disorders (Nontraumatic)'
            }, {
              'id': 'NERVOUS SYSTEM DISORDERS',
              'label': 'Nervous System Disorders'
            }, {
              'id': 'OB/GYN DISORDERS',
              'label': 'Ob/Gyn Disorders'
            }, {
              'id': 'OTHER COMPONENTS & CORE COMPETENCIES',
              'label': 'Other Components & Core Competencies'
            }, {
              'id': 'PEDIATRICS',
              'label': 'Pediatrics'
            }, {
              'id': 'PROCEDURES & SKILLS',
              'label': 'Procedures & Skills'
            }, {
              'id': 'PSYCHOSOCIAL DISORDERS',
              'label': 'Psychosocial Disorders'
            }, {
              'id': 'RENAL & UROGENITAL DISORDERS',
              'label': 'Renal & Urogenital Disorders'
            }, {
              'id': 'SIGNS, SYMPTOMS, & PRESENTATIONS',
              'label': 'Signs, Symptoms, & Presentations'
            }, {
              'id': 'SYSTEMIC INFECTIOUS DISORDERS',
              'label': 'Systemic Infectious Disorders'
            }, {
              'id': 'THORACIC-RESPIRATORY DISORDERS',
              'label': 'Thoracic-Respiratory Disorders'
            }, {
              'id': 'TOXICOLOGIC DISORDERS',
              'label': 'Toxicologic Disorders'
            }, {
              'id': 'TRAUMATIC DISORDERS',
              'label': 'Traumatic Disorders'
            }, {
              'id': 'ULTRASOUND',
              'label': 'Ultrasound'
            }],
            'type': 'topics'
          },
          roshReviewStats: {
            'cursor': '',
            'stats': [{
              'studentId': 'A9999998',
              'displayName': 'Diana Prince',
              'percentageComplete': 35,
              'performance': 71.0,
              'year': 2000,
              'trainingLevel': 'Student',
              'id': 'A9999998'
            }, {
              'studentId': 'A9999999',
              'displayName': 'Clark Kent',
              'percentageComplete': 78,
              'performance': 69.0,
              'year': 2000,
              'trainingLevel': 'Student',
              'id': 'A9999999'
            }]
          },
          roshReviewUserStats: function(name, id) {
            return {
              'studentId': id,
              'displayName': name,
              'categoryPerformances': [{
                'performance': 100,
                'id': 'HEENT DISORDERS',
                'label': 'Heent Disorders'
              }, {
                'performance': 99,
                'id': 'IMMUNE SYSTEM DISORDERS',
                'label': 'Immune System Disorders'
              }, {
                'performance': 97,
                'id': 'PSYCHOSOCIAL DISORDERS',
                'label': 'Psychosocial Disorders'
              }, {
                'performance': 97,
                'id': 'SYSTEMIC INFECTIOUS DISORDERS',
                'label': 'Systemic Infectious Disorders'
              }, {
                'performance': 87,
                'id': 'MSKL DISORDERS (NONTRAUMATIC)',
                'label': 'Mskl Disorders (Nontraumatic)'
              }, {
                'performance': 82,
                'id': 'TOXICOLOGIC DISORDERS',
                'label': 'Toxicologic Disorders'
              }, {
                'performance': 78,
                'id': 'OB/GYN DISORDERS',
                'label': 'Ob/Gyn Disorders'
              }, {
                'performance': 77,
                'id': 'ENDOCRINE/METABOLIC DISORDERS',
                'label': 'Endocrine/Metabolic Disorders'
              }, {
                'performance': 69,
                'id': 'ULTRASOUND',
                'label': 'Ultrasound'
              }, {
                'performance': 68,
                'id': 'RENAL & UROGENITAL DISORDERS',
                'label': 'Renal & Urogenital Disorders'
              }, {
                'performance': 58,
                'id': 'ENVIRONMENTAL DISORDERS',
                'label': 'Environmental Disorders'
              }, {
                'performance': 53,
                'id': 'CARDIOVASCULAR DISORDERS',
                'label': 'Cardiovascular Disorders'
              }, {
                'performance': 51,
                'id': 'OTHER COMPONENTS & CORE COMPETENCIES',
                'label': 'Other Components & Core Competencies'
              }, {
                'performance': 51,
                'id': 'TRAUMATIC DISORDERS',
                'label': 'Traumatic Disorders'
              }, {
                'performance': 49,
                'id': 'NERVOUS SYSTEM DISORDERS',
                'label': 'Nervous System Disorders'
              }, {
                'performance': 49,
                'id': 'PEDIATRICS',
                'label': 'Pediatrics'
              }, {
                'performance': 46,
                'id': 'SIGNS, SYMPTOMS, & PRESENTATIONS',
                'label': 'Signs, Symptoms, & Presentations'
              }, {
                'performance': 44,
                'id': 'ABDOMINAL AND GI DISORDERS',
                'label': 'Abdominal And Gi Disorders'
              }],
              'percentageComplete': 78,
              'performance': 69.0,
              'year': 2000,
              'trainingLevel': 'Student',
              'id': 'A9999999'
            };
          },
          firstAidTopics: {
            'topics': [{
              'id': '72',
              'label': 'Allergy (3)'
            }, {
              'id': '11',
              'label': 'Anatomy (1)'
            }, {
              'id': '15',
              'label': 'Behavioral Science (1)'
            }, {
              'id': '17',
              'label': 'Biochemistry (1)'
            }, {
              'id': '1',
              'label': 'Cardiology (1)'
            }, {
              'id': '32',
              'label': 'Cardiovascular (2)'
            }, {
              'id': '55',
              'label': 'Cardiovascular (3)'
            }, {
              'id': '34',
              'label': 'Dermatology (2)'
            }, {
              'id': '71',
              'label': 'Dermatology (3)'
            }, {
              'id': '13',
              'label': 'Embryology (1)'
            }, {
              'id': '56',
              'label': 'Emergency Medicine (3)'
            }, {
              'id': '2',
              'label': 'Endocrine (1)'
            }, {
              'id': '35',
              'label': 'Endocrine (2)'
            }, {
              'id': '57',
              'label': 'Endocrine (3)'
            }, {
              'id': '58',
              'label': 'Epi & Biostatistics (3)'
            }, {
              'id': '16',
              'label': 'Epidemiology (1)'
            }, {
              'id': '36',
              'label': 'Epidemiology and Preventive (2)'
            }, {
              'id': '59',
              'label': 'Ethics & Legal (3)'
            }, {
              'id': '37',
              'label': 'Ethics and Legal (2)'
            }, {
              'id': '25',
              'label': 'Family Medicine (2)'
            }, {
              'id': '48',
              'label': 'Family Medicine (3)'
            }, {
              'id': '3',
              'label': 'Gastrointestinal (1)'
            }, {
              'id': '38',
              'label': 'Gastrointestinal (2)'
            }, {
              'id': '60',
              'label': 'Gastrointestinal (3)'
            }, {
              'id': '18',
              'label': 'Genetics (1)'
            }, {
              'id': '39',
              'label': 'Gynecology (2)'
            }, {
              'id': '61',
              'label': 'Gynecology (3)'
            }, {
              'id': '4',
              'label': 'Hematology (1)'
            }, {
              'id': '62',
              'label': 'Hematology (3)'
            }, {
              'id': '40',
              'label': 'Hematology/Oncology (2)'
            }, {
              'id': '12',
              'label': 'Histology (1)'
            }, {
              'id': '19',
              'label': 'Immunology (1)'
            }, {
              'id': '41',
              'label': 'Infectious Disease (2)'
            }, {
              'id': '63',
              'label': 'Infectious Disease (3)'
            }, {
              'id': '26',
              'label': 'Medicine (2)'
            }, {
              'id': '49',
              'label': 'Medicine (3)'
            }, {
              'id': '24',
              'label': 'Microbiology (1)'
            }, {
              'id': '74',
              'label': 'Multisystem (1)'
            }, {
              'id': '75',
              'label': 'Multisystem (2)'
            }, {
              'id': '76',
              'label': 'Multisystem (3)'
            }, {
              'id': '47',
              'label': 'Musculoskeletal (2)'
            }, {
              'id': '6',
              'label': 'Musculoskeletal (1)'
            }, {
              'id': '64',
              'label': 'Musculoskeletal (3)'
            }, {
              'id': '65',
              'label': 'Nephrology (3)'
            }, {
              'id': '14',
              'label': 'Neuroanatomy (1)'
            }, {
              'id': '42',
              'label': 'Neurology (2)'
            }, {
              'id': '50',
              'label': 'Neurology (3)'
            }, {
              'id': '66',
              'label': 'Neurology (3)'
            }, {
              'id': '7',
              'label': 'Neurology (1)'
            }, {
              'id': '27',
              'label': 'Neurology/Nervous System (2)'
            }, {
              'id': '28',
              'label': 'OB/GYN (2)'
            }, {
              'id': '51',
              'label': 'OB/GYN (3)'
            }, {
              'id': '43',
              'label': 'Obstetrics (2)'
            }, {
              'id': '67',
              'label': 'Obstetrics (3)'
            }, {
              'id': '5',
              'label': 'Oncology (1)'
            }, {
              'id': '68',
              'label': 'Oncology (3)'
            }, {
              'id': '20',
              'label': 'Pathology (1)'
            }, {
              'id': '22',
              'label': 'Pathophysiology (1)'
            }, {
              'id': '29',
              'label': 'Pediatrics (2)'
            }, {
              'id': '52',
              'label': 'Pediatrics (3)'
            }, {
              'id': '23',
              'label': 'Pharmacology (1)'
            }, {
              'id': '21',
              'label': 'Physiology (1)'
            }, {
              'id': '31',
              'label': 'Psychiatry (2)'
            }, {
              'id': '44',
              'label': 'Psychiatry (2)'
            }, {
              'id': '53',
              'label': 'Psychiatry (3)'
            }, {
              'id': '69',
              'label': 'Psychiatry (3)'
            }, {
              'id': '73',
              'label': 'Psychiatry (1)'
            }, {
              'id': '10',
              'label': 'Pulmonary (1)'
            }, {
              'id': '45',
              'label': 'Pulmonary (2)'
            }, {
              'id': '70',
              'label': 'Pulmonary (3)'
            }, {
              'id': '8',
              'label': 'Renal (1)'
            }, {
              'id': '46',
              'label': 'Renal/GU (Male) (2)'
            }, {
              'id': '9',
              'label': 'Reproductive (1)'
            }, {
              'id': '30',
              'label': 'Surgery (2)'
            }, {
              'id': '54',
              'label': 'Surgery (3)'
            }],
            'type': 'topics'
          },
          firstAidStats: {
            'cursor': '',
            'stats': [{
              'studentId': 'A9999999',
              'displayName': 'Clark Kent',
              'correctAnswers': 190,
              'year': 2000,
              'performance': 51,
              'questionTaken': 367,
              'id': 'A9999999'
            }, {
              'studentId': 'A9999998',
              'displayName': 'Diana Prince',
              'correctAnswers': 228,
              'year': 2000,
              'performance': 44,
              'questionTaken': 510,
              'id': 'A9999998'
            }]
          },
          firstAidUserStats: function(name, id) {
            return {
              'studentId': id,
              'displayName': name,
              'categoryPerformances': [{
                'performance': 100,
                'predictive': -187,
                'questionTaken': 6,
                'id': '25',
                'correctAnswers': 6
              }, {
                'performance': 100,
                'predictive': 17,
                'questionTaken': 10,
                'id': '8',
                'correctAnswers': 10
              }, {
                'performance': 100,
                'predictive': 43,
                'questionTaken': 14,
                'id': '39',
                'correctAnswers': 14
              }, {
                'performance': 100,
                'predictive': -272,
                'questionTaken': 4,
                'id': '18',
                'correctAnswers': 4
              }, {
                'performance': 100,
                'predictive': -198,
                'questionTaken': 6,
                'id': '52',
                'correctAnswers': 6
              }, {
                'performance': 90,
                'predictive': -32,
                'questionTaken': 10,
                'id': '13',
                'correctAnswers': 9
              }, {
                'performance': 89,
                'predictive': -119,
                'questionTaken': 19,
                'id': '50',
                'correctAnswers': 17
              }, {
                'performance': 83,
                'predictive': 141,
                'questionTaken': 6,
                'id': '59',
                'correctAnswers': 5
              }, {
                'performance': 75,
                'predictive': -240,
                'questionTaken': 16,
                'id': '71',
                'correctAnswers': 12
              }, {
                'performance': 75,
                'predictive': -128,
                'questionTaken': 4,
                'id': '17',
                'correctAnswers': 3
              }, {
                'performance': 70,
                'predictive': -128,
                'questionTaken': 17,
                'id': '1',
                'correctAnswers': 12
              }, {
                'performance': 70,
                'predictive': -115,
                'questionTaken': 17,
                'id': '37',
                'correctAnswers': 12
              }, {
                'performance': 69,
                'predictive': -113,
                'questionTaken': 13,
                'id': '24',
                'correctAnswers': 9
              }, {
                'performance': 63,
                'predictive': -286,
                'questionTaken': 11,
                'id': '2',
                'correctAnswers': 7
              }, {
                'performance': 50,
                'predictive': 30,
                'questionTaken': 10,
                'id': '65',
                'correctAnswers': 5
              }, {
                'performance': 50,
                'predictive': -223,
                'questionTaken': 6,
                'id': '4',
                'correctAnswers': 3
              }, {
                'performance': 50,
                'predictive': 81,
                'questionTaken': 4,
                'id': '75',
                'correctAnswers': 2
              }, {
                'performance': 50,
                'predictive': -201,
                'questionTaken': 10,
                'id': '73',
                'correctAnswers': 5
              }, {
                'performance': 45,
                'predictive': 190,
                'questionTaken': 11,
                'id': '3',
                'correctAnswers': 5
              }, {
                'performance': 44,
                'predictive': 277,
                'questionTaken': 9,
                'id': '76',
                'correctAnswers': 4
              }, {
                'performance': 42,
                'predictive': 81,
                'questionTaken': 19,
                'id': '16',
                'correctAnswers': 8
              }, {
                'performance': 40,
                'predictive': -54,
                'questionTaken': 5,
                'id': '45',
                'correctAnswers': 2
              }, {
                'performance': 40,
                'predictive': -307,
                'questionTaken': 5,
                'id': '43',
                'correctAnswers': 2
              }, {
                'performance': 38,
                'predictive': 307,
                'questionTaken': 13,
                'id': '23',
                'correctAnswers': 5
              }, {
                'performance': 33,
                'predictive': 34,
                'questionTaken': 9,
                'id': '10',
                'correctAnswers': 3
              }, {
                'performance': 31,
                'predictive': 261,
                'questionTaken': 16,
                'id': '11',
                'correctAnswers': 5
              }, {
                'performance': 28,
                'predictive': -167,
                'questionTaken': 14,
                'id': '38',
                'correctAnswers': 4
              }, {
                'performance': 25,
                'predictive': -141,
                'questionTaken': 16,
                'id': '54',
                'correctAnswers': 4
              }, {
                'performance': 16,
                'predictive': -127,
                'questionTaken': 6,
                'id': '7',
                'correctAnswers': 1
              }, {
                'performance': 16,
                'predictive': -76,
                'questionTaken': 6,
                'id': '32',
                'correctAnswers': 1
              }, {
                'performance': 13,
                'predictive': -294,
                'questionTaken': 15,
                'id': '60',
                'correctAnswers': 2
              }, {
                'performance': 11,
                'predictive': 14,
                'questionTaken': 17,
                'id': '5',
                'correctAnswers': 2
              }, {
                'performance': 8,
                'predictive': -203,
                'questionTaken': 12,
                'id': '53',
                'correctAnswers': 1
              }, {
                'performance': 0,
                'predictive': 238,
                'questionTaken': 6,
                'id': '69',
                'correctAnswers': 0
              }, {
                'performance': 0,
                'predictive': 296,
                'questionTaken': 5,
                'id': '22',
                'correctAnswers': 0
              }],
              'correctAnswers': 190,
              'year': 2000,
              'performance': 51,
              'questionTaken': 367,
              'id': id
            };
          }
        }
      };

      return fix;
    }
  ])

  ;

})();
