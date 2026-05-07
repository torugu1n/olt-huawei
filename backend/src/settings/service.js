import db from '../db.js';
import config from '../config.js';

const SPECS = {
  OLT_HOST: 'string',
  OLT_PORT: 'number',
  OLT_USERNAME: 'string',
  OLT_PASSWORD: 'string',
  OLT_ENABLE_PASSWORD: 'string',
  OLT_NAME: 'string',
  OLT_TIMEOUT: 'number',
  OLT_SESSION_BOOTSTRAP_COMMANDS: 'string',
};

function defaultSettings() {
  return {
    OLT_HOST: config.OLT_HOST,
    OLT_PORT: config.OLT_PORT,
    OLT_USERNAME: config.OLT_USERNAME,
    OLT_PASSWORD: config.OLT_PASSWORD,
    OLT_ENABLE_PASSWORD: config.OLT_ENABLE_PASSWORD,
    OLT_NAME: config.OLT_NAME,
    OLT_TIMEOUT: config.OLT_TIMEOUT,
    OLT_SESSION_BOOTSTRAP_COMMANDS: Array.isArray(config.OLT_SESSION_BOOTSTRAP_COMMANDS)
      ? config.OLT_SESSION_BOOTSTRAP_COMMANDS.join('\n')
      : String(config.OLT_SESSION_BOOTSTRAP_COMMANDS || ''),
  };
}

function parseStoredValue(key, raw) {
  const type = SPECS[key];
  if (type === 'number') return Number(raw);
  if (type === 'boolean') return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
  return raw;
}

function serializeValue(key, value) {
  const type = SPECS[key];
  if (type === 'boolean') return value ? 'true' : 'false';
  return String(value ?? '');
}

export function getAppSettings() {
  const defaults = defaultSettings();
  const rows = db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
  for (const row of rows) {
    if (!(row.setting_key in SPECS)) continue;
    defaults[row.setting_key] = parseStoredValue(row.setting_key, row.setting_value);
  }
  return defaults;
}

export function getParsedRuntimeSettings() {
  const settings = getAppSettings();
  return {
    ...settings,
    OLT_SESSION_BOOTSTRAP_COMMANDS: splitCommands(settings.OLT_SESSION_BOOTSTRAP_COMMANDS),
  };
}

export function saveAppSettings(input) {
  const current = getAppSettings();
  const next = { ...current };

  for (const key of Object.keys(SPECS)) {
    if (!(key in input)) continue;
    next[key] = normalizeInputValue(key, input[key], current[key]);
  }

  const upsert = db.prepare(`
    INSERT INTO app_settings (setting_key, setting_value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction(() => {
    for (const key of Object.keys(SPECS)) {
      upsert.run(key, serializeValue(key, next[key]));
    }
  });
  tx();

  return next;
}

export function getSafeAppSettings() {
  const settings = getAppSettings();
  return {
    ...settings,
    OLT_PASSWORD: settings.OLT_PASSWORD ? '********' : '',
    OLT_ENABLE_PASSWORD: settings.OLT_ENABLE_PASSWORD ? '********' : '',
  };
}

function normalizeInputValue(key, value, fallback) {
  const type = SPECS[key];

  if (value == null) {
    return fallback;
  }

  if (type === 'string' && String(value) === '********') {
    return fallback;
  }

  if (type === 'string' && String(value).trim() === '' && /PASSWORD/.test(key)) {
    return fallback;
  }

  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (type === 'boolean') {
    return !!value;
  }

  return String(value);
}

function splitCommands(value) {
  return String(value || '')
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}
