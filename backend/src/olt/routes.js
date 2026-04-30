import * as cmd from './commands.js';
import * as v from './validator.js';
import { getProvisionTemplate } from './provisionTemplates.js';
import { writeAudit } from '../audit/routes.js';

export default async function oltRoutes(fastify) {
  const auth = { onRequest: [fastify.authenticate] };

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
    return getProvisionTemplate(port);
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
