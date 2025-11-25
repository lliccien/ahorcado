.PHONY: help dev-up dev-down dev-logs dev-clean prod-build prod-up prod-down prod-logs prod-clean clean

# Colores para el output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m # No Color

help: ## Muestra esta ayuda
	@echo "$(GREEN)Makefile para Monorepo NestJS + AstroJS$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ==================== DESARROLLO ====================

dev-up: ## Levanta servicios de desarrollo (postgres + redis)
	@echo "$(GREEN)Iniciando servicios de desarrollo...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Servicios de desarrollo iniciados$(NC)"
	@echo "  - PostgreSQL: localhost:$${DB_PORT:-5432}"
	@echo "  - Redis: localhost:$${REDIS_PORT:-6379}"

dev-down: ## Detiene servicios de desarrollo
	@echo "$(YELLOW)Deteniendo servicios de desarrollo...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.dev.yml down

dev-logs: ## Muestra logs de servicios de desarrollo
	docker compose --env-file .env -f docker/docker-compose.dev.yml logs -f

dev-clean: ## Limpia contenedores y volúmenes de desarrollo
	@echo "$(YELLOW)Limpiando servicios de desarrollo...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.dev.yml down -v
	@echo "$(GREEN)✓ Servicios y volúmenes eliminados$(NC)"

dev-restart: ## Reinicia servicios de desarrollo
	@echo "$(YELLOW)Reiniciando servicios de desarrollo...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.dev.yml restart

# ==================== PRODUCCIÓN ====================

prod-build: ## Construye imágenes de producción
	@echo "$(GREEN)Construyendo imágenes de producción...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.prod.yml build --no-cache
	@echo "$(GREEN)✓ Imágenes construidas$(NC)"

prod-up: ## Levanta servicios de producción (api + web)
	@echo "$(GREEN)Iniciando servicios de producción...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Servicios de producción iniciados$(NC)"
	@echo "  - API: localhost:$${API_PORT:-3000}"
	@echo "  - Web: localhost:$${WEB_PORT:-3001}"

prod-down: ## Detiene servicios de producción
	@echo "$(YELLOW)Deteniendo servicios de producción...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.prod.yml down

prod-logs: ## Muestra logs de servicios de producción
	docker compose --env-file .env -f docker/docker-compose.prod.yml logs -f

prod-clean: ## Limpia contenedores e imágenes de producción
	@echo "$(YELLOW)Limpiando servicios de producción...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.prod.yml down --rmi all -v
	@echo "$(GREEN)✓ Servicios, imágenes y volúmenes eliminados$(NC)"

prod-restart: ## Reinicia servicios de producción
	@echo "$(YELLOW)Reiniciando servicios de producción...$(NC)"
	docker compose --env-file .env -f docker/docker-compose.prod.yml restart

prod-rebuild: prod-down prod-build prod-up ## Reconstruye y levanta producción

# ==================== UTILIDADES ====================

clean: ## Limpia todo (desarrollo + producción)
	@echo "$(YELLOW)Limpiando todos los servicios...$(NC)"
	$(MAKE) dev-clean
	$(MAKE) prod-clean
	@echo "$(GREEN)✓ Todo limpio$(NC)"

status: ## Muestra el estado de los contenedores
	@echo "$(GREEN)Estado de contenedores:$(NC)"
	@docker ps -a --filter "name=dev-" --filter "name=prod-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

ps: status ## Alias para status
