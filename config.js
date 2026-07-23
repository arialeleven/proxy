'use strict';

/**
 * Proxy configuration.
 *
 * Credentials can be defined here in `users` and/or supplied at runtime via
 * environment variables:
 *   PROXY_HOST  - interface to bind (default 0.0.0.0)
 *   PROXY_PORT  - port to listen on (default 8080)
 *   PROXY_USERS - comma-separated "login:password" pairs
 */

module.exports = {
  host: '0.0.0.0',
  port: 8080,

  // login: password
  users: {
    admin: 'change-me',
  },
};
