# OLT Huawei Manager

Aplicacao web para gerenciamento de OLT Huawei MA5800-X2, com foco em:

- consulta de ONTs registradas
- autofind de ONTs
- provisionamento de ONTs
- service-port e native VLAN
- dashboard com cache para reduzir carga na OLT
- terminal SSH integrado

## Requisitos

- Node.js 18+
- acesso SSH a uma OLT Huawei MA5800
- Docker opcional para distribuicao

## Configuracao

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Edite `/.env` com os dados reais da sua OLT.

Campos principais:

- `OLT_HOST`
- `OLT_PORT`
- `OLT_USERNAME`
- `OLT_PASSWORD`
- `OLT_ENABLE_PASSWORD` se sua OLT pedir senha no `enable`

## Instalacao local

```bash
./install.sh
./start.sh
```

Aplicacao disponivel em:

- [http://localhost:8000](http://localhost:8000)

Login inicial:

- usuario: `admin`
- senha: `admin123`

Troque a senha apos o primeiro acesso.

## Docker

Build da imagem:

```bash
docker build -t olt-manager .
```

Execucao:

```bash
docker run --name olt-manager \
  --env-file .env \
  -e DATABASE_PATH=/data/olt_manager.db \
  -p 8000:8000 \
  -v olt_manager_data:/data \
  -v olt_manager_logs:/app/backend/logs \
  olt-manager
```

Ou com Docker Compose:

```bash
docker-compose up -d --build
```

## Templates de provisionamento

O projeto ja inclui templates por porta PON considerando:

- slot fixo `1`
- VLAN automatica por PON
- `lineprofile_id = 20`
- `srvprofile_id = 20`
- `gemport = 6`

No `Autofind`, e possivel:

- provisionar direto
- informar a descricao da ONT antes de enviar
- abrir o formulario completo para ajuste manual

## Estrutura

- [backend](/Users/torugo/olt%20huawei/backend) API Fastify, SSH e parser Huawei
- [frontend](/Users/torugo/olt%20huawei/frontend) interface React + Vite

## Publicacao no GitHub

Este repositorio foi preparado para publicacao com:

- `.gitignore` para arquivos locais e credenciais
- `.env.example` sem segredos
- `Dockerfile` e `docker-compose.yml`

Antes de subir:

1. confira se `/.env` nao sera commitado
2. revise textos e credenciais
3. se quiser, adicione uma licenca

## Observacoes

- O comportamento dos comandos Huawei pode variar por firmware.
- Esta implementacao foi ajustada para uma MA5800-X2 com sintaxe de `display` em modo `config`.
