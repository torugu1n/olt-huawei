export interface ProvisionTemplate {
  slot: number;
  lineprofile_id: number;
  srvprofile_id: number;
  gemport: number;
  vlan_id: number | null;
  user_vlan: number | null;
  auto_matched: boolean;
}

const DEFAULT_TEMPLATE: ProvisionTemplate = {
  slot: 1,
  lineprofile_id: 20,
  srvprofile_id: 20,
  gemport: 6,
  vlan_id: null,
  user_vlan: null,
  auto_matched: false,
};

const PON_VLAN_BY_PORT: Record<string, number> = {
  "0": 20,
  "1": 20,
  "2": 20,
  "3": 30,
  "4": 30,
  "5": 40,
  "6": 40,
  "7": 50,
  "8": 50,
  "9": 60,
  "10": 60,
  "11": 70,
  "12": 70,
  "13": 80,
  "14": 80,
};

export function getProvisionTemplate(port: number): ProvisionTemplate {
  const vlan = PON_VLAN_BY_PORT[String(port)];
  return {
    ...DEFAULT_TEMPLATE,
    vlan_id: vlan ?? null,
    user_vlan: vlan ?? null,
    auto_matched: vlan != null,
  };
}
