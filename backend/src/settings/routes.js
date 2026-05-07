import { getSafeAppSettings, saveAppSettings } from './service.js';
import { resetPersistentSession } from '../olt/ssh.js';

export default async function settingsRoutes(fastify) {
  fastify.get('/', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async () => {
    return getSafeAppSettings();
  });

  fastify.put('/', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req) => {
    const saved = saveAppSettings(req.body ?? {});
    resetPersistentSession();
    return {
      ...saved,
      OLT_PASSWORD: saved.OLT_PASSWORD ? '********' : '',
      OLT_ENABLE_PASSWORD: saved.OLT_ENABLE_PASSWORD ? '********' : '',
    };
  });
}
