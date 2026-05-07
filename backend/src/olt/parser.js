export function parseBoards(output) {
  const boardName = output.match(/Board Name\s*:\s*(.+)/i)?.[1]?.trim();
  const boardStatus = output.match(/Board Status\s*:\s*(.+)/i)?.[1]?.trim();
  const onlineOffline = output.match(/Online\/Offline\s*:\s*(.+)/i)?.[1]?.trim();
  if (boardName || boardStatus) {
    return [{
      slot: 0,
      board_name: boardName || '',
      status: boardStatus || '',
      sub_type: '',
      online_state: onlineOffline || '',
    }];
  }

  const boards = [];
  let headerPassed = false;
  for (const line of output.split('\n')) {
    if (/^-+/.test(line.trim())) { headerPassed = true; continue; }
    if (!headerPassed) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
      const onlineState = parts.length > 4 ? parts.slice(4).join(' ') : '';
      boards.push({
        slot: Number(parts[0]),
        board_name: parts[1] || '',
        status: parts[2] || '',
        sub_type: parts[3] || '',
        online_state: onlineState,
      });
    }
  }
  return boards;
}

export function parseAutofind(output) {
  const results = [];
  let current = {};
  for (const line of output.split('\n')) {
    const l = line.trim();
    let m;
    if ((m = l.match(/F\/S\/P\s*:\s*(\d+)\/(\d+)\/(\d+)/)))
      current = { frame: +m[1], slot: +m[2], port: +m[3] };
    else if ((m = l.match(/Ont SN\s*:\s*([A-Z0-9]+)/i)))
      current.sn = m[1];
    else if ((m = l.match(/VendorID\s*:\s*(\S+)/i)))
      current.vendor_id = m[1];
    else if ((m = l.match(/Ont EquipmentID\s*:\s*(.*)/i)))
      current.equipment_id = m[1].trim();
    else if ((m = l.match(/Ont autofind time\s*:\s*(.*)/i))) {
      current.found_at = m[1].trim();
      if (current.sn) results.push({ ...current });
      current = {};
    }
  }
  return results;
}

export function parseOntInfo(output) {
  const data = {};
  const MAP = {
    'F/S/P':              'location',
    'ONT-ID':             'ont_id',
    'Run state':          'run_state',
    'Config state':       'config_state',
    'Control flag':       'control_flag',
    'Match state':        'match_state',
    'Ont SN':             'sn',
    'SN':                 'sn',
    'Description':        'description',
    'Ont lineprofile-id': 'lineprofile_id',
    'Line profile ID':    'lineprofile_id',
    'Line profile name':  'lineprofile_name',
    'Ont srvprofile-id':  'srvprofile_id',
    'Service profile ID': 'srvprofile_id',
    'Service profile name': 'srvprofile_name',
    'ONT distance':       'distance_m',
    'DBA type':           'dba_type',
    'ONT battery state':  'battery_state',
    'ONT power type':     'power_type',
    'Memory occupation':  'memory_occupation',
    'CPU occupation':     'cpu_occupation',
    'Temperature':        'temperature',
    'Authentic type':     'authentic_type',
    'Management mode':    'management_mode',
    'Software work mode': 'software_work_mode',
    'Isolation state':    'isolation_state',
    'Last down cause':    'last_down_cause',
    'Last up time':       'last_up_time',
    'Last down time':     'last_down_time',
    'Last dying gasp time': 'last_dying_gasp_time',
    'Last restart reason': 'last_restart_reason',
    'ONT online duration': 'online_duration',
    'ONT system up duration': 'system_up_duration',
    'Type C support':     'type_c_support',
    'Interoperability-mode': 'interoperability_mode',
    'Power reduction status': 'power_reduction_status',
    'FEC upstream state': 'fec_upstream_state',
    'VoIP configure method': 'voip_configure_method',
    'FEC upstream switch': 'fec_upstream_switch',
    'OMCC encrypt switch': 'omcc_encrypt_switch',
    'Qos mode':           'qos_mode',
    'Mapping mode':       'mapping_mode',
    'TR069 management':   'tr069_management',
    'TR069 IP index':     'tr069_ip_index',
    'Alarm policy profile ID': 'alarm_policy_profile_id',
    'Alarm policy profile name': 'alarm_policy_profile_name',
  };
  for (const line of output.split('\n')) {
    for (const [key, field] of Object.entries(MAP)) {
      const match = line.match(new RegExp(`^\\s*${escapeRegex(key)}\\s*:\\s*(.+?)\\s*$`, 'i'));
      if (match) {
        let value = match[1].trim();
        if (field === 'sn') {
          value = value.split(/\s+/)[0];
        } else if (field === 'distance_m') {
          value = value.replace(/m$/, '');
        }
        data[field] = value;
        break;
      }
    }
  }

  if (data.location) {
    const location = data.location.match(/^(\d+)\/(\d+)\/(\d+)$/);
    if (location) {
      data.frame = Number(location[1]);
      data.slot = Number(location[2]);
      data.port = Number(location[3]);
    }
  }

  return Object.keys(data).length ? data : null;
}

