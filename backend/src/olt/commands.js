import { sendCommand, sendConfig, sendConfigBatch, testConnection } from './ssh.js';
import * as parser from './parser.js';

const cache = new Map();
const TTL = {
  status: 10_000,
  version: 10 * 60_000,
  boards: 5 * 60_000,
  alarms: 15_000,
  autofind: 15_000,
  onts: 60_000,
  ontDetail: 60_000,
  ontOptical: 20_000,
  ontWan: 30_000,
  ontVersion: 10 * 60_000,
  dashboard: 60_000,
};

async function withCache(key, ttlMs, loader) {
  const now = Date.now();
  const current = cache.get(key);

  if (current?.value !== undefined && current.expiresAt > now) {
    return current.value;
  }

  if (current?.promise) {
    return current.promise;
  }

  const promise = (async () => {
    try {
      const value = await loader();
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } catch (err) {
      if (current?.value !== undefined) {
        cache.set(key, { value: current.value, expiresAt: current.expiresAt ?? now });
        return current.value;
      }
      cache.delete(key);
      throw err;
    }
  })();

  cache.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
}

function getCachedValue(key) {
  const current = cache.get(key);
  return current?.value;
}

export function clearOltCache() {
  cache.clear();
}

function buildDetailCacheKey(slot, port, ontId) {
  return `ont-detail:${slot}:${port}:${ontId}`;
}

async function runInGponInterface(slot, commands, timeout = 25_000) {
  const outputs = await sendConfigBatch(
    [
      `interface gpon 0/${slot}`,
      ...commands,
    ],
    timeout,
    { exitCommands: 2 },
  );

  return outputs.slice(1);
}

async function runShowCommand(candidates, timeout, runner = sendCommand) {
  let lastRaw = '';
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const raw = await runner(candidate, timeout);
      lastRaw = raw;
      if (!looksLikeSyntaxError(raw)) return raw;
    } catch (err) {
      lastError = err;
      if (!looksLikeSyntaxError(err.message || '')) throw err;
    }
  }

  if (lastError) throw lastError;
  return lastRaw;
}

function looksLikeSyntaxError(text) {
  const normalized = String(text || '').toLowerCase();
  return (
    normalized.includes('% too many parameters') ||
    normalized.includes('% parameter error') ||
    normalized.includes('% unknown command') ||
    normalized.includes('error locates at') ||
    normalized.includes('reenter times have reached the upper limit') ||
    normalized.includes('configuration console time out')
  );
}

async function runShowInConfig(candidates, timeout) {
  return runShowCommand(candidates, timeout, (candidate, ms) => sendConfig([candidate], ms));
}

export async function getStatus() {
  return withCache('status', TTL.status, () => testConnection());
}

export async function getVersion() {
  return withCache('version', TTL.version, () => sendCommand('display version', 15_000));
}

export async function getBoards() {
  return withCache('boards', TTL.boards, async () => {
    const raw = await runShowInConfig([
      'display board 0',
      'display board 0/0',
    ], 20_000);
    return { raw, boards: parser.parseBoards(raw) };
  });
}

export async function getAlarms() {
  return withCache('alarms', TTL.alarms, async () => {
    const raw = await runShowInConfig([
      'display alarm active all',
    ], 30_000);
    return { raw, alarms: parser.parseAlarms(raw) };
  });
}

export async function getGponPortStates(slot = 1) {
  return withCache(`gpon-port-states:${slot}`, TTL.status, async () => {
    try {
      const [raw] = await runInGponInterface(slot, ['display port state all'], 30_000);
      const ports = parser.parseGponPortStates(raw);
      if (ports.length > 0) {
        return { raw, ports };
      }
    } catch {
      // cai no fallback porta a porta abaixo
    }

    const commands = Array.from({ length: 16 }, (_, port) => `display port state ${port}`);
    const rawBlocks = await runInGponInterface(slot, commands, 15_000);
    const raw = rawBlocks.join('\n\n');
    const ports = parser.parseGponPortStates(raw);
    return { raw, ports };
  });
}

export async function getAutofind() {
  return withCache('autofind', TTL.autofind, async () => {
    const raw = await runShowInConfig([
      'display ont autofind all',
    ], 30_000);
    return { raw, onts: parser.parseAutofind(raw) };
  });
}

export async function getOntList(slot, port) {
  const cacheKey = `onts:${slot ?? 'all'}:${port ?? 'all'}`;
  return withCache(cacheKey, TTL.onts, async () => {
  let candidates;
  if (slot != null && port != null) {
    candidates = [`display ont info summary 0/${slot}/${port}`];
  } else if (slot != null) {
    candidates = [`display ont info summary 0/${slot}`];
  } else {
    candidates = ['display ont info summary 0'];
  }

    const raw = await runShowInConfig(candidates, 60_000);
    return { raw, onts: parser.parseOntList(raw) };
  });
}

