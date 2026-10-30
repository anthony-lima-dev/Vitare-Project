COMPOSE=docker compose --env-file .env.public -f compose.yaml

.PHONY: config up down ps logs logs-tunnel logs-api restart build pull seed

config:
	$(COMPOSE) config

up:
	$(COMPOSE) up -d --build

#apenas para e remove os containers
down:
	$(COMPOSE) down

#apaga os volumes do PostgreSQL
down-v:
	$(COMPOSE) down -v

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=200

logs-tunnel:
	$(COMPOSE) logs -f --tail=200 cloudflared

logs-api:
	$(COMPOSE) logs -f --tail=200 api

restart:
	$(COMPOSE) restart

build:
	$(COMPOSE) build --pull

pull:
	$(COMPOSE) pull

# Carrega os catálogos públicos (grupos de CID, doenças e medicamentos) no banco.
# A imagem migrate inclui Prisma CLI, tsx e prisma/data/*.json; o Compose aguarda o
# PostgreSQL saudável. Executa as migrações antes do seed.
# Uso: cd infra/public && make seed
seed:
	$(COMPOSE) build migrate
	$(COMPOSE) run --rm migrate pnpm exec prisma migrate deploy
	$(COMPOSE) run --rm migrate pnpm exec tsx prisma/seed.ts
