import db from './db.js';

const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
if (count === 0) {
  console.log('✓ Banco inicializado — nenhum usuário encontrado.');
  console.log('  Acesse a aplicação no navegador para criar a conta admin.');
} else {
  console.log(`✓ Banco inicializado — ${count} usuário(s) registrado(s).`);
}
