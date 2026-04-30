import db from '../db.js';

export default async function auditRoutes(fastify) {
  fastify.get('/logs', { onRequest: [fastify.authenticate] }, async (req) => {
    const { limit = 200, offset = 0, username, action } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (username) { sql += ' AND username=?'; params.push(username); }
    if (action)   { sql += ' AND action=?';   params.push(action); }
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(Math.min(Number(limit), 500), Number(offset));
    return db.prepare(sql).all(...params);
  });
}

// Helper usado pelas outras rotas
export function writeAudit(username, action, detail, success = true) {
  db.prepare('INSERT INTO audit_logs (username,action,detail,success) VALUES (?,?,?,?)')
    .run(username, action, detail, success ? 1 : 0);
}
