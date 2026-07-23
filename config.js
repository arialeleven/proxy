'use strict';

/**
 * Proxy configuration.
 *
 * Credentials can be defined here in `users` and/or supplied at runtime via
 * environment variables:
 *   PROXY_HOST      - interface to bind (default 0.0.0.0)
 *   PROXY_PORT      - port to listen on (default 6443)
 *   PROXY_USERS     - comma-separated "login:password" pairs
 *   PROXY_TLS       - "true"/"false", enable TLS termination (default true)
 *   PROXY_TLS_CERT  - path to the TLS certificate (PEM)
 *   PROXY_TLS_KEY   - path to the TLS private key (PEM)
 */

module.exports = {
  host: '0.0.0.0',
  port: 6443,

  // TLS termination for the client<->proxy connection (an "HTTPS proxy").
  tls: {
    enabled: true,
    cert: './certs/proxy-cert.pem',
    key: './certs/proxy-key.pem',
  },

  // login: password
  users: {
    admin: 'change-me',
  },
};