export async function getOntInfo(slot, port, ontId) {
  return withCache(`ont-info:${slot}:${port}:${ontId}`, TTL.ontDetail, async () => {
    const [raw] = await runInGponInterface(slot, [`display ont info ${port} ${ontId}`], 25_000);
    return { raw, info: parser.parseOntInfo(raw) };
  });
}

export async function getOntOptical(slot, port, ontId) {
  return withCache(`ont-optical:${slot}:${port}:${ontId}`, TTL.ontOptical, async () => {
    const [raw] = await runInGponInterface(slot, [`display ont info summary ${port}`], 25_000);
    return { raw, optical: parser.parseOpticalFromSummary(raw, ontId) };
  });
}

export async function getServicePorts(slot, port, ontId) {
  return withCache(`ont-service-ports:${slot}:${port}:${ontId}`, TTL.ontDetail, async () => {
    const raw = await runShowCommand([
      `display service-port port 0/${slot}/${port} ont ${ontId}`,
      `display service-port port 0/${slot}/${port}`,
    ], 20_000);
    return { raw, servicePorts: parser.parseServicePorts(raw) };
  });
}

export async function getOntDetailSnapshot(slot, port, ontId) {
  return withCache(buildDetailCacheKey(slot, port, ontId), TTL.ontDetail, async () => {
    const [infoRaw, opticalRaw] = await runInGponInterface(
      slot,
      [
        `display ont info ${port} ${ontId}`,
        `display ont info summary ${port}`,
      ],
      25_000,
    );
    const info = parser.parseOntInfo(infoRaw);
    const optical = parser.parseOpticalFromSummary(opticalRaw, ontId);
    const { raw: servicePortsRaw, servicePorts } = await getServicePorts(slot, port, ontId);

    return {
      info,
      optical,
      service_ports: servicePorts,
      raw: {
        info: infoRaw,
        optical: opticalRaw,
        service_ports: servicePortsRaw,
      },
    };
  });
}

export async function getOntWan(slot, port, ontId) {
  return withCache(`ont-wan:${slot}:${port}:${ontId}`, TTL.ontWan, () => runShowInConfig([
    `display ont wan-info 0 ${slot} ${port} ${ontId}`,
    `display ont wan-info 0/${slot}/${port} ${ontId}`,
    `display ont wan-info ${slot} ${port} ${ontId}`,
  ], 20_000));
}

export async function getOntVersion(slot, port, ontId) {
  return withCache(`ont-version:${slot}:${port}:${ontId}`, TTL.ontVersion, () => runShowInConfig([
    `display ont version 0 ${slot} ${port} ${ontId}`,
    `display ont version 0/${slot}/${port} ${ontId}`,
    `display ont version ${slot} ${port} ${ontId}`,
  ], 20_000));
}

/** Registra ONT via SN e retorna o ONT ID atribuído. */
export async function provisionOnt({ slot, port, sn, lineprofileId, srvprofileId, description }) {
  const raw = await sendConfig(
    [
      `interface gpon 0/${slot}`,
      `ont add ${port} sn-auth "${sn}" omci ont-lineprofile-id ${lineprofileId} ont-srvprofile-id ${srvprofileId} desc "${description}"`,
    ],
    30_000,
    { exitCommands: 2 },
  );
  const m = raw.match(/ONTID\s*:\s*(\d+)/i);
  return { raw, ontId: m ? Number(m[1]) : null };
}

export async function configureOntNativeVlan({ slot, port, ontId, userVlan, ethPort = 1, priority = 0 }) {
  return sendConfig(
    [
      `interface gpon 0/${slot}`,
      `ont port native-vlan ${port} ${ontId} eth ${ethPort} vlan ${userVlan} priority ${priority}`,
    ],
    30_000,
    { exitCommands: 2 },
  );
}

/** Cria um service-port com tag-transform translate. */
export async function addServicePort({ vlanId, slot, port, ontId, gemport, userVlan }) {
  return sendConfig([
    `service-port vlan ${vlanId} gpon 0/${slot}/${port} ont ${ontId} gemport ${gemport} multi-service user-vlan ${userVlan} tag-transform translate`,
  ]);
}

export async function deleteOnt(slot, port, ontId) {
  return sendConfig(
    [
      `interface gpon 0/${slot}`,
      `ont delete ${port} ${ontId}`,
    ],
    30_000,
    { exitCommands: 2 },
  );
}

export async function deleteServicePort(index) {
  return sendConfig([`undo service-port ${index}`]);
}

