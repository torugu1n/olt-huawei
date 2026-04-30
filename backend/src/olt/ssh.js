/**
 * Cliente SSH persistente para OLT Huawei MA5800-X.
 *
 * Mantém uma única sessão shell aberta e serializa os comandos via fila
 * (mutex simples). Reconecta automaticamente se a sessão cair.
 */
import { Client } from 'ssh2';
import config from '../config.js';

// Prompt VRP: considera apenas a ultima linha para evitar falsos positivos no meio do output.
const PROMPT_RE = /(?:^|\r?\n)[^\r\n]*[>#]\s*$/;
const PROMPT_PRIV = /(?:^|\r?\n)[^\r\n]*#\s*$/;
const CONTINUE_RE = /(?:\{[^{}\r\n]*<cr>[^{}\r\n]*\}:|---- More[\s\S]*|More \( Press 'Q' to break \)|Configuration console time out, please retry to log on)\s*$/i;
const PASSWORD_RE = /password\s*:?$/i;

// ── Mutex simples ─────────────────────────────────────────────────────────────
class Mutex {
  #queue = Promise.resolve();
  acquire() {
    let release;
    const next = new Promise(r => (release = r));
    const prev = this.#queue;
    this.#queue = next;
    return prev.then(() => release);
  }
}

// ── Sessão shell ──────────────────────────────────────────────────────────────
class OLTSession {
  #stream;
  #buffer = '';
  #waiter = null; // { resolve, pattern, timer }

  constructor(stream) {
    this.#stream = stream;
    stream.on('data', data => {
      this.#buffer += data.toString('utf8');
      this.#check();
    });
    stream.on('close', () => { this.closed = true; });
    this.closed = false;
  }

  #check() {
    if (!this.#waiter) return;
    const { pattern, resolve, timer } = this.#waiter;
    if (pattern.test(this.#buffer)) {
      clearTimeout(timer);
      const out = this.#buffer;
      this.#buffer = '';
      this.#waiter = null;
      resolve(out);
    }
  }

  waitFor(pattern, ms = 20_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const out = this.#buffer;
        this.#buffer = '';
        this.#waiter = null;
        reject(new Error(`SSH prompt timeout after ${ms}ms.\nPartial output:\n${sanitizeOutput(out)}`));
      }, ms);
      this.#waiter = { pattern, resolve, timer, reject };
      this.#check();                    // verifica imediatamente
    });
  }

  write(text) { this.#stream.write(text); }

  async sendLine(cmd, ms = 25_000) {
    this.#buffer = '';
    this.#stream.write(cmd + '\n');
    let raw = '';
    const deadline = Date.now() + ms;

    while (true) {
      const remaining = Math.max(1, deadline - Date.now());
      const chunk = await this.waitForAny([PROMPT_RE, CONTINUE_RE], remaining);
      raw += chunk;

      if (CONTINUE_RE.test(chunk)) {
        this.#buffer = '';
        this.#stream.write('\n');
        continue;
      }

      return cleanOutput(raw, cmd);
    }
  }

  async waitForAny(patterns, ms = 20_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const out = this.#buffer;
        this.#buffer = '';
        this.#waiter = null;
        reject(new Error(`SSH prompt timeout after ${ms}ms.\nPartial output:\n${sanitizeOutput(out)}`));
      }, ms);

      const wrapped = {
        test: (buffer) => patterns.some(pattern => pattern.test(buffer)),
      };

      this.#waiter = {
        pattern: wrapped,
        resolve,
        timer,
        reject,
      };
      this.#check();
    });
  }

  close() { this.#stream.end(); this.closed = true; }

  get rawStream() { return this.#stream; }
}

// ── Manager global ────────────────────────────────────────────────────────────
let session = null;
const mutex = new Mutex();
let reconnectBlockedUntil = 0;
let lastSessionOpenAt = 0;
const SESSION_OPEN_GAP_MS = 4_000;

function sshParams() {
  return {
    host:         config.OLT_HOST,
    port:         config.OLT_PORT,
    username:     config.OLT_USERNAME,
    password:     config.OLT_PASSWORD,
    readyTimeout: config.OLT_TIMEOUT * 1_000,
    keepaliveInterval: 30_000,
    algorithms: {
      kex: [
        'diffie-hellman-group14-sha1',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group-exchange-sha1',
        'ecdh-sha2-nistp256',
        'ecdh-sha2-nistp384',
        'ecdh-sha2-nistp521',
      ],
      serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519'],
      cipher: [
        'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
        'aes128-gcm', 'aes256-gcm', '3des-cbc', 'aes128-cbc',
      ],
      hmac: ['hmac-sha1', 'hmac-sha2-256', 'hmac-sha2-512'],
    },
  };
}

async function openSession() {
  if (Date.now() < reconnectBlockedUntil) {
    const waitSeconds = Math.ceil((reconnectBlockedUntil - Date.now()) / 1000);
    throw Object.assign(
      new Error(`OLT bloqueou novas sessoes SSH temporariamente. Aguarde ${waitSeconds}s e tente novamente.`),
      { statusCode: 503 }
    );
  }

  const now = Date.now();
  const waitMs = lastSessionOpenAt + SESSION_OPEN_GAP_MS - now;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastSessionOpenAt = Date.now();

  return new Promise((resolve, reject) => {
    const client = new Client();

    client.on('ready', () => {
      client.shell({ term: 'vt100', cols: 220, rows: 50 }, async (err, stream) => {
        if (err) return reject(err);

        const sess = new OLTSession(stream);

        stream.on('close', () => {
          if (session === sess) session = null;
        });

        try {
          // Aguarda prompt inicial e usa o output para detectar o modo
          const initialPrompt = await sess.waitFor(PROMPT_RE, 15_000);

          // Nesta OLT, os comandos relevantes ficam disponiveis apos "enable".
          if (!PROMPT_PRIV.test(initialPrompt)) {
            sess.write('enable\n');
            const afterEnable = await sess.waitFor(PROMPT_RE, 10_000);
            if (PASSWORD_RE.test(sanitizeOutput(afterEnable).trim())) {
              if (!config.OLT_ENABLE_PASSWORD) {
                throw Object.assign(
                  new Error('A OLT solicitou senha para o comando enable. Configure OLT_ENABLE_PASSWORD no .env.'),
                  { statusCode: 503 }
                );
              }
              sess.write(config.OLT_ENABLE_PASSWORD + '\n');
              await sess.waitFor(PROMPT_PRIV, 10_000);
            } else if (!PROMPT_PRIV.test(afterEnable)) {
              await sess.waitFor(PROMPT_PRIV, 10_000);
            }
          }

          // Desabilita paginação
          await sess.sendLine('screen-length 0 temporary', 10_000);

          resolve(sess);
        } catch (e) {
          stream.end();
          client.end();
          reject(e);
        }
      });
    });

    client.on('error', reject);
    client.connect(sshParams());
  });
}

async function getSession() {
  if (session && !session.closed) return session;
  session = await openSession();
  return session;
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Executa um único comando show e devolve o output limpo. */
export async function sendCommand(cmd, ms = 25_000) {
  const release = await mutex.acquire();
  try {
    const sess = await getSession();
    return await sess.sendLine(cmd, ms);
  } catch (err) {
    if (isReenterLimitError(err)) {
      reconnectBlockedUntil = Date.now() + 60_000;
      err.statusCode = err.statusCode || 503;
    }
    if (session) session.close();
    session = null;           // força reconexão na próxima chamada
    throw err;
  } finally {
    release();
  }
}

/** Executa vários comandos de configuração (envolve com config / quit). */
export async function sendConfig(cmds, ms = 30_000) {
  const results = await sendConfigBatch(cmds, ms);
  return results.join('');
}

/** Executa vários comandos de configuração na sessão persistente e retorna um output por comando. */
export async function sendConfigBatch(cmds, ms = 30_000) {
  const release = await mutex.acquire();
  try {
    const sess = await getSession();
    const outputs = [];
    await sess.sendLine('config', ms);
    for (const cmd of cmds) {
      outputs.push(await sess.sendLine(cmd, ms));
    }
    await sess.sendLine('quit', ms);   // sai do config mode
    return outputs;
  } catch (err) {
    if (isReenterLimitError(err)) {
      reconnectBlockedUntil = Date.now() + 60_000;
      err.statusCode = err.statusCode || 503;
    }
    if (session) session.close();
    session = null;
    throw err;
  } finally {
    release();
  }
}

/** Testa a conectividade — abre e fecha uma sessão isolada. */
export async function testConnection() {
  try {
    const out = await sendCommand('display version', 15_000);
    return { ok: true, output: out };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

export async function warmupPersistentSession() {
  try {
    await sendCommand('display version', 15_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Abre uma shell SSH dedicada (para o terminal WebSocket).
 * O caller é responsável por fechar o stream.
 */
export function openShellForTerminal() {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.on('ready', () => {
      client.shell({ term: 'vt100', cols: 220, rows: 50 }, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', () => client.end());
        resolve({ stream, client });
      });
    });
    client.on('error', reject);
    client.connect(sshParams());
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────
function cleanOutput(raw, cmd) {
  const normalized = sanitizeOutput(raw);
  return normalized
    .split('\n')
    .filter(l => !compact(l).includes(compact(cmd)) && !PROMPT_RE.test(l.trimEnd()))
    .join('\n')
    .trim();
}

function sanitizeOutput(raw) {
  return raw
    .replace(/\r/g, '')
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/---- More \( Press 'Q' to break \) ----\s*/g, '');
}

function compact(text) {
  return text.replace(/\s+/g, '').toLowerCase();
}

function isReenterLimitError(err) {
  return String(err?.message || '').toLowerCase().includes('reenter times have reached the upper limit');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
