import db from '../db.js';

const DEFAULT_TEMPLATE = {
  template_id: null,
  template_name: null,
  slot: 1,
  lineprofile_id: 20,
  srvprofile_id: 20,
  gemport: 6,
  vlan_id: null,
  user_vlan: null,
  auto_matched: false,
  source: 'manual',
};

function numberOrNull(value) {
  return value == null ? null : Number(value);
}

function normalizeCatalogRow(row) {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: row.description ?? '',
    lineprofile_mode: row.lineprofile_mode,
    lineprofile_id: numberOrNull(row.lineprofile_id),
    srvprofile_mode: row.srvprofile_mode,
    srvprofile_id: numberOrNull(row.srvprofile_id),
    gemport: Number(row.gemport),
    vlan_id: numberOrNull(row.vlan_id),
    user_vlan_mode: row.user_vlan_mode,
    user_vlan: numberOrNull(row.user_vlan),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function resolveCatalogTemplate(template, slot, port) {
  if (!template) {
    return {
      port: Number(port),
      slot: Number(slot),
      ...DEFAULT_TEMPLATE,
      slot: Number(slot),
    };
  }

  const vlanId = template.vlan_id == null ? null : Number(template.vlan_id);
  const userVlan = template.user_vlan_mode === 'same_as_vlan'
    ? vlanId
    : (template.user_vlan == null ? null : Number(template.user_vlan));
  const lineprofileId = template.lineprofile_mode === 'same_as_vlan'
    ? vlanId
    : (template.lineprofile_id == null ? null : Number(template.lineprofile_id));
  const srvprofileId = template.srvprofile_mode === 'same_as_vlan'
    ? vlanId
    : (template.srvprofile_id == null ? null : Number(template.srvprofile_id));

  return {
    port: Number(port),
    slot: Number(slot),
    template_id: Number(template.id),
    template_name: String(template.name),
    lineprofile_id: lineprofileId,
    srvprofile_id: srvprofileId,
    gemport: Number(template.gemport),
    vlan_id: vlanId,
    user_vlan: userVlan,
    auto_matched:
      vlanId != null &&
      userVlan != null &&
      lineprofileId != null &&
      srvprofileId != null,
    source: 'binding',
    description: template.description ?? '',
    lineprofile_mode: template.lineprofile_mode,
    srvprofile_mode: template.srvprofile_mode,
    user_vlan_mode: template.user_vlan_mode,
    created_at: template.created_at,
    updated_at: template.updated_at,
  };
}

function getBindingTemplateRow(slot, port) {
  return db.prepare(`
    SELECT
      b.id AS binding_id,
      b.slot,
      b.pon_start,
      b.pon_end,
      b.created_at AS binding_created_at,
      b.updated_at AS binding_updated_at,
      t.id,
      t.name,
      t.description,
      t.lineprofile_mode,
      t.lineprofile_id,
      t.srvprofile_mode,
      t.srvprofile_id,
      t.gemport,
      t.vlan_id,
      t.user_vlan_mode,
      t.user_vlan,
      t.created_at,
      t.updated_at
    FROM provision_template_bindings b
    JOIN provision_template_catalog t ON t.id = b.template_id
    WHERE b.slot = ?
      AND ? BETWEEN b.pon_start AND b.pon_end
    ORDER BY (b.pon_end - b.pon_start) ASC, b.id ASC
    LIMIT 1
  `).get(Number(slot), Number(port));
}

export function listTemplateCatalog() {
  return db.prepare(`
    SELECT id, name, description, lineprofile_mode, lineprofile_id, srvprofile_mode, srvprofile_id, gemport, vlan_id, user_vlan_mode, user_vlan, created_at, updated_at
    FROM provision_template_catalog
    ORDER BY name COLLATE NOCASE ASC
  `).all().map(normalizeCatalogRow);
}

export function getTemplateCatalogItem(id) {
  const row = db.prepare(`
    SELECT id, name, description, lineprofile_mode, lineprofile_id, srvprofile_mode, srvprofile_id, gemport, vlan_id, user_vlan_mode, user_vlan, created_at, updated_at
    FROM provision_template_catalog
    WHERE id = ?
  `).get(Number(id));

  return row ? normalizeCatalogRow(row) : null;
}

export function createTemplateCatalogItem(input) {
  const info = db.prepare(`
    INSERT INTO provision_template_catalog (
      name, description, lineprofile_mode, lineprofile_id,
      srvprofile_mode, srvprofile_id, gemport, vlan_id, user_vlan_mode, user_vlan, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    input.name,
    input.description ?? '',
    input.lineprofile_mode,
    input.lineprofile_id,
    input.srvprofile_mode,
    input.srvprofile_id,
    input.gemport,
    input.vlan_id,
    input.user_vlan_mode,
    input.user_vlan,
  );

  return getTemplateCatalogItem(Number(info.lastInsertRowid));
}

export function updateTemplateCatalogItem(id, input) {
  db.prepare(`
    UPDATE provision_template_catalog
    SET
      name = ?,
      description = ?,
      lineprofile_mode = ?,
      lineprofile_id = ?,
      srvprofile_mode = ?,
      srvprofile_id = ?,
      gemport = ?,
      vlan_id = ?,
      user_vlan_mode = ?,
      user_vlan = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.name,
    input.description ?? '',
    input.lineprofile_mode,
    input.lineprofile_id,
    input.srvprofile_mode,
    input.srvprofile_id,
    input.gemport,
    input.vlan_id,
    input.user_vlan_mode,
    input.user_vlan,
    Number(id),
  );

  return getTemplateCatalogItem(id);
}

export function deleteTemplateCatalogItem(id) {
  return db.prepare('DELETE FROM provision_template_catalog WHERE id = ?').run(Number(id));
}

export function listTemplateBindings() {
  return db.prepare(`
    SELECT
      b.id,
      b.slot,
      b.pon_start,
      b.pon_end,
      b.template_id,
      b.created_at,
      b.updated_at,
      t.name AS template_name,
      t.description AS template_description
    FROM provision_template_bindings b
    JOIN provision_template_catalog t ON t.id = b.template_id
    ORDER BY b.slot ASC, b.pon_start ASC, b.pon_end ASC, b.id ASC
  `).all().map((row) => ({
    id: Number(row.id),
    slot: Number(row.slot),
    pon_start: Number(row.pon_start),
    pon_end: Number(row.pon_end),
    template_id: Number(row.template_id),
    template_name: row.template_name,
    template_description: row.template_description ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function getTemplateBinding(id) {
  const row = db.prepare(`
    SELECT
      b.id,
      b.slot,
      b.pon_start,
      b.pon_end,
      b.template_id,
      b.created_at,
      b.updated_at,
      t.name AS template_name,
      t.description AS template_description
    FROM provision_template_bindings b
    JOIN provision_template_catalog t ON t.id = b.template_id
    WHERE b.id = ?
  `).get(Number(id));

  if (!row) return null;

  return {
    id: Number(row.id),
    slot: Number(row.slot),
    pon_start: Number(row.pon_start),
    pon_end: Number(row.pon_end),
    template_id: Number(row.template_id),
    template_name: row.template_name,
    template_description: row.template_description ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function findOverlappingBinding({ slot, pon_start, pon_end, excludeId = null }) {
  return db.prepare(`
    SELECT id, slot, pon_start, pon_end, template_id
    FROM provision_template_bindings
    WHERE slot = ?
      AND NOT (pon_end < ? OR pon_start > ?)
      AND (? IS NULL OR id != ?)
    LIMIT 1
  `).get(Number(slot), Number(pon_start), Number(pon_end), excludeId == null ? null : Number(excludeId), excludeId == null ? null : Number(excludeId));
}

export function createTemplateBinding(input) {
  const info = db.prepare(`
    INSERT INTO provision_template_bindings (
      slot, pon_start, pon_end, template_id, updated_at
    ) VALUES (?, ?, ?, ?, datetime('now'))
  `).run(
    input.slot,
    input.pon_start,
    input.pon_end,
    input.template_id,
  );

  return getTemplateBinding(Number(info.lastInsertRowid));
}

export function updateTemplateBinding(id, input) {
  db.prepare(`
    UPDATE provision_template_bindings
    SET
      slot = ?,
      pon_start = ?,
      pon_end = ?,
      template_id = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.slot,
    input.pon_start,
    input.pon_end,
    input.template_id,
    Number(id),
  );

  return getTemplateBinding(id);
}

export function deleteTemplateBinding(id) {
  return db.prepare('DELETE FROM provision_template_bindings WHERE id = ?').run(Number(id));
}

export function getProvisionTemplate(port, slot = 1) {
  const row = getBindingTemplateRow(slot, port);
  return resolveCatalogTemplate(row, slot, port);
}

export function listProvisionTemplates(slot = 1) {
  return Array.from({ length: 16 }, (_, port) => getProvisionTemplate(port, slot));
}
