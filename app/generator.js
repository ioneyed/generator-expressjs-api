'use strict';

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {Base} from 'yeoman-generator';
import {genBase} from '../generator-base';

export default class Generator extends Base {

  constructor(...args) {
    super(...args);

    this.argument('name', { type: String, required: false });

    this.option('skip-install', {
      desc: 'Do not install dependencies',
      type: Boolean,
      defaults: false
    });

    this.option('app-suffix', {
      desc: 'Allow a custom suffix to be added to the module name',
      type: String,
      defaults: 'App'
    });
  }

  get initializing() {
    return {

      init: function () {
        this.config.set('generatorVersion', this.rootGeneratorVersion());
        this.filters = {};

        // init shared generator properies and methods
        genBase(this);
      },

      info: function () {
        this.log(chalk.red(`
################################################################
# NOTE: You are using a pre-release version of
# generator-express-api. For a more stable version, run
# \`npm install -g generator-express-api@^1.0.0\`
################################################################`));
        this.log('You\'re using the ExpressJS Api Generator, version ' + this.rootGeneratorVersion());
        this.log(this.yoWelcome);
        this.log('Out of the box I create an Express server for creating WebServices (Api\'s).\n');
      },

      checkForConfig: function() {
        var cb = this.async();
        var existingFilters = this.config.get('filters');

        if(existingFilters) {
          this.prompt([{
            type: 'confirm',
            name: 'skipConfig',
            message: 'Existing .yo-rc configuration found, would you like to use it?',
            default: true,
          }], function (answers) {
            this.skipConfig = answers.skipConfig;

            if (this.skipConfig) {
              this.filters = existingFilters;
            } else {
              this.filters = {};
              this.forceConfig = true;
              this.config.set('filters', this.filters);
              this.config.forceSave();
            }

            cb();
          }.bind(this));
        } else {
          cb();
        }
      }

    };
  }

