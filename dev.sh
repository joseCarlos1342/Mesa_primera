#!/bin/bash

# Script para iniciar todo el ecosistema de Mesa Primera en Desarrollo
# Requiere que el entorno de Supabase esté activo

set -euo pipefail

REDIS_FALLBACK_STARTED=0
REDIS_FALLBACK_PID=""
CLOUDFLARE_TUNNEL_PID=""
CLOUDFLARE_TUNNEL_LOG=""
CLOUDFLARE_TUNNEL_URL=""

detect_public_dev_host() {
	if [[ -n "${PUBLIC_DEV_HOST:-}" ]]; then
		printf '%s\n' "${PUBLIC_DEV_HOST}"
		return 0
	fi

	if command -v ip >/dev/null 2>&1; then
		local route_output=""
		route_output="$(ip route get 1.1.1.1 2>/dev/null || true)"
		if [[ "${route_output}" =~ src[[:space:]]+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+) ]]; then
			printf '%s\n' "${BASH_REMATCH[1]}"
			return 0
		fi
	fi

	if command -v hostname >/dev/null 2>&1; then
		local candidate
		for candidate in $(hostname -I 2>/dev/null); do
			if [[ -n "${candidate}" && ! "${candidate}" =~ ^127\. ]]; then
				printf '%s\n' "${candidate}"
				return 0
			fi
		done
	fi

	printf '127.0.0.1\n'
}

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6380}"
export REDIS_HOST REDIS_PORT

# Forzar que el frontend y el servidor apunten al motor local aunque
# apps/web/.env.local tenga URLs del VPS para desarrollo remoto.
PUBLIC_DEV_HOST="$(detect_public_dev_host)"
export PUBLIC_DEV_HOST
WEB_BIND_HOST="${WEB_BIND_HOST:-0.0.0.0}"
LOCAL_GAME_SERVER_BIND_HOST="${LOCAL_GAME_SERVER_BIND_HOST:-0.0.0.0}"
LOCAL_SOCKET_BIND_HOST="${LOCAL_SOCKET_BIND_HOST:-0.0.0.0}"
LOCAL_GAME_SERVER_HOST="${LOCAL_GAME_SERVER_HOST:-$PUBLIC_DEV_HOST}"
LOCAL_GAME_SERVER_PORT="${LOCAL_GAME_SERVER_PORT:-2567}"
LOCAL_SOCKET_HOST="${LOCAL_SOCKET_HOST:-$PUBLIC_DEV_HOST}"
LOCAL_SOCKET_PORT="${LOCAL_SOCKET_PORT:-2568}"

LOCAL_GAME_SERVER_URL="http://${LOCAL_GAME_SERVER_HOST}:${LOCAL_GAME_SERVER_PORT}"
LOCAL_SOCKET_URL="http://${LOCAL_SOCKET_HOST}:${LOCAL_SOCKET_PORT}"
LOCALHOST_WEB_URL="http://localhost:3000"
LOCAL_WEB_URL="http://${PUBLIC_DEV_HOST}:3000"
CLOUDFLARE_TUNNEL_ENABLED="${CLOUDFLARE_TUNNEL:-0}"
CLOUDFLARE_TUNNEL_PORT="${CLOUDFLARE_TUNNEL_PORT:-3000}"
CLOUDFLARE_TUNNEL_HOST="${CLOUDFLARE_TUNNEL_HOST:-127.0.0.1}"
CLOUDFLARE_TUNNEL_ALLOWED_MAIL="${CLOUDFLARE_TUNNEL_ALLOWED_MAIL:-}"

export GAME_SERVER_URL="${GAME_SERVER_URL:-$LOCAL_GAME_SERVER_URL}"
export NEXT_PUBLIC_GAME_SERVER_URL="${NEXT_PUBLIC_GAME_SERVER_URL:-$LOCAL_GAME_SERVER_URL}"
export SOCKET_URL="${SOCKET_URL:-$LOCAL_SOCKET_URL}"
export NEXT_PUBLIC_SOCKET_URL="${NEXT_PUBLIC_SOCKET_URL:-$LOCAL_SOCKET_URL}"
export GAME_SERVER_PORT="${GAME_SERVER_PORT:-$LOCAL_GAME_SERVER_PORT}"
export HOST="${HOST:-$WEB_BIND_HOST}"

echo "🚀 Iniciando Mesa Primera: Stack Completa..."
echo "📡 Red local pública: ${PUBLIC_DEV_HOST}"
echo "🌐 Web local: ${LOCALHOST_WEB_URL}"
echo "🌐 Web local pública: ${LOCAL_WEB_URL}"
echo "🎯 Game server local: ${GAME_SERVER_URL}"
echo "🔔 Socket local: ${SOCKET_URL}"
echo "🗄️  Supabase: se mantiene la configuración existente de apps/web/.env.local y apps/game-server/.env.local"
if [[ "${CLOUDFLARE_TUNNEL_ENABLED}" == "1" ]]; then
	echo "☁️  Quick Tunnel de Cloudflare: se publicará la web en el puerto ${CLOUDFLARE_TUNNEL_PORT}"
