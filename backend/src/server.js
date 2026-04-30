import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import Fastify from 'fastify';
import fastifyCors    from '@fastify/cors';
import fastifyJwt     from '@fastify/jwt';
import fastifyStatic  from '@fastify/static';
import fastifyWs      from '@fastify/websocket';
import config         from './config.js';
import authRoutes     from './auth/routes.js';
import auditRoutes    from './audit/routes.js';
import oltRoutes      from './olt/routes.js';
import { warmupPersistentSession } from './olt/ssh.js';
import terminalRoutes from './terminal/routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: { level: 'info' } });

// Expõe o config nas rotas
app.decorate('config', config);

// Plugins
await app.register(fastifyCors, { origin: '*' });
await app.register(fastifyJwt, { secret: config.SECRET_KEY });
await app.register(fastifyWs);

// Decorators de autenticação
app.decorate('authenticate', async function (req, reply) {
  try { await req.jwtVerify(); }
  catch { reply.code(401).send({ detail: 'Token inválido ou expirado' }); }
});

app.decorate('requireAdmin', async function (req, reply) {
  if (!req.user?.is_admin)
    reply.code(403).send({ detail: 'Acesso restrito a administradores' });
});

// Tratamento global de erros de validação
app.setErrorHandler((err, req, reply) => {
  const code = err.statusCode ?? 500;
  app.log.error(err);
  reply.code(code).send({ detail: err.message });
});

// Rotas da API
await app.register(authRoutes,     { prefix: '/api/auth' });
await app.register(auditRoutes,    { prefix: '/api/audit' });
await app.register(oltRoutes,      { prefix: '/api/olt' });
await app.register(terminalRoutes);

// Serve o frontend compilado (se existir)
const distDir = join(__dirname, '../../frontend/dist');
if (existsSync(distDir)) {
  await app.register(fastifyStatic, { root: distDir, prefix: '/' });
  app.setNotFoundHandler((req, reply) => {
    reply.sendFile('index.html');
  });
}

// Inicia
await app.listen({ port: config.PORT, host: '0.0.0.0' });
console.log(`\n  OLT Manager rodando em  http://0.0.0.0:${config.PORT}\n`);

void warmupPersistentSession();
