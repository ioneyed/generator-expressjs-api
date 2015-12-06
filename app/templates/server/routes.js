/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';

module.exports = function(app) {

  // Insert routes below
  <% if (filters.auth) { %>
  app.use('/api/users', require('./api/user'));
  app.use('/auth', require('./auth'));
  <% } %>
  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth)/*')
   .get(errors[404]);

};
