'use strict';

const DEFAULTS = {
  enabled: false,
  scheme: 'http',
  host: '',
  port: 8080,
  login: '',
  password: '',
};

const fields = ['enabled', 'scheme', 'host', 'port', 'login', 'password'];

/** Load stored settings into the form. */
async function load() {
  const s = Object.assign({}, DEFAULTS, await chrome.storage.local.get(DEFAULTS));
  document.getElementById('enabled').checked = s.enabled;
  document.getElementById('scheme').value = s.scheme;
  document.getElementById('host').value = s.host;
  document.getElementById('port').value = s.port;
  document.getElementById('login').value = s.login;
  document.getElementById('password').value = s.password;
}

/** Read the form and persist it; the background worker re-applies the proxy. */
async function save() {
  const settings = {
    enabled: document.getElementById('enabled').checked,
    scheme: document.getElementById('scheme').value,
    host: document.getElementById('host').value.trim(),
    port: Number(document.getElementById('port').value) || 8080,
    login: document.getElementById('login').value,
    password: document.getElementById('password').value,
  };

  await chrome.storage.local.set(settings);

  const status = document.getElementById('status');
  status.textContent = 'Saved';
  setTimeout(() => (status.textContent = ''), 1500);
}

document.getElementById('save').addEventListener('click', save);
document.addEventListener('DOMContentLoaded', load);
