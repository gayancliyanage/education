'use strict';

function middleware() {
  return function(connect, options) {
    var middlewares = [];
    var directory = options.directory || options.base[options.base.length - 1];
    if (!Array.isArray(options.base)) {
      options.base = [options.base];
    }

    options.base.forEach(function(base) {
      // Serve static files.
      middlewares.push(connect.static(base));
    });

    // Make directory browse-able.
    middlewares.push(connect.directory(directory));


    return middlewares;
  };
}

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    clean: {
      build: {
        files: [{
          dot: true,
          src: [
            'app-build',
          ]
        }]
      },
      dist: {
        files: [{
          dot: true,
          src: [
            'app-dist',
          ]
        }]
      },
      e2e: {
        files: [{
          dot: true,
          src: [
            'app-e2e',
          ]
        }]
      },
    },

    concat: {},

    connect: {
      options: {
        hostname: '0.0.0.0',
        base: './'
      },
      devserver: {
        options: {
          port: 8888,
          middleware: middleware()
        }
      },
      screenshots: {
        options: {
          port: 5556,
          base: './screenshots/',
          keepalive: true
        }
      },
      e2e: {
        options: {
          port: 5557,
          middleware: middleware()
        }
      }
    },

    copy: {
      build: {
        files: [{
          expand: true,
          dot: true,
          cwd: 'app',
          dest: 'app-build',
          src: [
            '**/*',
            '!lib/',
            '!lib/**/*',
            '!js/',
            '!components/**/*',
            '!js/**/*',
            '!css/',
            '!css/**/*',
            '!views/**/*',
          ]
        }, {
          expand: true,
          cwd: 'app/lib/bootstrap/dist',
          dest: 'app-build',
          src: [
            'fonts/*'
          ]
        }, {
          expand: true,
          cwd: 'app/lib/angular-file-upload/dist',
          dest: 'app-build/js',
          src: [
            'FileAPI.*'
          ]
        }]
      },
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: 'app-build',
          dest: 'app-dist',
          src: [
            '**/*',
            '!js/**/*',
            '!components/**/*',
            '!css/**/*',
            '!*.html',
            '!views/**/*.html'
          ]
        }, {
          expand: true,
          cwd: 'app/lib/angular-file-upload/dist',
          dest: 'app-dist/js',
          src: [
            'FileAPI.*'
          ]
        }]
      },
      e2e: {
        files: [{
          expand: true,
          dot: true,
          cwd: 'app',
          dest: 'app-e2e',
          src: [
            '**/*'
          ]
        }]
      }
    },

    cssmin: {
      dist: {
        expand: true,
        cwd: 'app-build/css/',
        src: ['*.css', '!*.min.css'],
        dest: 'app-dist/css/'
      }
    },

    html2js: {
      options: {
        base: 'app/',
        module: 'scCoreEducation.templates'
      },
      build: {
        src: ['app/views/**/*.html'],
        dest: 'app-build/js/app-templates.js'
      },
    },

    htmlmin: {
      dist: {
        files: [{
          expand: true,
          cwd: 'app-build',
          src: ['*.html'],
          dest: 'app-dist'
        }]
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc',
      },
      all: [
        'Gruntfile.js',
        'app/js/**/*.js',
        'app/components/**/*.js'
      ]
    },

    karma: {
      unit: {
        configFile: 'config/karma.conf.js',
        singleRun: true
      },
      autoUnit: {
        configFile: 'config/karma.conf.js',
        autoWatch: true,
        singleRun: false
      }
    },

    protractor: {
      options: {
        configFile: 'config/e2e.conf.js',
        keepAlive: true,
        noColor: false,
      },
      dev: {
        options: {
          args: {
            specs: ['app-e2e/js/appSpec.e2e.js']
          }
        }
      },
    },

    rev: {
      dist: {
        files: {
          src: [
            'app-dist/js/**/*.js',
            'app-dist/css/**/*.css',
            'app-dist/fonts/*'
          ]
        }
      }
    },

    shell: {
      options: {
        stdout: true,
        stderr: true
      },
      'npm_install': {
        command: 'npm install'
      },
      'npm_post_install': {
        command: [
          './node_modules/.bin/bower install',
          './node_modules/.bin/webdriver-manager update'
        ].join(';')
      }
    },

    targethtml: {
      build: {
        files: {
          'app-build/index.html': 'app-build/index.html'
        }
      },
      e2e: {
        files: {
          'app-e2e/index.html': 'app-e2e/index.html'
        }
      }
    },

    uglify: {
      dist: {
        expand: true,
        cwd: 'app-build/js/',
        src: ['*.js', '!*.min.js'],
        dest: 'app-dist/js/'
      }
    },

    useminPrepare: {
      html: 'app/index.html',
      options: {
        dest: 'app-build',
        flow: {
          html: {
            steps: {
              'js': ['concat'],
              'css': ['concat']
            },
            post: {}
          }
        }
      }
    },

    usemin: {
      html: ['app-build/**/*.html', 'app-dist/**/*.html'],
      css: ['app-build/css/**/*.css', 'app-dist/css/**/*.css'],
    },

    watch: {
      app: {
        files: [
          'app/**/*',
          '!app/lib/**/*'
        ],
        tasks: ['build']
      },
      e2e: {
        files: [
          'app/**/*',
          '!app/lib/**/*'
        ],
        tasks: ['protractor:build']
      }
    },

  });

  grunt.registerTask('build:assets', [
    'jshint',
    'clean:build',
    'useminPrepare',
    'concat',
    'html2js:build',
    'copy:build',
    'targethtml:build'
  ]);
  grunt.registerTask('build', ['build:assets', 'usemin']);

  grunt.registerTask('dist', [
    'build:assets',
    'clean:dist',
    'copy:dist',
    'htmlmin',
    'cssmin',
    'uglify',
    'rev',
    'usemin'
  ]);

  grunt.registerTask('test', ['jshint', 'karma:unit']);

  grunt.registerTask('autotest', ['jshint', 'karma:autoUnit']);
  grunt.registerTask('autotest:e2e', [
    'build',
    'copy:e2e',
    'targethtml:e2e',
    'connect:e2e',
    'protractor:dev',
    'watch:e2e'
  ]);

  grunt.registerTask(
    'server:dev', ['connect:devserver']
  );

  grunt.registerTask('dev', ['build', 'server:dev', 'watch:app']);

  grunt.registerTask('default', ['test', 'build', 'server:dev']);

};