  get prompting() {
    return {
      serverPrompts: function() {
        if(this.skipConfig) return;
        var cb = this.async();
        var self = this;
        this.log('\n# Server\n');

        this.prompt([{
          type: 'checkbox',
          name: 'odms',
          message: 'What would you like to use for data modeling?',
          choices: [
            {
              value: 'mongoose',
              name: 'Mongoose (MongoDB)',
              checked: true
            },
            {
              value: 'sequelize',
              name: 'Sequelize (MySQL, SQLite, MariaDB, PostgreSQL)',
              checked: false
            }
          ]
        }, {
          type: 'list',
          name: 'models',
          message: 'What would you like to use for the default models?',
          choices: [ 'Mongoose', 'Sequelize' ],
          filter: function( val ) {
            return val.toLowerCase();
          },
          when: function(answers) {
            return answers.odms && answers.odms.length > 1;
          }
        }, {
          type: 'confirm',
          name: 'pluralization',
          message: 'Enable Pluralized table names (User becomes Users)',
          when: function(answers){
            return answers.odms && answers.odms.length >= 1 && answers.odms.indexOf('sequelize') !=1;
          }
        }, {
          type: 'confirm',
          name: 'timestamps',
          message: 'Enable timestamps (created_at, updated_at)?',
          when: function (answers){
            return answers.odms && answers.odms.length >= 1 && answers.odms.indexOf('sequelize') != -1;
          }
        }, {
          type: 'confirm',
          name: 'paranoid',
          message: 'Enable "paranoid" deletes (deleted_at) within SQL?',
          when: function (answers){
            return answers.odms && answers.odms.length >= 1 && answers.odms.indexOf('sequelize') != -1;
          }
        },{
          type: 'list',
          name: 'primaryKey',
          message: 'What type of RDBMS Primary Key should be used?',
          choices: [
            {
              value:'serial',
              name: 'Auto-Incrementing (Serial)'
            },{
              value:'uuid',
              name: 'Universal Unique Identifier (UUIDv4)'
            }],
          filter: function ( val ) {
            return val.toLowerCase();
          },
          when: function (answers){
            return answers.odms && answers.odms.length >= 0 && answers.odms.indexOf('sequelize') != -1;
          }
        }, {
          type: 'confirm',
          name: 'auth',
          message: 'Would you scaffold out an authentication boilerplate?',
          when: function (answers) {
            return answers.odms && answers.odms.length !== 0;
          }
        }, {
          type: 'checkbox',
          name: 'oauth',
          message: 'Would you like to include additional oAuth strategies?',
          when: function (answers) {
            return answers.auth;
          },
          choices: [
            {
              value: 'googleAuth',
              name: 'Google',
              checked: false
            },
            {
              value: 'facebookAuth',
              name: 'Facebook',
              checked: false
            },
            {
              value: 'twitterAuth',
              name: 'Twitter',
              checked: false
            }
          ]
        }, {
          type: 'confirm',
          name: 'socketio',
          message: 'Would you like to use socket.io?',
          // to-do: should not be dependent on ODMs
          when: function (answers) {
            return answers.odms && answers.odms.length !== 0;
          },
          default: true
        }], function (answers) {
          if(answers.socketio) this.filters.socketio = true;
          if(answers.auth) this.filters.auth = true;
          if(answers.odms && answers.odms.length > 0) {
            var models;
            if(!answers.models) {
              models = answers.odms[0];
            } else {
              models = answers.models;
            }
            this.filters.models = true;
            this.filters[models + 'Models'] = {};
            this.filters[models + 'Models'].serial = answers.primaryKey === 'serial' ? true : false;
            this.filters[models + 'Models'].uuid = answers.primaryKey === 'uuid' ? true : false;
            delete answers.primaryKey;
            this.filters[models + 'Models'].paranoid = answers.paranoid || false;
            delete answers.paranoid;
            this.filters[models + 'Models'].timestamps = answers.timestamps || false;
            delete answers.timestamps;
            this.filters[models + 'Models'].pluralization = answers.pluralization || false;
            delete answers.pluralization;
            answers.odms.forEach(function(odm) {
              this.filters[odm] = true;
            }.bind(this));
          } else {
            this.filters.noModels = true;
          }
          if(answers.oauth) {
            if(answers.oauth.length) this.filters.oauth = true;
            answers.oauth.forEach(function(oauthStrategy) {
              this.filters[oauthStrategy] = true;
            }.bind(this));
          }

          cb();
        }.bind(this));
      },

      projectPrompts: function() {
        if(this.skipConfig) return;
        var cb = this.async();
        var self = this;

        this.log('\n# Project\n');

        this.prompt([{
          type: 'list',
          name: 'testing',
          message: 'What would you like to write tests with?',
          choices: [ 'Jasmine', 'Mocha + Chai + Sinon'],
          filter: function( val ) {
            var filterMap = {
              'Jasmine': 'jasmine',
              'Mocha + Chai + Sinon': 'mocha'
            };

            return filterMap[val];
          }
        }, {
          type: 'list',
          name: 'chai',
          message: 'What would you like to write Chai assertions with?',
          choices: ['Expect', 'Should'],
          filter: function( val ) {
            return val.toLowerCase();
          },
          when: function( answers ) {
            return  answers.testing === 'mocha';
          }
        }], function (answers) {
          /**
           * Default to grunt until gulp support is implemented
           */
          this.filters.grunt = true;

          this.filters[answers.testing] = true;
          if (answers.testing === 'mocha') {
            this.filters.jasmine = false;
            this.filters.should = false;
            this.filters.expect = false;
            this.filters[answers.chai] = true;
          }
          if (answers.testing === 'jasmine') {
            this.filters.mocha = false;
            this.filters.should = false;
            this.filters.expect = false;
          }

          cb();
        }.bind(this));
      }

    };
  }

  get configuring() {
    return {

      saveSettings: function() {
        if(this.skipConfig) return;
        this.config.set('endpointDirectory', 'server/api/');
        this.config.set('insertRoutes', true);
        this.config.set('registerRoutesFile', 'server/routes.js');
        this.config.set('routesNeedle', '// Insert routes below');

        this.config.set('routesBase', '/api/');
        this.config.set('pluralizeRoutes', true);

        this.config.set('insertSockets', true);
        this.config.set('registerSocketsFile', 'server/config/socketio.js');
        this.config.set('socketsNeedle', '// Insert sockets below');

        this.config.set('insertModels', true);
        this.config.set('registerModelsFile', 'server/sqldb/index.js');
        this.config.set('modelsNeedle', '// Insert models below');

        this.config.set('filters', this.filters);
        this.config.forceSave();
      }
    };
  }

  get default() {
    return {};
  }

  get writing() {
    return {

      generateProject: function() {
        this.sourceRoot(path.join(__dirname, './templates'));
        this.processDirectory('.', '.');
      },

      generateEndpoint: function() {
        var models;
        if (this.filters.mongooseModels) {
          models = 'mongoose';
        } else if (this.filters.sequelizeModels) {
          models = 'sequelize';
        }
        var options = {
          route: '/api/things',
          models: models
        }
        options[models+'Models'] = this.filters[models+'Models'] || {};
        this.composeWith('express-api:endpoint', {
          options: options,
          args: ['thing']
        });
      }

    };
  }

  get install() {
    return {

      installDeps: function() {
        this.installDependencies({
          skipInstall: this.options['skip-install']
        });
      }

    };
  }

  get end() {
    return {};
  }

}
