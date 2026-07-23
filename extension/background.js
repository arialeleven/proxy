'use strict';

/**
 * Background service worker.
 *
 * Responsibilities:
 *   1. Apply / clear the proxy configuration stored in chrome.storage.
 *   2. Answer proxy authentication challenges (HTTP 407) by supplying the
 *      stored login:password, so the user is never shown the browser prompt.
 */

const DEFAULTS = {
  enabled: false,
  scheme: 'http', // "http" or "https" (proxy transport)
  host: '',
  port: 8080,
  login: '',
  password: '',
};

/** Read the saved settings, filling in defaults for any missing keys. */
async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return Object.assign({}, DEFAULTS, stored);
}

/** Push the proxy config to Chrome (or clear it when disabled/incomplete). */
async function applyProxy(settings) {
  if (!settings.enabled || !settings.host) {
    await chrome.proxy.settings.clear({ scope: 'regular' });
    return;
  }

  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: settings.scheme,
        host: settings.host,
        port: Number(settings.port),
      },
      // Never proxy localhost so the browser stays usable.
      bypassList: ['localhost', '127.0.0.1', '::1'],
    },
  };

  await chrome.proxy.settings.set({ value: config, scope: 'regular' });
}

/** Re-apply whatever is currently stored (on install and on startup). */
async function syncFromStorage() {
  await applyProxy(await getSettings());
}

chrome.runtime.onInstalled.addListener(syncFromStorage);
chrome.runtime.onStartup.addListener(syncFromStorage);

// Re-apply immediately whenever the popup saves new settings.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    syncFromStorage();
  }
});

// ---- Automatic proxy authentication (HTTP 407) ----
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    // Only answer challenges coming from the proxy itself, not from origin
    // servers (which have isProxy === false).
    if (!details.isProxy) {
      callback({});
      return;
    }

    getSettings().then((settings) => {
      if (settings.enabled && settings.login) {
        callback({
          authCredentials: {
            username: settings.login,
            password: settings.password,
          },
        });
      } else {
        callback({});
      }
    });
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);
