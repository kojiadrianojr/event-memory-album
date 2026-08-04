# Photo Album — task runner
# Run `make` or `make help` to list available commands.

.DEFAULT_GOAL := help

.PHONY: help setup env \
	app\:install app\:dev app\:build app\:start app\:lint app\:test \
	docker\:up docker\:down docker\:reset docker\:logs docker\:full \
	share\:local \
	db\:migrate db\:migrate\:deploy db\:generate db\:studio db\:push \
	deploy\:prod deploy\:preview

help: ## Show this help
	@awk 'BEGIN {FS = "## "} \
		/^## / {printf "\n\033[1m%s\033[0m\n", $$2; next} \
		/^[a-zA-Z0-9_].*## / {t=$$1; sub(/[ :]+$$/,"",t); gsub(/\\/,"",t); \
			printf "  \033[36m%-16s\033[0m %s\n", t, $$2}' $(MAKEFILE_LIST)
	@echo ""

setup: ## First-time setup (env + deps + docker + migrate)
	$(MAKE) env
	$(MAKE) app:install
	$(MAKE) docker:up
	$(MAKE) db:migrate

env: ## Create .env.local from example (won't overwrite existing)
	cp -n .env.local.example .env.local

## App — host process (typical dev: make docker:up && make app:dev)
app\:install: ## Install npm dependencies
	npm install

app\:dev: ## Start Next.js dev server
	npm run dev

app\:build: ## Production build
	npm run build

app\:start: ## Run production server locally (builds first)
	$(MAKE) app:build
	npm run start

app\:lint: ## Run ESLint
	npm run lint

app\:test: ## Run unit tests (Vitest)
	npm run test

# Env files for docker compose interpolation (see docker-compose.yml).
COMPOSE_ENV_FILES :=
ifneq (,$(wildcard .env))
COMPOSE_ENV_FILES += --env-file .env
endif
ifneq (,$(wildcard .env.local))
COMPOSE_ENV_FILES += --env-file .env.local
endif
DOCKER_COMPOSE = docker compose $(COMPOSE_ENV_FILES)

## Docker — Postgres + MinIO + Redis (pair with app:dev on host)
docker\:up: ## Start database, storage, and Redis (detached)
	$(DOCKER_COMPOSE) up -d

docker\:down: ## Stop all containers (including share:local app)
	$(DOCKER_COMPOSE) --profile full down

docker\:reset: ## Stop containers and wipe volumes (fresh DB + storage)
	$(DOCKER_COMPOSE) --profile full down -v

docker\:logs: ## Follow container logs
	$(DOCKER_COMPOSE) --profile full logs -f

docker\:full: ## Build and run entire stack in Docker (rebuilds app image)
	$(DOCKER_COMPOSE) --profile full up -d --build

## Share
share\:local: ## Full stack + print LAN URL for network testing
	@HOST_IP=$${HOST_IP:-$$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}')}; \
	if [ -z "$$HOST_IP" ]; then \
		echo "Could not auto-detect a LAN IP. Re-run with: HOST_IP=x.x.x.x make share:local"; \
		exit 1; \
	fi; \
	APP_PORT=$${APP_PORT:-3000}; \
	echo "Detected LAN IP: $$HOST_IP"; \
	HOST_IP=$$HOST_IP APP_PORT=$$APP_PORT $(MAKE) docker:full && \
	echo "" && \
	echo "Share this link with anyone on your network:" && \
	echo "  http://$$HOST_IP:$$APP_PORT"

## Database (Prisma — requires docker:up or a reachable DATABASE_URL)
db\:migrate: ## Apply migrations and regenerate client
	npx prisma migrate dev

db\:migrate\:deploy: ## Apply pending migrations (production / Supabase)
	npx prisma migrate deploy

db\:generate: ## Regenerate Prisma client
	npx prisma generate

db\:studio: ## Open Prisma Studio
	npx prisma studio

db\:push: ## Push schema without a migration (prototyping only)
	npx prisma db push

## Deploy (Vercel)
deploy\:prod: ## Deploy to production
	npx vercel --prod

deploy\:preview: ## Deploy a preview
	npx vercel