export async function rebootOnt(slot, port, ontId) {
  return sendConfig(
    [
      `interface gpon 0/${slot}`,
      `ont reset ${port} ${ontId}`,
    ],
    30_000,
    { exitCommands: 2 },
  );
}

export async function getDashboardSummary() {
  return withCache('dashboard-summary', TTL.dashboard, async () => {
    const previousSummary = getCachedValue('dashboard-summary');
    const ontsResult = await safeDashboardLoad(() => getOntList(), getCachedValue('onts:all:all'));
    const boardsResult = await safeDashboardLoad(() => getBoards(), getCachedValue('boards'));
    const alarmsResult = await safeDashboardLoad(() => getAlarms(), getCachedValue('alarms'));
    const autofindResult = await safeDashboardLoad(() => getAutofind(), getCachedValue('autofind'));
    const gponPortsResult = await safeDashboardLoad(
      () => withTimeout(getGponPortStates(1), 12_000, 'Telemetria GPON excedeu o tempo limite'),
      getCachedValue('gpon-port-states:1'),
    );

    const onts = ontsResult.value?.onts ?? [];
    const boards = boardsResult.value?.boards ?? [];
    const alarms = alarmsResult.value?.alarms ?? [];
    const autofind = autofindResult.value?.onts ?? [];
    const gponPorts = gponPortsResult.value?.ports ?? [];
    const firstError = [ontsResult, boardsResult, alarmsResult, autofindResult, gponPortsResult].find((result) => !result.ok);
    const anySuccess = [ontsResult, boardsResult, alarmsResult, autofindResult, gponPortsResult].some((result) => result.ok || result.fromCache);
    const status = anySuccess
      ? {
          connected: true,
          message: firstError?.fromCache
            ? 'Snapshot servido com cache parcial da OLT.'
            : 'Snapshot consolidado lido da OLT.',
        }
      : { connected: false, message: firstError?.error?.message || 'Falha ao consultar status da OLT' };
    const onlineOnts = onts.filter((ont) => ont.run_state?.toLowerCase() === 'online');
    const activeBoards = boards.filter((board) => {
      const boardStatus = String(board.status || '').toLowerCase();
      return boardStatus.includes('normal') || boardStatus.includes('active');
    }).length;
    const faultyBoards = boards.filter((board) => {
      const boardStatus = String(board.status || '').toLowerCase();
      const onlineState = String(board.online_state || '').toLowerCase();
      return boardStatus.includes('failed') || onlineState.includes('offline');
    }).length;
    const onlineGponPorts = gponPorts.filter((port) => String(port.port_state || '').toLowerCase() === 'online').length;
    const avgPortTemperature = averageMetric(
      gponPorts
        .map((port) => Number.parseFloat(port.temperature_c))
        .filter((value) => Number.isFinite(value))
    );
    const maxPortTemperature = maxMetric(
      gponPorts
        .map((port) => Number.parseFloat(port.temperature_c))
        .filter((value) => Number.isFinite(value))
    );
    const totalAvailableBandwidthGbps = sumMetric(
      gponPorts
        .map((port) => Number.parseFloat(port.available_bandwidth_kbps))
        .filter((value) => Number.isFinite(value))
        .map((value) => value / 1_000_000)
    );
    const avgPortTxPowerDbm = averageMetric(
      gponPorts
        .map((port) => Number.parseFloat(port.tx_power_dbm))
        .filter((value) => Number.isFinite(value))
    );

    const summary = {
      status,
      boards,
      alarms,
      autofind,
      gpon_ports: gponPorts,
      onts_total: onts.length,
      onts_online: onlineOnts.length,
      metrics: {
        gpon_ports_total: gponPorts.length,
        gpon_ports_online: onlineGponPorts,
        avg_port_temperature_c: avgPortTemperature,
        max_port_temperature_c: maxPortTemperature,
        total_available_bandwidth_gbps: totalAvailableBandwidthGbps,
        avg_port_tx_power_dbm: avgPortTxPowerDbm,
        boards_active: activeBoards,
        boards_faulty: faultyBoards,
      },
    };

    if (!anySuccess && previousSummary) {
      return {
        ...previousSummary,
        status,
      };
    }

    return summary;
  });
}

async function safeDashboardLoad(loader, fallbackValue) {
  try {
    const value = await loader();
    return { ok: true, value, fromCache: false };
  } catch (error) {
    if (fallbackValue !== undefined) {
      return { ok: false, error, value: fallbackValue, fromCache: true };
    }
    return { ok: false, error, fromCache: false };
  }
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function averageMetric(values) {
  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

function maxMetric(values) {
  if (!values.length) {
    return null;
  }

  return Number(Math.max(...values).toFixed(2));
}

function sumMetric(values) {
  if (!values.length) {
    return null;
  }

  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(2));
}
