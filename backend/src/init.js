import db from './db.js';
import bcrypt from 'bcryptjs';

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existing) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, full_name, hashed_password, is_admin)
    VALUES (?, ?, ?, 1)
  `).run('admin', 'Administrador', hash);
  console.log('✓ Usuário admin criado  →  senha: admin123');
  console.log('  IMPORTANTE: troque a senha após o primeiro login!');
} else {
  console.log('✓ Banco já inicializado');
}
