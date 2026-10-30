COMPOSE=docker compose --env-file .env.local -f compose.yaml

.PHONY: init build up down restart ps logs shell-api shell-db migrate backup clean

init:
	cp -n .env.example .env.local || true
	@echo "Edite infra/local/.env.local antes de subir os serviços."

build:
	$(COMPOSE) build --pull

up:
	$(COMPOSE) up -d --build

up-tunnel:
	@echo "O túnel público não faz parte do baseline local. Veja README.md para configurar a opção de demonstração."

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) up -d --force-recreate

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=200

shell-api:
	$(COMPOSE) exec api sh

shell-db:
	$(COMPOSE) exec db psql -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"

migrate:
	$(COMPOSE) run --rm migrate

backup:
	./scripts/backup-db.sh

clean:
	$(COMPOSE) down -v --remove-orphans
	@echo "ATENÇÃO: o volume do PostgreSQL foi removido. Dados locais foram apagados."
