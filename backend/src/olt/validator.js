export function validateSN(sn) {
  const v = sn.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}[0-9A-F]{8}$/.test(v))
    throw Object.assign(new Error(`Serial Number inválido: "${v}". Formato: 4 chars + 8 hex (ex: HWTC1A2B3C4D)`), { statusCode: 422 });
  return v;
}

export function validateVlan(vlan, name = 'VLAN') {
  const v = Number(vlan);
  if (!Number.isInteger(v) || v < 1 || v > 4094)
    throw Object.assign(new Error(`${name} inválida: ${vlan}. Deve ser entre 1 e 4094`), { statusCode: 422 });
  return v;
}

export function validateSlot(slot) {
  const v = Number(slot);
  if (!Number.isInteger(v) || v < 0 || v > 19)
    throw Object.assign(new Error(`Slot inválido: ${slot}. Deve ser entre 0 e 19`), { statusCode: 422 });
  return v;
}

export function validatePort(port) {
  const v = Number(port);
  if (!Number.isInteger(v) || v < 0 || v > 15)
    throw Object.assign(new Error(`Porta inválida: ${port}. Deve ser entre 0 e 15`), { statusCode: 422 });
  return v;
}

export function validateOntId(ontId) {
  const v = Number(ontId);
  if (!Number.isInteger(v) || v < 0 || v > 127)
    throw Object.assign(new Error(`ONT ID inválido: ${ontId}. Deve ser entre 0 e 127`), { statusCode: 422 });
  return v;
}

export function validateGemport(gemport) {
  const v = Number(gemport);
  if (!Number.isInteger(v) || v < 0 || v > 7)
    throw Object.assign(new Error(`GEM Port inválido: ${gemport}. Deve ser entre 0 e 7`), { statusCode: 422 });
  return v;
}

export function validateProfileId(id, name = 'Profile') {
  const v = Number(id);
  if (!Number.isInteger(v) || v < 1 || v > 1023)
    throw Object.assign(new Error(`${name} inválido: ${id}. Deve ser entre 1 e 1023`), { statusCode: 422 });
  return v;
}

export function validateDescription(desc) {
  const v = String(desc).trim();
  if (v.length > 64)
    throw Object.assign(new Error('Descrição muito longa (máx 64 caracteres)'), { statusCode: 422 });
  if (!/^[A-Za-z0-9\-_. ]+$/.test(v))
    throw Object.assign(new Error('Descrição contém caracteres inválidos. Use letras, números, espaço, hífen e underscore'), { statusCode: 422 });
  return v;
}