export function parseOptical(output) {
  const data = {};
  const PATTERNS = [
    ['Rx optical power',            'rx_power_dbm',     /([-\d.]+)\s*dBm/],
    ['Tx optical power',            'tx_power_dbm',     /([-\d.]+)\s*dBm/],
    ['OLT Rx ONT optical power',    'olt_rx_power_dbm', /([-\d.]+)\s*dBm/],
    ['Laser bias current',          'laser_bias_ma',    /([\d.]+)\s*mA/],
    ['Temperature',                 'temperature_c',    /([\d.]+)\s*C/],
    ['Voltage',                     'voltage_v',        /([\d.]+)\s*V/],
  ];
  for (const line of output.split('\n')) {
    for (const [key, field, re] of PATTERNS) {
      if (line.includes(key)) {
        const m = line.match(re);
        if (m) data[field] = m[1];
      }
    }
  }
  return data;
}

export function parseOpticalFromSummary(output, ontId) {
  for (const line of output.split('\n')) {
    const match = line.match(/^\s*(\d+)\s+([A-Z0-9]+)\s+(\S+)\s+(\S+)\s+([-\d.]+)\/([-\d.]+)\s+(.*)$/i);
    if (!match) continue;

    if (Number(match[1]) !== Number(ontId)) continue;

    return {
      rx_power_dbm: match[5],
      tx_power_dbm: match[6],
    };
  }

  return {};
}