else
	echo "☁️  Quick Tunnel de Cloudflare: desactivado (usa CLOUDFLARE_TUNNEL=1 ./dev.sh)"
fi

start_local_redis_fallback() {
	if command -v redis-cli >/dev/null 2>&1 && redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping >/dev/null 2>&1; then
		echo "🧠 Redis ya está activo en ${REDIS_HOST}:${REDIS_PORT}."
		return 0
	fi

	if ! command -v redis-server >/dev/null 2>&1; then
		echo "❌ No se encontró redis-server y Docker no pudo levantar Redis."
		echo "   Instala Redis o arráncalo manualmente en ${REDIS_HOST}:${REDIS_PORT}."
		return 1
	fi

	local redis_runtime_dir="${TMPDIR:-/tmp}/mesa-primera-redis"
	mkdir -p "${redis_runtime_dir}"

	echo "🧠 Levantando redis-server local en ${REDIS_HOST}:${REDIS_PORT}..."
	redis-server \
		--bind "${REDIS_HOST}" \
		--port "${REDIS_PORT}" \
		--daemonize yes \
		--save "" \
		--appendonly no \
		--dir "${redis_runtime_dir}" \
		--pidfile "${redis_runtime_dir}/redis.pid" \
		--logfile "${redis_runtime_dir}/redis.log"

	if [[ -f "${redis_runtime_dir}/redis.pid" ]]; then
		REDIS_FALLBACK_PID="$(cat "${redis_runtime_dir}/redis.pid")"
		REDIS_FALLBACK_STARTED=1
	fi
}

cleanup() {
	local exit_code=$?

	if [[ -n "${CLOUDFLARE_TUNNEL_PID}" ]] && kill -0 "${CLOUDFLARE_TUNNEL_PID}" 2>/dev/null; then
		kill "${CLOUDFLARE_TUNNEL_PID}" 2>/dev/null || true
		wait "${CLOUDFLARE_TUNNEL_PID}" 2>/dev/null || true
	fi
	if [[ -n "${CLOUDFLARE_TUNNEL_LOG}" ]]; then
		rm -f "${CLOUDFLARE_TUNNEL_LOG}"
	fi

	fuser -k 3000/tcp 2567/tcp 2568/tcp >/dev/null 2>&1 || true
	lsof -ti :3000,2567,2568 | xargs kill -9 2>/dev/null || true

	if [[ "${REDIS_FALLBACK_STARTED}" == "1" ]] && [[ -n "${REDIS_FALLBACK_PID}" ]] && kill -0 "${REDIS_FALLBACK_PID}" 2>/dev/null; then
		kill "${REDIS_FALLBACK_PID}" 2>/dev/null || true
	fi

	wait 2>/dev/null || true
	return "${exit_code}"
}

trap cleanup EXIT INT TERM

is_port_listening() {
	local port="$1"
	ss -ltn "( sport = :${port} )" 2>/dev/null | tail -n +2 | grep -q LISTEN
}

wait_for_port() {
	local port="$1"
	local label="$2"
	local attempts="${3:-30}"
	local delay="${4:-1}"

	for ((i = 1; i <= attempts; i++)); do
		if is_port_listening "${port}"; then
			return 0
		fi
		sleep "${delay}"
	done

	echo "❌ ${label} no empezó a escuchar en el puerto ${port}."
	return 1
}

