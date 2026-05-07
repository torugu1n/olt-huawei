export interface User {
  id: number;
  username: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_readonly: boolean;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  username: string;
  full_name: string;
  is_admin: boolean;
  is_readonly: boolean;
}

export interface Board {
  slot: number;
  board_name: string;
  status: string;
  sub_type: string;
  online_state: string;
}

export interface AutofindONT {
  frame: number;
  slot: number;
  port: number;
  sn: string;
  vendor_id: string;
  equipment_id: string;
  found_at: string;
  template_id?: number | null;
  template_name?: string | null;
  template_vlan_id?: number | null;
  template_auto_matched?: boolean;
  template_lineprofile_id?: number | null;
  template_srvprofile_id?: number | null;
  template_user_vlan?: number | null;
  template_gemport?: number | null;
}

export interface ONT {
  frame?: number;
  slot?: number;
  port?: number;
  ont_id?: number;
  sn?: string;
  description?: string;
  run_state?: string;
  config_state?: string;
  control_flag?: string;
  match_state?: string;
  lineprofile_id?: number | string;
  lineprofile_name?: string;
  srvprofile_id?: number | string;
  srvprofile_name?: string;
  distance_m?: string;
  management_mode?: string;
  software_work_mode?: string;
  isolation_state?: string;
  authentic_type?: string;
  dba_type?: string;
  battery_state?: string;
  power_type?: string;
  memory_occupation?: string;
  cpu_occupation?: string;
  temperature?: string;
  last_down_cause?: string;
  last_up_time?: string;
  last_down_time?: string;
  last_dying_gasp_time?: string;
  last_restart_reason?: string;
  online_duration?: string;
  system_up_duration?: string;
  type_c_support?: string;
  interoperability_mode?: string;
  power_reduction_status?: string;
  fec_upstream_state?: string;
  voip_configure_method?: string;
  fec_upstream_switch?: string;
  omcc_encrypt_switch?: string;
  qos_mode?: string;
  mapping_mode?: string;
  tr069_management?: string;
  tr069_ip_index?: string;
  alarm_policy_profile_id?: string;
  alarm_policy_profile_name?: string;
}

export interface OpticalInfo {
  rx_power_dbm?: string;
  tx_power_dbm?: string;
  olt_rx_power_dbm?: string;
  laser_bias_ma?: string;
  temperature_c?: string;
  voltage_v?: string;
}

export interface ServicePort {
  index: number;
  vlan: number;
  frame: number;
  slot: number;
  port: number;
  ont_id: number;
  gemport: number;
  state: string;
}

export interface Alarm {
  seq: number;
  severity: "Critical" | "Major" | "Minor" | "Warning";
  name: string;
  location: string;
  occurred_at: string;
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  detail: string | null;
  success: boolean;
  timestamp: string;
}

export interface OltLog {
  id: number;
  source: string;
  level: "info" | "warning" | "error" | string;
  message: string;
  detail: string | null;
  raw_output?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface ProvisionForm {
  slot: number;
  port: number;
  sn: string;
  lineprofile_id: number;
  srvprofile_id: number;
  description: string;
  vlan_id: number;
  user_vlan: number;
  gemport: number;
}

export interface DashboardSummary {
  status: {
    connected: boolean;
    message: string;
  };
  boards: Board[];
  alarms: Alarm[];
  autofind: AutofindONT[];
  recent_logs?: OltLog[];
  gpon_ports?: Array<{
    frame: number;
    slot: number;
    port: number;
    optical_module_status: string;
    port_state: string;
    laser_state: string;
    available_bandwidth_kbps: string;
    temperature_c: string;
    tx_bias_current_ma: string;
    supply_voltage_v: string;
    tx_power_dbm: string;
    if_name?: string;
    if_descr?: string;
    if_alias?: string;
    in_bps?: number;
    out_bps?: number;
  }>;
  onts_total: number;
  onts_online: number;
  metrics?: {
    gpon_ports_total: number;
    gpon_ports_online: number;
    avg_port_temperature_c: number | null;
    max_port_temperature_c: number | null;
    total_available_bandwidth_gbps: number | null;
    avg_port_tx_power_dbm: number | null;
    boards_active: number;
    boards_faulty: number;
    cpu_percent?: number | null;
    memory_percent?: number | null;
    avg_temperature_c?: number | null;
    total_uplink_in_gbps?: number | null;
    total_uplink_out_gbps?: number | null;
    olt_uptime_seconds?: number | null;
  };
}

export interface ProvisionTemplate {
  port: number;
  slot: number;
  template_id: number | null;
  template_name: string | null;
  lineprofile_id: number | null;
  srvprofile_id: number | null;
  gemport: number;
  vlan_id: number | null;
  user_vlan: number | null;
  auto_matched: boolean;
  source: string;
  description?: string;
  lineprofile_mode?: "fixed" | "same_as_vlan";
  srvprofile_mode?: "fixed" | "same_as_vlan";
  user_vlan_mode?: "fixed" | "same_as_vlan";
}

export interface TemplateCatalogItem {
  id: number;
  name: string;
  description: string;
  lineprofile_mode: "fixed" | "same_as_vlan";
  lineprofile_id: number | null;
  srvprofile_mode: "fixed" | "same_as_vlan";
  srvprofile_id: number | null;
  gemport: number;
  vlan_id: number | null;
  user_vlan_mode: "fixed" | "same_as_vlan";
  user_vlan: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateBinding {
  id: number;
  slot: number;
  pon_start: number;
  pon_end: number;
  template_id: number;
  template_name: string;
  template_description: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  OLT_HOST: string;
  OLT_PORT: number;
  OLT_USERNAME: string;
  OLT_PASSWORD: string;
  OLT_ENABLE_PASSWORD: string;
  OLT_NAME: string;
  OLT_TIMEOUT: number;
  OLT_SESSION_BOOTSTRAP_COMMANDS: string;
}
