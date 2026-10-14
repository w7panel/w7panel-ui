NPM ?= npm
DEV_PORT ?= 8011

.PHONY: help dev

help:
	@echo "本地开发："
	@echo "  make dev"
	@echo "  make dev DEV_PORT=8011"

# vite.config.dev.ts 已将面板与 K8s API 代理到本机 18000 端口。
dev:
	$(NPM) run dev -- --port $(DEV_PORT)
