/*global describe, beforeEach, it */
'use strict';
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var helpers = require('yeoman-generator').test;
var assert = require('yeoman-assert');
var chai = require('chai');
var expect = chai.expect;
var recursiveReadDir = require('recursive-readdir');

describe('expressjs-api generator', function () {
  var gen, defaultOptions = {
    testing: 'mocha',
    chai: 'expect',
    odms: [ 'mongoose' ],
    auth: true,
    oauth: [],
    socketio: true
  }, dependenciesInstalled = false;

  function copySync(s, d) { fs.writeFileSync(d, fs.readFileSync(s)); }

  function generatorTest(generatorType, name, mockPrompt, callback) {
    gen.run(function () {
      var afGenerator;
      var deps = [path.join('../..', generatorType)];
      afGenerator = helpers.createGenerator('expressjs-api:' + generatorType, deps, [name], {
        skipInstall: true
      });

      helpers.mockPrompt(afGenerator, mockPrompt);
      afGenerator.run(function () {
        callback();
      });
    });
  }

  /**
   * Assert that only an array of files exist at a given path
   *
   * @param  {Array}    expectedFiles - array of files
   * @param  {Function} done          - callback(error{Error})
   * @param  {String}   topLevelPath  - top level path to assert files at (optional)
   * @param  {Array}    skip          - array of paths to skip/ignore (optional)
   *
   */
  function assertOnlyFiles(expectedFiles, done, topLevelPath, skip) {
    topLevelPath = topLevelPath || './';
    skip = skip || ['node_modules'];

    recursiveReadDir(topLevelPath, skip, function(err, actualFiles) {
      if (err) { return done(err); }
      var files = actualFiles.concat();

      expectedFiles.forEach(function(file, i) {
        var index = files.indexOf(path.normalize(file));
        if (index >= 0) {
          files.splice(index, 1);
        }
      });

      if (files.length !== 0) {
        err = new Error('unexpected files found');
        err.expected = expectedFiles.join('\n');
        err.actual = files.join('\n');
        return done(err);
      }

      done();
    });
  }

  /**
   * Exec a command and run test assertion(s) based on command type
   *
   * @param  {String}   cmd      - the command to exec
   * @param  {Object}   self     - context of the test
   * @param  {Function} cb       - callback()
   * @param  {String}   endpoint - endpoint to generate before exec (optional)
   * @param  {Number}   timeout  - timeout for the exec and test (optional)
   *
   */
  function runTest(cmd, self, cb) {
    var args = Array.prototype.slice.call(arguments),
        endpoint = (args[3] && typeof args[3] === 'string') ? args.splice(3, 1)[0] : null,
        timeout = (args[3] && typeof args[3] === 'number') ? args.splice(3, 1)[0] : null;

    self.timeout(timeout || 60000);

    var execFn = function() {
      var cmdCode;
      var cp = exec(cmd, function(error, stdout, stderr) {
        if(cmdCode !== 0) {
          console.error(stdout);
          throw new Error('Error running command: ' + cmd);
        }
        cb();
      });
      cp.on('exit', function (code) {
        cmdCode = code;
      });
    };

    if (endpoint) {
      generatorTest('endpoint', endpoint, {}, execFn);
    } else {
      gen.run(execFn);
    }
  }

  /**
   * Generate an array of files to expect from a set of options
   *
   * @param  {Object} ops - generator options
   * @return {Array}      - array of files
   *
   */
  function genFiles(ops) {
    var mapping = {
      stylesheet: {
        sass: 'scss',
        stylus: 'styl',
        less: 'less',
        css: 'css'
      },
      markup: {
        jade: 'jade',
        html: 'html'
      },
      script: {
        js: 'js'
      }
    },
    files = [];

    /**
     * Generate an array of OAuth files based on type
     *
     * @param  {String} type - type of oauth
     * @return {Array}       - array of files
     *
     */
    var oauthFiles = function(type) {
      return [
        'server/auth/' + type + '/index.js',
        'server/auth/' + type + '/passport.js',
      ];
    };


    var script = mapping.script[ops.script],
        markup = mapping.markup[ops.markup],
        stylesheet = mapping.stylesheet[ops.stylesheet],
        models = ops.models ? ops.models : ops.odms[0];

    /* Core Files */
    files = files.concat(
      'server/.jshintrc',
      'server/.jshintrc-spec',
      'server/app.js',
      'server/index.js',
      'server/routes.js',
      'server/api/thing/index.js',
      'server/api/thing/index.spec.js',
      'server/api/thing/thing.controller.js',
      'server/api/thing/thing.integration.js',
      'server/components/errors/index.js',
      'server/config/local.env.js',
      'server/config/local.env.sample.js',
      'server/config/express.js',
      'server/config/environment/index.js',
      'server/config/environment/development.js',
      'server/config/environment/production.js',
      'server/config/environment/test.js',
      'server/config/environment/shared.js',
      '.buildignore',
      '.editorconfig',
      '.gitattributes',
      '.gitignore',
      '.travis.yml',
      '.jscsrc',
      '.yo-rc.json',
      'Gruntfile.js',
      'package.json',
      'mocha.conf.js',
      'README.md'
    ]);

    /* Models - Mongoose or Sequelize */
    if (models) {
      files = files.concat([
        'server/api/thing/thing.model.js',
        'server/api/thing/thing.events.js',
        'server/config/seed.js'
      ]);
    }

    /* Sequelize */
    if (ops.odms.indexOf('sequelize') !== -1) {
      files = files.concat([
        'server/sqldb/index.js'
      ]);
    }

    /* Authentication */
    if (ops.auth) {
      files = files.concat([
        'server/api/user/index.js',
        'server/api/user/index.spec.js',
        'server/api/user/user.controller.js',
        'server/api/user/user.integration.js',
        'server/api/user/user.model.js',
        'server/api/user/user.model.spec.js',
        'server/api/user/user.events.js',
        'server/auth/index.js',
        'server/auth/auth.service.js',
        'server/auth/local/index.js',
        'server/auth/local/passport.js',
      ]);
    }

    if (ops.oauth && ops.oauth.length) {
      /* OAuth (see oauthFiles function above) */
      ops.oauth.forEach(function(type, i) {
        files = files.concat(oauthFiles(type.replace('Auth', '')));
      });
    }

    /* Socket.IO */
    if (ops.socketio) {
      files = files.concat([
        'server/api/thing/thing.socket.js',
        'server/config/socketio.js'
      ]);
    }

    return files;
  }


  /**
   * Generator tests
   */

  beforeEach(function (done) {
    this.timeout(10000);
    var deps = [
      '../../endpoint',
    ];

    helpers.testDirectory(path.join(__dirname, 'temp'), function (err) {
      if (err) {
        return done(err);
      }

      gen = helpers.createGenerator('expressjs-api:app', deps, [], {
        skipInstall: true
      });
      done();
    }.bind(this));
  });

  describe('making sure test fixtures are present', function() {

    it('should have package.json in fixtures', function() {
      assert.file([
        path.join(__dirname, 'fixtures', 'package.json')
      ]);
    });

    it('should have all npm packages in fixtures/node_modules', function() {
      var packageJson = require('./fixtures/package.json');
      var deps = Object.keys(packageJson.dependencies);
      deps = deps.concat(Object.keys(packageJson.devDependencies));
      deps = deps.map(function(dep) {
        return path.join(__dirname, 'fixtures', 'node_modules', dep);
      });
      assert.file(deps);
    });

  });

  describe('running app', function() {

    beforeEach(function() {
      this.timeout(20000);
      fs.symlinkSync(__dirname + '/fixtures/node_modules', __dirname + '/temp/node_modules');
    });

    describe('with default options', function() {
      beforeEach(function() {
        helpers.mockPrompt(gen, defaultOptions);
      });

      it('should pass jscs', function(done) {
        runTest('grunt jscs', this, done);
      });

      it('should pass lint', function(done) {
        runTest('grunt jshint', this, done);
      });

      it('should run server tests successfully', function(done) {
        runTest('grunt test:server', this, done);
      });

      it('should pass jscs with generated endpoint', function(done) {
        runTest('grunt jscs', this, done, 'foo');
      });

      it('should pass lint with generated endpoint', function(done) {
        runTest('grunt jshint', this, done, 'foo');
      });

      it('should run server tests successfully with generated endpoint', function(done) {
        runTest('grunt test:server', this, done, 'foo');
      });

      it('should pass lint with generated capitalized endpoint', function(done) {
        runTest('grunt jshint', this, done, 'Foo');
      });

      it('should run server tests successfully with generated capitalized endpoint', function(done) {
        runTest('grunt test:server', this, done, 'Foo');
      });

      it('should pass lint with generated path name endpoint', function(done) {
        runTest('grunt jshint', this, done, 'foo/bar');
      });

      it('should run server tests successfully with generated path name endpoint', function(done) {
        runTest('grunt test:server', this, done, 'foo/bar');
      });

      it('should generate expected files with path name endpoint', function(done) {
        runTest('(exit 0)', this, function() {
          assert.file([
            'server/api/foo/bar/index.js',
            'server/api/foo/bar/index.spec.js',
            'server/api/foo/bar/bar.controller.js',
            'server/api/foo/bar/bar.events.js',
            'server/api/foo/bar/bar.integration.js',
            'server/api/foo/bar/bar.model.js',
            'server/api/foo/bar/bar.socket.js'
          ]);
          done();
        }, 'foo/bar');
      });

      it('should use existing config if available', function(done) {
        this.timeout(60000);
        copySync(__dirname + '/fixtures/.yo-rc.json', __dirname + '/temp/.yo-rc.json');
        var gen = helpers.createGenerator('expressjs-api:app', [
          '../../endpoint',
        ], [], {
          skipInstall: true
        });
        helpers.mockPrompt(gen, {
          skipConfig: true
        });
        gen.run(function () {
          assert.file([
            'server/auth/google/passport.js'
          ]);
          done();
        });
      });

      it('should generate expected files', function (done) {
        gen.run(function () {
          assert.file(genFiles(defaultOptions));
          done();
        });
      });

      it('should not generate unexpected files', function (done) {
        gen.run(function () {
          assertOnlyFiles(genFiles(defaultOptions), done);
        });
      });
    });

    describe('with other preprocessors and oauth', function() {
      var testOptions = {
        testing: 'jasmine',
        odms: [ 'mongoose' ],
        auth: true,
        oauth: ['twitterAuth', 'facebookAuth', 'googleAuth'],
        socketio: true,
      };

      beforeEach(function() {
        helpers.mockPrompt(gen, testOptions);
      });

      it('should pass jscs', function(done) {
        runTest('grunt jscs', this, done);
      });

      it('should pass lint', function(done) {
        runTest('grunt jshint', this, done);
      });

      it('should run server tests successfully', function(done) {
        runTest('grunt test:server', this, done);
      });

      it('should pass jscs with generated endpoint', function(done) {
        runTest('grunt jscs', this, done, 'foo');
      });

      it('should pass lint with generated snake-case endpoint', function(done) {
        runTest('grunt jshint', this, done, 'foo-bar');
      });

      it('should run server tests successfully with generated snake-case endpoint', function(done) {
        runTest('grunt test:server', this, done, 'foo-bar');
      });

      it('should generate expected files', function (done) {
        gen.run(function () {
          assert.file(genFiles(testOptions));
          done();
        });
      });

      it('should not generate unexpected files', function (done) {
        gen.run(function () {
          assertOnlyFiles(genFiles(testOptions), done);
        });
      });

    });

    describe('with sequelize models, auth', function() {
      var testOptions = {
        testing: 'jasmine',
        odms: [ 'sequelize' ],
        auth: true,
        oauth: ['twitterAuth', 'facebookAuth', 'googleAuth'],
        socketio: true,
      };

      beforeEach(function() {
        helpers.mockPrompt(gen, testOptions);
      });

      it('should pass jscs', function(done) {
        runTest('grunt jscs', this, done);
      });

      it('should pass lint', function(done) {
        runTest('grunt jshint', this, done);
      });

      it('should run server tests successfully', function(done) {
        runTest('grunt test:server', this, done);
      });

      it('should pass jscs with generated endpoint', function(done) {
        runTest('grunt jscs', this, done, 'foo');
      });

      it('should pass lint with generated snake-case endpoint', function(done) {
        runTest('grunt jshint', this, done, 'foo-bar');
      });

      it('should run server tests successfully with generated snake-case endpoint', function(done) {
        runTest('grunt test:server', this, done, 'foo-bar');
      });

      it('should generate expected files', function (done) {
        gen.run(function () {
          assert.file(genFiles(testOptions));
          done();
        });
      });

      it('should not generate unexpected files', function (done) {
        gen.run(function () {
          assertOnlyFiles(genFiles(testOptions), done);
        });
      });

    });

    describe('with other preprocessors and no server options', function() {
      var testOptions = {
        testing: 'mocha',
        chai: 'should',
        odms: [],
        auth: false,
        oauth: [],
        socketio: false,
      };

      beforeEach(function(done) {
        helpers.mockPrompt(gen, testOptions);
        done();
      });

      it('should pass jscs', function(done) {
        runTest('grunt jscs', this, done);
      });

      it('should pass lint', function(done) {
        runTest('grunt jshint', this, done);
      });

      it('should run server tests successfully', function(done) {
        runTest('grunt test:server', this, done);
      });

      it('should pass jscs with generated endpoint', function(done) {
        runTest('grunt jscs', this, done, 'foo');
      });

      it('should pass lint with generated endpoint', function(done) {
        runTest('grunt jshint', this, done, 'foo');
      });

      it('should run server tests successfully with generated endpoint', function(done) {
        runTest('grunt test:server', this, done, 'foo');
      });

      it('should generate expected files', function (done) {
        gen.run(function () {
          assert.file(genFiles(testOptions));
          done();
        });
      });

      it('should not generate unexpected files', function (done) {
        gen.run(function () {
          assertOnlyFiles(genFiles(testOptions), done);
        });
      });
    });
  });
});
