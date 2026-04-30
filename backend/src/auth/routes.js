import bcrypt from 'bcryptjs';
import db from '../db.js';

export default async function authRoutes(fastify) {
  // ── Login ──────────────────────────────────────────────────────────────────
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.hashed_password))
      return reply.code(401).send({ detail: 'Usuário ou senha inválidos' });
    if (!user.is_active)
      return reply.code(403).send({ detail: 'Conta desativada' });

    const token = fastify.jwt.sign(
      { sub: user.username, is_admin: !!user.is_admin },
      { expiresIn: `${fastify.config.TOKEN_EXPIRE_HOURS}h` }
    );
    return { access_token: token, token_type: 'bearer', username: user.username, full_name: user.full_name, is_admin: !!user.is_admin };
  });

  // ── Me ─────────────────────────────────────────────────────────────────────
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req) => {
    const user = db.prepare('SELECT id,username,full_name,is_active,is_admin FROM users WHERE username=?').get(req.user.sub);
    if (!user) return fastify.httpErrors?.notFound?.() ?? { statusCode: 404 };
    return { ...user, is_active: !!user.is_active, is_admin: !!user.is_admin };
  });

  // ── Listar usuários (admin) ─────────────────────────────────────────────────
  fastify.get('/users', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async () => {
    return db.prepare('SELECT id,username,full_name,is_active,is_admin,created_at FROM users ORDER BY id').all()
      .map(u => ({ ...u, is_active: !!u.is_active, is_admin: !!u.is_admin }));
  });

  // ── Criar usuário (admin) ──────────────────────────────────────────────────
  fastify.post('/users', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const { username, full_name, password, is_admin = false } = req.body ?? {};
    if (!username || !full_name || !password) return reply.code(400).send({ detail: 'username, full_name e password são obrigatórios' });
    if (password.length < 6) return reply.code(400).send({ detail: 'Senha deve ter pelo menos 6 caracteres' });
    if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) return reply.code(400).send({ detail: 'Usuário já existe' });

    const info = db.prepare('INSERT INTO users (username,full_name,hashed_password,is_admin) VALUES (?,?,?,?)')
      .run(username, full_name, bcrypt.hashSync(password, 10), is_admin ? 1 : 0);
    const user = db.prepare('SELECT id,username,full_name,is_active,is_admin FROM users WHERE id=?').get(info.lastInsertRowid);
    return reply.code(201).send({ ...user, is_active: !!user.is_active, is_admin: !!user.is_admin });
  });

  // ── Toggle ativo/inativo (admin) ───────────────────────────────────────────
  fastify.put('/users/:id/toggle', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
    if (!user) return reply.code(404).send({ detail: 'Usuário não encontrado' });
    if (user.username === req.user.sub) return reply.code(400).send({ detail: 'Não é possível desativar o próprio usuário' });
    db.prepare('UPDATE users SET is_active=? WHERE id=?').run(user.is_active ? 0 : 1, user.id);
    const updated = db.prepare('SELECT id,username,full_name,is_active,is_admin FROM users WHERE id=?').get(user.id);
    return { ...updated, is_active: !!updated.is_active, is_admin: !!updated.is_admin };
  });

  // ── Excluir usuário (admin) ────────────────────────────────────────────────
  fastify.delete('/users/:id', { onRequest: [fastify.authenticate, fastify.requireAdmin] }, async (req, reply) => {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
    if (!user) return reply.code(404).send({ detail: 'Usuário não encontrado' });
    if (user.username === req.user.sub) return reply.code(400).send({ detail: 'Não é possível excluir o próprio usuário' });
    db.prepare('DELETE FROM users WHERE id=?').run(user.id);
    return reply.code(204).send();
  });

  // ── Trocar senha ───────────────────────────────────────────────────────────
  fastify.post('/change-password', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { current_password, new_password } = req.body ?? {};
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(req.user.sub);
    if (!bcrypt.compareSync(current_password, user.hashed_password))
      return reply.code(400).send({ detail: 'Senha atual incorreta' });
    if (!new_password || new_password.length < 6)
      return reply.code(400).send({ detail: 'A nova senha deve ter pelo menos 6 caracteres' });
    db.prepare('UPDATE users SET hashed_password=? WHERE id=?').run(bcrypt.hashSync(new_password, 10), user.id);
    return reply.code(204).send();
  });
}