export function parseOntList(output) {
  const ontsByKey = new Map();
  let currentPort = null;
  let section = null;

  for (const line of output.split('\n')) {
    let m = line.match(/In port\s+(\d+)\/(\d+)\/(\d+),/i);
    if (m) {
      currentPort = { frame: +m[1], slot: +m[2], port: +m[3] };
      section = 'state';
      continue;
    }

    if (/ONT\s+Run\s+Last/i.test(line)) {
      section = 'state';
      continue;
    }

    if (/ONT\s+SN\s+Type\s+Distance/i.test(line)) {
      section = 'detail';
      continue;
    }

    if (!currentPort) continue;

    if (section === 'state') {
      m = line.match(/^\s*(\d+)\s+(online|offline)\s+(.+?)\s+(.+?)\s+([A-Za-z0-9/_-]+|-)\s*$/i);
      if (m) {
        const ontId = +m[1];
        const key = `${currentPort.frame}-${currentPort.slot}-${currentPort.port}-${ontId}`;
        ontsByKey.set(key, {
          ...currentPort,
          ont_id: ontId,
          run_state: m[2],
        });
      }
      continue;
    }

    if (section === 'detail') {
      m = line.match(/^\s*(\d+)\s+([A-Z0-9]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/i);
      if (m) {
        const ontId = +m[1];
        const key = `${currentPort.frame}-${currentPort.slot}-${currentPort.port}-${ontId}`;
        const current = ontsByKey.get(key) || { ...currentPort, ont_id: ontId };
        current.sn = m[2];
        current.type = m[3] === '-' ? '' : m[3];
        current.distance_m = m[4] === '-' ? '' : m[4];
        if (/^-?\d+(?:\.\d+)?\/-?\d+(?:\.\d+)?$/.test(m[5])) {
          const [rxPower, txPower] = m[5].split('/');
          current.rx_power_dbm = rxPower;
          current.tx_power_dbm = txPower;
        }
        current.description = m[6].trim() === '-' ? '' : m[6].trim();
        ontsByKey.set(key, current);
      }
    }
  }

  return Array.from(ontsByKey.values());
}

export function parseServicePorts(output) {
  const ports = [];
  for (const line of output.split('\n')) {
    const m = line.match(/\s*(\d+)\s+(\d+)\s+\S+\s+gpon\s+(\d+)\/\s*(\d+)\s*\/\s*(\d+)\s+(\d+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+(\S+)/i);
    if (m) {
      ports.push({
        index: +m[1], vlan: +m[2],
        frame: +m[3], slot: +m[4], port: +m[5],
        ont_id: +m[6], gemport: +m[7], state: m[8],
      });
    }
  }
  return ports;
}

export function parseAlarms(output) {
  const alarms = [];
  for (const line of output.split('\n')) {
    const m = line.match(/\s*(\d+)\s+(Critical|Major|Minor|Warning)\s+(\S+)\s+(.*?)\s{2,}(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
    if (m) {
      alarms.push({
        seq: +m[1], severity: m[2], name: m[3],
        location: m[4].trim(), occurred_at: m[5],
      });
    }
  }
  return alarms;
}

export function parseGponPortStates(output) {
  const ports = [];
  const blocks = output
    .split(/-+\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const fsp = block.match(/F\/S\/P\s*:\s*(\d+)\/(\d+)\/(\d+)/i);
    if (!fsp) continue;

    const availableBandwidth = block.match(/Available bandwidth\(Kbps\)\s*:\s*([-\d.]+)/i)?.[1] ?? '';
    const temperature = block.match(/Temperature\(C\)\s*:\s*([-\d.]+)/i)?.[1] ?? '';
    const txPower = block.match(/TX power\(dBm\)\s*:\s*([-\d.]+)/i)?.[1] ?? '';
    const opticalModuleStatus = block.match(/Optical Module status\s*:\s*(.+)/i)?.[1]?.trim() ?? '';
    const portState = block.match(/Port state\s*:\s*(.+)/i)?.[1]?.trim() ?? '';
    const laserState = block.match(/Laser state\s*:\s*(.+)/i)?.[1]?.trim() ?? '';
    const txBiasCurrent = block.match(/TX Bias current\(mA\)\s*:\s*([-\d.]+)/i)?.[1] ?? '';
    const supplyVoltage = block.match(/Supply Voltage\(V\)\s*:\s*([-\d.]+)/i)?.[1] ?? '';

    ports.push({
      frame: Number(fsp[1]),
      slot: Number(fsp[2]),
      port: Number(fsp[3]),
      optical_module_status: opticalModuleStatus,
      port_state: portState,
      laser_state: laserState,
      available_bandwidth_kbps: availableBandwidth,
      temperature_c: temperature,
      tx_bias_current_ma: txBiasCurrent,
      supply_voltage_v: supplyVoltage,
      tx_power_dbm: txPower,
    });
  }

  return ports;
}

export function parseSysUptime(output) {
  const days    = Number(output.match(/(\d+)\s*day/i)?.[1]    ?? 0);
  const hours   = Number(output.match(/(\d+)\s*hour/i)?.[1]   ?? 0);
  const minutes = Number(output.match(/(\d+)\s*minute/i)?.[1] ?? 0);
  const seconds = Number(output.match(/(\d+)\s*second/i)?.[1] ?? 0);
  if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) return null;
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

export function parseTemperatureAll(output) {
  const results = [];
  let headerPassed = false;

  for (const line of output.split('\n')) {
    if (/^-+/.test(line.trim())) { headerPassed = true; continue; }
    if (!headerPassed) continue;

    const m = line.match(/^\s*(\d+)\s+(\S+)\s+([-\d]+)\s+(\S+)/);
    if (m) {
      const temp = Number(m[3]);
      if (Number.isFinite(temp) && temp > -50 && temp < 200) {
        results.push({ slot: Number(m[1]), board: m[2], temperature_c: temp, state: m[4] });
      }
    }
  }

  if (results.length === 0) {
    const m = output.match(/Temperature\s*[:(]\s*([-\d]+)\s*(?:C|°C)?/i);
    if (m) {
      const temp = Number(m[1]);
      if (Number.isFinite(temp) && temp > -50 && temp < 200) {
        results.push({ slot: 0, board: '', temperature_c: temp, state: '' });
      }
    }
  }

  return results;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
