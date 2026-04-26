.PHONY: up down logs reset-db psql redis-cli

DOCKER_COMPOSE = docker compose -f infrastructure/docker/docker-compose.yml --env-file .env

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

reset-db:
	$(DOCKER_COMPOSE) down -v
	$(DOCKER_COMPOSE) up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 3
	cd apps/api && npx prisma migrate reset --force

psql:
	$(DOCKER_COMPOSE) exec postgres psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-genealogie_dev}

redis-cli:
	$(DOCKER_COMPOSE) exec redis redis-cli
