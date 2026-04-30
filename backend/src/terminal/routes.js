import { openShellForTerminal } from '../olt/ssh.js';

const BLOCKED = ['reboot', 'reset system', 'factory-reset', 'delete flash', 'format flash'];
const isDangerous = (txt) => BLOCKED.some(p => txt.toLowerCase().includes(p));

export default async function terminalRoutes(fastify) {
  fastify.get('/terminal/ws', { websocket: true }, async (socket, req) => {
    // Valida token via query param
    const token = req.query.token;
    if (!token) { socket.close(1008, 'Sem token'); return; }

    let payload;
    try { payload = fastify.jwt.verify(token); }
    catch { socket.close(1008, 'Token inválido'); return; }

    fastify.log.info(`Terminal aberto por ${payload.sub}`);

    let sshStream = null;
    let sshClient = null;

    const send = (txt) => {
      if (socket.readyState === 1) socket.send(txt);
    };

    try {
      const { stream, client } = await openShellForTerminal();
      sshStream = stream;
      sshClient = client;

      send(`\r\n[Conectado à OLT — ${req.server.config.OLT_NAME} (${req.server.config.OLT_HOST})]\r\n`);

      stream.on('data', (data) => send(data.toString('utf8')));
      stream.on('close', () => { send('\r\n[Sessão SSH encerrada]\r\n'); socket.close(); });
      stream.stderr?.on('data', (d) => send(d.toString('utf8')));

      socket.on('message', (data) => {
        const txt = data.toString();
        if (isDangerous(txt)) {
          send('\r\n[BLOQUEADO] Comando não permitido via terminal web.\r\n');
          return;
        }
        if (stream.writable) stream.write(txt);
      });

      socket.on('close', () => {
        stream.end();
        client.end();
        fastify.log.info(`Terminal fechado por ${payload.sub}`);
      });

    } catch (err) {
      send(`\r\n[ERRO] Não foi possível abrir sessão SSH: ${err.message}\r\n`);
      socket.close();
    }
  });
}
