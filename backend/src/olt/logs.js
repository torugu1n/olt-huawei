import db from '../db.js';

export function listOltLogs({ limit = 100, offset = 0, source, level } = {}) {
  let sql = 'SELECT * FROM olt_logs WHERE 1=1';
  const params = [];

  if (source) {
    sql += ' AND source = ?';
    params.push(source);
  }

  if (level) {
    sql += ' AND level = ?';
    params.push(level);
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(Math.min(Number(limit) || 100, 500), Number(offset) || 0);

  return db.prepare(sql).all(...params).map(normalizeLogRow);
}

export function writeOltLog({
  source,
  level = 'info',
  message,
  detail = null,
  rawOutput = null,
  metadata = null,
  fingerprint = null,
  dedupeByFingerprint = false,
} = {}) {
  if (!source || !message) {
    return null;
  }

  if (dedupeByFingerprint && fingerprint) {
    const last = db
      .prepare('SELECT id FROM olt_logs WHERE source = ? AND fingerprint = ? ORDER BY id DESC LIMIT 1')
      .get(source, fingerprint);

    if (last) {
      return last.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO olt_logs (
      source, level, message, detail, raw_output, metadata_json, fingerprint
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    source,
    level,
    message,
    detail,
    rawOutput,
    metadata ? JSON.stringify(metadata) : null,
    fingerprint,
  );

  return Number(result.lastInsertRowid);
}

export function logDashboardSummary(summary) {
  if (!summary) {
    return;
  }

  const criticalOrMajor = (summary.alarms ?? []).filter((alarm) => {
    const severity = String(alarm.severity || '').toLowerCase();
    return severity === 'critical' || severity === 'major';
  }).length;

  const faultyBoards = (summary.boards ?? []).filter((board) => {
    const status = String(board.status || '').toLowerCase();
    const online = String(board.online_state || '').toLowerCase();
    return status.includes('failed') || online.includes('offline');
  }).length;

  const snapshotState = {
    connected: !!summary.status?.connected,
    status_message: summary.status?.message ?? '',
    onts_total: summary.onts_total ?? 0,
    onts_online: summary.onts_online ?? 0,
    alarms_priority: criticalOrMajor,
    alarms_total: summary.alarms?.length ?? 0,
    autofind_total: summary.autofind?.length ?? 0,
    boards_total: summary.boards?.length ?? 0,
    boards_faulty: faultyBoards,
  };

  const fingerprint = JSON.stringify(snapshotState);
  const level = !snapshotState.connected
    ? 'error'
    : snapshotState.alarms_priority > 0 || snapshotState.boards_faulty > 0
      ? 'warning'
      : 'info';

  const detail = [
    `ONTs ${snapshotState.onts_online}/${snapshotState.onts_total} online`,
    `${snapshotState.autofind_total} em autofind`,
    `${snapshotState.alarms_priority} alarmes prioritarios`,
    `${snapshotState.boards_faulty}/${snapshotState.boards_total} boards com falha`,
  ].join(' • ');

  writeOltLog({
    source: 'dashboard_snapshot',
    level,
    message: snapshotState.connected ? 'Snapshot operacional da OLT atualizado' : 'Falha ao consolidar snapshot da OLT',
    detail,
    metadata: snapshotState,
    fingerprint,
    dedupeByFingerprint: true,
  });
}

function normalizeLogRow(row) {
  let metadata = null;
  if (row?.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = null;
    }
  }

  return {
    id: row.id,
    source: row.source,
    level: row.level,
    message: row.message,
    detail: row.detail,
    raw_output: row.raw_output,
    metadata,
    created_at: row.created_at,
  };
}