read_cloudflare_tunnel_url() {
	local line=""
	if [[ -z "${CLOUDFLARE_TUNNEL_LOG}" || ! -f "${CLOUDFLARE_TUNNEL_LOG}" ]]; then
		return 1
	fi

	while IFS= read -r line; do
		if [[ "${line}" =~ (https://[a-zA-Z0-9.-]+\.trycloudflare\.com) ]]; then
			printf '%s\n' "${BASH_REMATCH[1]}"
			return 0
		fi
	done < "${CLOUDFLARE_TUNNEL_LOG}"

	return 1
}

start_cloudflare_tunnel() {
	if [[ "${CLOUDFLARE_TUNNEL_ENABLED}" != "1" ]]; then
		return 0
	fi

	if ! command -v cloudflared >/dev/null 2>&1; then
		echo "⚠️  No se encontró cloudflared; se mantienen solo las URLs locales."
		echo "   Instálalo desde https://developers.cloudflare.com/tunnel/downloads/"
		return 0
	fi

	CLOUDFLARE_TUNNEL_LOG="$(mktemp "${TMPDIR:-/tmp}/mesa-primera-cloudflared.XXXXXX.log")"
	local tunnel_args=(tunnel --url "http://${CLOUDFLARE_TUNNEL_HOST}:${CLOUDFLARE_TUNNEL_PORT}")
	if [[ -n "${CLOUDFLARE_TUNNEL_ALLOWED_MAIL}" ]]; then
		tunnel_args+=(--allowed-mail "${CLOUDFLARE_TUNNEL_ALLOWED_MAIL}")
	fi

	echo "☁️  Iniciando Quick Tunnel de Cloudflare hacia http://${CLOUDFLARE_TUNNEL_HOST}:${CLOUDFLARE_TUNNEL_PORT}..."
	cloudflared "${tunnel_args[@]}" >"${CLOUDFLARE_TUNNEL_LOG}" 2>&1 &
	CLOUDFLARE_TUNNEL_PID=$!

	for ((i = 1; i <= 30; i++)); do
		if CLOUDFLARE_TUNNEL_URL="$(read_cloudflare_tunnel_url)"; then
			echo "☁️  URL temporal pública: ${CLOUDFLARE_TUNNEL_URL}"
			if [[ -n "${CLOUDFLARE_TUNNEL_ALLOWED_MAIL}" ]]; then
				echo "🔐 Acceso protegido para: ${CLOUDFLARE_TUNNEL_ALLOWED_MAIL}"
			else
				echo "⚠️  Cualquiera que tenga esta URL puede acceder a la web de desarrollo."
			fi
			return 0
		fi

		if ! kill -0 "${CLOUDFLARE_TUNNEL_PID}" 2>/dev/null; then
			echo "⚠️  cloudflared terminó antes de publicar la URL; se mantienen las URLs locales."
			CLOUDFLARE_TUNNEL_PID=""
			return 0
		fi
		sleep 1
	done

	echo "⚠️  No se pudo obtener la URL de Cloudflare en 30 segundos; se mantienen las URLs locales."
	return 0
}

# Matar procesos previos en los puertos clave (3000, 2567, 2568) de forma agresiva
echo "🧹 Limpiando puertos y procesos zombis..."
fuser -k 3000/tcp 2567/tcp 2568/tcp >/dev/null 2>&1 || true
lsof -ti :3000,2567,2568 | xargs kill -9 2>/dev/null || true
# Limpieza de procesos node específicos de desarrollo
ps aux | grep -E "ts-node-dev|next-dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
pkill -f "next dev|next/dist/bin/next" 2>/dev/null || true

# Limpiar lock stale de Next.js para evitar "Unable to acquire lock"
rm -f apps/web/.next/dev/lock

# Asegurar Redis local (docker-compose mapea host:6380 -> container:6379)
if command -v docker >/dev/null 2>&1; then
	echo "🧠 Verificando Redis local en :${REDIS_PORT}..."
	if ! docker compose up -d redis >/dev/null 2>&1; then
		echo "⚠️  No se pudo iniciar Redis con docker compose."
		echo "   Intentando fallback con redis-server local..."
		start_local_redis_fallback || true
	fi
else
	echo "⚠️  Docker no está instalado. Intentando fallback con redis-server local..."
	start_local_redis_fallback || true
fi
sleep 2

# Iniciar procesos en segundo plano
echo "🎮 Arrancando Servidores (Web + Game Server)..."
(
	cd apps/game-server
	REDIS_URL="${REDIS_URL:-redis://${REDIS_HOST}:${REDIS_PORT}}" HOST="${LOCAL_GAME_SERVER_BIND_HOST}" \
		exec ./node_modules/.bin/ts-node-dev --respawn --transpile-only src/index.ts
) &
(
	cd apps/web
	HOST="${WEB_BIND_HOST}" exec ./node_modules/.bin/next dev --hostname "${WEB_BIND_HOST}" --port 3000
) &

echo "🌐 Web esperada en localhost: ${LOCALHOST_WEB_URL}"
echo "🌐 Web esperada en red local: ${LOCAL_WEB_URL}"
echo "🧩 Game server esperado en: ${GAME_SERVER_URL}"
echo "📱 Abre desde el móvil: ${LOCAL_WEB_URL}"

wait_for_port 2567 "El game server" || exit 1
wait_for_port 2568 "Socket.IO" || exit 1
wait_for_port 3000 "La app web" || exit 1
start_cloudflare_tunnel

# Mantener el script vivo mientras ambos procesos sigan arriba.
# `wait` y los PIDs resultaron inestables con los wrappers/respawns de dev,
# así que vigilamos la disponibilidad real de los puertos necesarios.
while true; do
	if ! is_port_listening 2567; then
		echo "❌ El game server terminó inesperadamente."
		exit 1
	fi

	if ! is_port_listening 2568; then
		echo "❌ Socket.IO dejó de escuchar inesperadamente."
		exit 1
	fi

	if ! is_port_listening 3000; then
		echo "❌ La app web terminó inesperadamente."
		exit 1
	fi

	if [[ -n "${CLOUDFLARE_TUNNEL_PID}" ]] && ! kill -0 "${CLOUDFLARE_TUNNEL_PID}" 2>/dev/null; then
		echo "⚠️  El Quick Tunnel de Cloudflare terminó; las URLs locales siguen disponibles."
		CLOUDFLARE_TUNNEL_PID=""
	fi

	sleep 2
done
