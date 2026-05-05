import * as cmd from './commands.js';
import * as v from './validator.js';
import {
  createTemplateBinding,
  createTemplateCatalogItem,
  deleteTemplateBinding,
  deleteTemplateCatalogItem,
  findOverlappingBinding,
  getProvisionTemplate,
  getTemplateBinding,
  getTemplateCatalogItem,
  listProvisionTemplates,
  listTemplateBindings,
  listTemplateCatalog,
  updateTemplateBinding,
  updateTemplateCatalogItem,
} from './provisionTemplates.js';
import { writeAudit } from '../audit/routes.js';

export default async function oltRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] };

  function normalizeTemplatePayload(body = {}) {
    const name = String(body.name ?? '').trim();
    if (!name) {
      throw Object.assign(new Error('Nome do template é obrigatório'), { statusCode: 422 });
    }

    const description = String(body.description ?? '').trim();
    const vlanId = body.vlan_id == null || body.vlan_id === '' ? null : v.validateVlan(body.vlan_id, 'VLAN');
    const gemport = v.validateGemport(body.gemport ?? 0);

    const lineprofileMode = body.lineprofile_mode === 'same_as_vlan' ? 'same_as_vlan' : 'fixed';
    const srvprofileMode = body.srvprofile_mode === 'same_as_vlan' ? 'same_as_vlan' : 'fixed';
    const userVlanMode = body.user_vlan_mode === 'fixed' ? 'fixed' : 'same_as_vlan';

    const lineprofileId = lineprofileMode === 'same_as_vlan'
      ? null
      : v.validateProfileId(body.lineprofile_id, 'Line Profile');
    const srvprofileId = srvprofileMode === 'same_as_vlan'
      ? null
      : v.validateProfileId(body.srvprofile_id, 'Service Profile');
    const userVlan = userVlanMode === 'same_as_vlan'
      ? null
      : v.validateVlan(body.user_vlan, 'User VLAN');

    if ((lineprofileMode === 'same_as_vlan' || srvprofileMode === 'same_as_vlan' || userVlanMode === 'same_as_vlan') && vlanId == null) {
      throw Object.assign(new Error('VLAN é obrigatória quando algum campo herda da VLAN'), { statusCode: 422 });
    }

    return {
      name,
      description,
      lineprofile_mode: lineprofileMode,
      lineprofile_id: lineprofileId,
      srvprofile_mode: srvprofileMode,
      srvprofile_id: srvprofileId,
      gemport,
      vlan_id: vlanId,
      user_vlan_mode: userVlanMode,
      user_vlan: userVlan,
    };
  }

  function normalizeBindingPayload(body = {}) {
    const slot = v.validateSlot(body.slot ?? 1);
    const ponStart = v.validatePort(body.pon_start);
    const ponEnd = v.validatePort(body.pon_end);
    const templateId = Number(body.template_id);

    if (!Number.isInteger(templateId) || templateId < 1) {
      throw Object.assign(new Error('Template inválido para vínculo'), { statusCode: 422 });
    }

    if (ponEnd < ponStart) {
      throw Object.assign(new Error('PON final deve ser maior ou igual à inicial'), { statusCode: 422 });
    }

    if (!getTemplateCatalogItem(templateId)) {
      throw Object.assign(new Error('Template selecionado não existe'), { statusCode: 404 });
    }

    return {
      slot,
      pon_start: ponStart,
      pon_end: ponEnd,
      template_id: templateId,
    };
  }

  // ── Status / Versão ────────────────────────────────────────────────────────
  fastify.get('/status', auth, async () => {
    const { ok, output } = await cmd.getStatus();
    return { connected: ok, message: output };
  });

  fastify.get('/version', auth, async () => {
    return { output: await cmd.getVersion() };
  });

  fastify.get('/dashboard-summary', auth, async () => {
    return cmd.getDashboardSummary();
  });

  fastify.get('/provision-template', auth, async (req) => {
    const port = v.validatePort(req.query.port);
    const slot = v.validateSlot(req.query.slot ?? 1);
    return getProvisionTemplate(port, slot);
  });

  fastify.get('/provision-templates', auth, async (req) => {
    const slot = v.validateSlot(req.query.slot ?? 1);
    return { templates: listProvisionTemplates(slot) };
  });

  fastify.get('/template-catalog', auth, async () => {
    return { templates: listTemplateCatalog() };
  });

  fastify.post('/template-catalog', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const payload = normalizeTemplatePayload(req.body ?? {});
    const created = createTemplateCatalogItem(payload);
    writeAudit(req.user.sub, 'create_template_catalog', `template=${created?.name ?? payload.name}`, true);
    return reply.code(201).send(created);
  });

  fastify.put('/template-catalog/:id', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!getTemplateCatalogItem(id)) {
      return reply.code(404).send({ detail: 'Template não encontrado' });
    }

    const payload = normalizeTemplatePayload(req.body ?? {});
    const updated = updateTemplateCatalogItem(id, payload);
    writeAudit(req.user.sub, 'update_template_catalog', `template_id=${id} template=${updated?.name ?? payload.name}`, true);
    return reply.code(200).send(updated);
  });

  fastify.delete('/template-catalog/:id', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const id = Number(req.params.id);
    const existing = getTemplateCatalogItem(id);
    if (!existing) {
      return reply.code(404).send({ detail: 'Template não encontrado' });
    }

    try {
      deleteTemplateCatalogItem(id);
    } catch {
      return reply.code(409).send({ detail: 'Template está vinculado a alguma PON e não pode ser excluído agora' });
    }

    writeAudit(req.user.sub, 'delete_template_catalog', `template_id=${id} template=${existing.name}`, true);
    return reply.code(204).send();
  });

  fastify.get('/template-bindings', auth, async () => {
    return { bindings: listTemplateBindings() };
  });

  fastify.post('/template-bindings', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const payload = normalizeBindingPayload(req.body ?? {});
    const overlap = findOverlappingBinding(payload);
    if (overlap) {
      return reply.code(409).send({ detail: `Já existe um vínculo cobrindo 0/${payload.slot}/${payload.pon_start}-${payload.pon_end}` });
    }

    const created = createTemplateBinding(payload);
    writeAudit(req.user.sub, 'create_template_binding', `slot=${payload.slot} pon=${payload.pon_start}-${payload.pon_end} template_id=${payload.template_id}`, true);
    return reply.code(201).send(created);
  });

  fastify.put('/template-bindings/:id', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!getTemplateBinding(id)) {
      return reply.code(404).send({ detail: 'Vínculo não encontrado' });
    }

    const payload = normalizeBindingPayload(req.body ?? {});
    const overlap = findOverlappingBinding({ ...payload, excludeId: id });
    if (overlap) {
      return reply.code(409).send({ detail: `Já existe um vínculo cobrindo 0/${payload.slot}/${payload.pon_start}-${payload.pon_end}` });
    }

    const updated = updateTemplateBinding(id, payload);
    writeAudit(req.user.sub, 'update_template_binding', `binding_id=${id} slot=${payload.slot} pon=${payload.pon_start}-${payload.pon_end} template_id=${payload.template_id}`, true);
    return reply.code(200).send(updated);
  });

  fastify.delete('/template-bindings/:id', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const id = Number(req.params.id);
    const existing = getTemplateBinding(id);
    if (!existing) {
      return reply.code(404).send({ detail: 'Vínculo não encontrado' });
    }

    deleteTemplateBinding(id);
    writeAudit(req.user.sub, 'delete_template_binding', `binding_id=${id} slot=${existing.slot} pon=${existing.pon_start}-${existing.pon_end}`, true);
    return reply.code(204).send();
  });

  // ── Boards ─────────────────────────────────────────────────────────────────
  fastify.get('/boards', auth, async () => cmd.getBoards());

  // ── Alarmes ────────────────────────────────────────────────────────────────
  fastify.get('/alarms', auth, async () => {
    const r = await cmd.getAlarms();
    return { ...r, total: r.alarms.length };
  });

  // ── Autofind ───────────────────────────────────────────────────────────────
  fastify.get('/autofind', auth, async () => {
    const r = await cmd.getAutofind();
    return { ...r, total: r.onts.length };
  });

  // ── ONTs ───────────────────────────────────────────────────────────────────
  fastify.get('/onts', auth, async (req) => {
    const { slot, port } = req.query;
    const r = await cmd.getOntList(slot != null ? Number(slot) : undefined, port != null ? Number(port) : undefined);
    return { ...r, total: r.onts.length };
  });

  fastify.get('/onts/:slot/:port/:ontId', auth, async (req, reply) => {
    const { slot, port, ontId } = req.params;
    v.validateSlot(slot); v.validatePort(port); v.validateOntId(ontId);
    return cmd.getOntDetailSnapshot(+slot, +port, +ontId);
  });

  fastify.get('/onts/:slot/:port/:ontId/wan', auth, async (req) => {
    const { slot, port, ontId } = req.params;
    v.validateSlot(slot); v.validatePort(port); v.validateOntId(ontId);
    return { output: await cmd.getOntWan(+slot, +port, +ontId) };
  });

  fastify.get('/onts/:slot/:port/:ontId/optical', auth, async (req) => {
    const { slot, port, ontId } = req.params;
    v.validateSlot(slot); v.validatePort(port); v.validateOntId(ontId);
    const result = await cmd.getOntOptical(+slot, +port, +ontId);
    return result;
  });

  fastify.get('/onts/:slot/:port/:ontId/version', auth, async (req) => {
    const { slot, port, ontId } = req.params;
    return { output: await cmd.getOntVersion(+slot, +port, +ontId) };
  });

  // ── Provisionar ────────────────────────────────────────────────────────────
  fastify.post('/provision', auth, async (req, reply) => {
    const b = req.body;
    const slot         = v.validateSlot(b.slot);
    const port         = v.validatePort(b.port);
    const sn           = v.validateSN(b.sn);
    const lineprofileId = v.validateProfileId(b.lineprofile_id, 'Lineprofile ID');
    const srvprofileId  = v.validateProfileId(b.srvprofile_id,  'Srvprofile ID');
    const description  = v.validateDescription(b.description);
    const vlanId       = v.validateVlan(b.vlan_id,   'VLAN');
    const userVlan     = v.validateVlan(b.user_vlan,  'User VLAN');
    const gemport      = v.validateGemport(b.gemport ?? 0);

    const detail = `SN=${sn} 0/${slot}/${port} lp=${lineprofileId} sp=${srvprofileId} vlan=${vlanId}`;

    const { raw: rawProv, ontId } = await cmd.provisionOnt({ slot, port, sn, lineprofileId, srvprofileId, description });
    if (!ontId) {
      writeAudit(req.user.sub, 'provision_ont', detail, false);
      return reply.code(500).send({ detail: `ONT não registrada. Output da OLT:\n${rawProv}` });
    }

    const rawNative = await cmd.configureOntNativeVlan({ slot, port, ontId, userVlan });
    const rawSp = await cmd.addServicePort({ vlanId, slot, port, ontId, gemport, userVlan });
    cmd.clearOltCache();
    writeAudit(req.user.sub, 'provision_ont', detail + ` ont_id=${ontId}`, true);
    return { success: true, ont_id: ontId, raw: { provision: rawProv, native_vlan: rawNative, service_port: rawSp } };
  });

  // ── Service Port ───────────────────────────────────────────────────────────
  fastify.post('/service-port', auth, async (req) => {
    const b = req.body;
    const slot   = v.validateSlot(b.slot);
    const port   = v.validatePort(b.port);
    const ontId  = v.validateOntId(b.ont_id);
    const vlanId = v.validateVlan(b.vlan_id,  'VLAN');
    const uVlan  = v.validateVlan(b.user_vlan,'User VLAN');
    const gem    = v.validateGemport(b.gemport ?? 0);
    const detail = `0/${slot}/${port} ont=${ontId} vlan=${vlanId}`;
    const raw    = await cmd.addServicePort({ vlanId, slot, port, ontId, gemport: gem, userVlan: uVlan });
    cmd.clearOltCache();
    writeAudit(req.user.sub, 'add_service_port', detail, true);
    return { success: true, raw };
  });

  fastify.delete('/service-port/:index', auth, async (req) => {
    const index = Number(req.params.index);
    const raw = await cmd.deleteServicePort(index);
    cmd.clearOltCache();
    writeAudit(req.user.sub, 'delete_service_port', `index=${index}`, true);
    return { success: true, raw };
  });

  // ── Deletar ONT ────────────────────────────────────────────────────────────
  fastify.delete('/onts/:slot/:port/:ontId', auth, async (req) => {
    const { slot, port, ontId } = req.params;
    v.validateSlot(slot); v.validatePort(port); v.validateOntId(ontId);
    const raw = await cmd.deleteOnt(+slot, +port, +ontId);
    cmd.clearOltCache();
    writeAudit(req.user.sub, 'delete_ont', `0/${slot}/${port}/${ontId}`, true);
    return { success: true, raw };
  });

  // ── Reboot ONT ─────────────────────────────────────────────────────────────
  fastify.post('/onts/:slot/:port/:ontId/reboot', auth, async (req) => {
    const { slot, port, ontId } = req.params;
    v.validateSlot(slot); v.validatePort(port); v.validateOntId(ontId);
    const raw = await cmd.rebootOnt(+slot, +port, +ontId);
    cmd.clearOltCache();
    writeAudit(req.user.sub, 'reboot_ont', `0/${slot}/${port}/${ontId}`, true);
    return { success: true, raw };
  });
}
