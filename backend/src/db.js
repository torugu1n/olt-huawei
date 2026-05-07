import Database from 'better-sqlite3';
import config from './config.js';

const db = new Database(config.DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT    UNIQUE NOT NULL,
    full_name        TEXT    NOT NULL,
    hashed_password  TEXT    NOT NULL,
    is_active        INTEGER NOT NULL DEFAULT 1,
    is_admin         INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    NOT NULL,
    action    TEXT    NOT NULL,
    detail    TEXT,
    success   INTEGER NOT NULL DEFAULT 1,
    timestamp TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS provision_templates (
    port            INTEGER PRIMARY KEY,
    slot            INTEGER NOT NULL DEFAULT 1,
    lineprofile_id  INTEGER NOT NULL,
    srvprofile_id   INTEGER NOT NULL,
    gemport         INTEGER NOT NULL,
    vlan_id         INTEGER,
    user_vlan       INTEGER,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS provision_template_profiles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_username  TEXT,
    slot            INTEGER NOT NULL DEFAULT 1,
    pon_start       INTEGER NOT NULL,
    pon_end         INTEGER NOT NULL,
    lineprofile_id  INTEGER NOT NULL,
    srvprofile_id   INTEGER NOT NULL,
    gemport         INTEGER NOT NULL,
    vlan_id         INTEGER,
    user_vlan       INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS provision_template_catalog (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL UNIQUE,
    description         TEXT,
    lineprofile_mode    TEXT NOT NULL DEFAULT 'fixed',
    lineprofile_id      INTEGER,
    srvprofile_mode     TEXT NOT NULL DEFAULT 'fixed',
    srvprofile_id       INTEGER,
    gemport             INTEGER NOT NULL DEFAULT 6,
    vlan_id             INTEGER,
    user_vlan_mode      TEXT NOT NULL DEFAULT 'same_as_vlan',
    user_vlan           INTEGER,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS provision_template_bindings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    slot                INTEGER NOT NULL DEFAULT 1,
    pon_start           INTEGER NOT NULL,
    pon_end             INTEGER NOT NULL,
    template_id         INTEGER NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES provision_template_catalog(id)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    setting_key     TEXT PRIMARY KEY,
    setting_value   TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS olt_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source          TEXT NOT NULL,
    level           TEXT NOT NULL DEFAULT 'info',
    message         TEXT NOT NULL,
    detail          TEXT,
    raw_output      TEXT,
    metadata_json   TEXT,
    fingerprint     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const templateCount = db.prepare('SELECT COUNT(*) AS count FROM provision_templates').get().count;
if (templateCount === 0) {
  const defaults = [
    [0, 1, 20, 20, 6, 20, 20],
    [1, 1, 20, 20, 6, 20, 20],
    [2, 1, 20, 20, 6, 20, 20],
    [3, 1, 20, 20, 6, 30, 30],
    [4, 1, 20, 20, 6, 30, 30],
    [5, 1, 20, 20, 6, 40, 40],
    [6, 1, 20, 20, 6, 40, 40],
    [7, 1, 20, 20, 6, 50, 50],
    [8, 1, 20, 20, 6, 50, 50],
    [9, 1, 20, 20, 6, 60, 60],
    [10, 1, 20, 20, 6, 60, 60],
    [11, 1, 20, 20, 6, 70, 70],
    [12, 1, 20, 20, 6, 70, 70],
    [13, 1, 20, 20, 6, 80, 80],
    [14, 1, 20, 20, 6, 80, 80],
    [15, 1, 20, 20, 6, null, null],
  ];

  const insert = db.prepare(`
    INSERT INTO provision_templates (
      port, slot, lineprofile_id, srvprofile_id, gemport, vlan_id, user_vlan
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    for (const row of defaults) insert.run(...row);
  });

  seed();
}

const profileCount = db.prepare('SELECT COUNT(*) AS count FROM provision_template_profiles').get().count;
if (profileCount === 0) {
  const defaults = [
    [null, 1, 0, 2, 20, 20, 6, 20, 20],
    [null, 1, 3, 4, 20, 20, 6, 30, 30],
    [null, 1, 5, 6, 20, 20, 6, 40, 40],
    [null, 1, 7, 8, 20, 20, 6, 50, 50],
    [null, 1, 9, 10, 20, 20, 6, 60, 60],
    [null, 1, 11, 12, 20, 20, 6, 70, 70],
    [null, 1, 13, 14, 20, 20, 6, 80, 80],
  ];

  const insert = db.prepare(`
    INSERT INTO provision_template_profiles (
      owner_username, slot, pon_start, pon_end, lineprofile_id, srvprofile_id, gemport, vlan_id, user_vlan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedProfiles = db.transaction(() => {
    for (const row of defaults) insert.run(...row);
  });

  seedProfiles();
}

const catalogCount = db.prepare('SELECT COUNT(*) AS count FROM provision_template_catalog').get().count;
if (catalogCount === 0) {
  const defaults = [20, 30, 40, 50, 60, 70, 80].map((vlan) => ({
    name: `Padrao VLAN ${vlan}`,
    description: `Template operacional para VLAN ${vlan}`,
    lineprofile_mode: 'same_as_vlan',
    lineprofile_id: null,
    srvprofile_mode: 'same_as_vlan',
    srvprofile_id: null,
    gemport: 6,
    vlan_id: vlan,
    user_vlan_mode: 'same_as_vlan',
    user_vlan: null,
  }));

  const insertTemplate = db.prepare(`
    INSERT INTO provision_template_catalog (
      name, description, lineprofile_mode, lineprofile_id,
      srvprofile_mode, srvprofile_id, gemport, vlan_id, user_vlan_mode, user_vlan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBinding = db.prepare(`
    INSERT INTO provision_template_bindings (
      slot, pon_start, pon_end, template_id
    ) VALUES (?, ?, ?, ?)
  `);

  const seedCatalog = db.transaction(() => {
    const ids = defaults.map((item) => {
      const info = insertTemplate.run(
        item.name,
        item.description,
        item.lineprofile_mode,
        item.lineprofile_id,
        item.srvprofile_mode,
        item.srvprofile_id,
        item.gemport,
        item.vlan_id,
        item.user_vlan_mode,
        item.user_vlan,
      );

      return Number(info.lastInsertRowid);
    });

    const bindings = [
      [1, 0, 2, ids[0]],
      [1, 3, 4, ids[1]],
      [1, 5, 6, ids[2]],
      [1, 7, 8, ids[3]],
      [1, 9, 10, ids[4]],
      [1, 11, 12, ids[5]],
      [1, 13, 14, ids[6]],
    ];

    for (const row of bindings) insertBinding.run(...row);
  });

  seedCatalog();
}

export default db;
