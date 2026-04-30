import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '..');
const projectRoot = resolve(backendDir, '..');

loadEnvFile(resolve(projectRoot, '.env'));
loadEnvFile(resolve(backendDir, '.env'));

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const parsed = dotenv.parse(readFileSync(path));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] == null) process.env[key] = value;
  }
}

function databasePathFromEnv() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;

  const url = process.env.DATABASE_URL;
  if (url?.startsWith('sqlite:///')) {
    return url.replace('sqlite:///', '');
  }

  return './olt_manager.db';
}

export default {
  SECRET_KEY:                process.env.SECRET_KEY      || 'troque-esta-chave-em-producao',
  TOKEN_EXPIRE_HOURS:        Number(process.env.TOKEN_EXPIRE_HOURS || 8),
  PORT:                      Number(process.env.PORT      || 8000),

  OLT_HOST:                  process.env.OLT_HOST        || '192.168.1.1',
  OLT_PORT:                  Number(process.env.OLT_PORT  || 22),
  OLT_USERNAME:              process.env.OLT_USERNAME     || 'admin',
  OLT_PASSWORD:              process.env.OLT_PASSWORD     || '',
  OLT_ENABLE_PASSWORD:       process.env.OLT_ENABLE_PASSWORD || '',
  OLT_NAME:                  process.env.OLT_NAME        || 'MA5800-X',
  OLT_TIMEOUT:               Number(process.env.OLT_TIMEOUT || 30),

  DATABASE_PATH:             databasePathFromEnv(),
};
