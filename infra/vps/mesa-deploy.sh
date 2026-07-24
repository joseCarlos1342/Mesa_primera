#!/usr/bin/env bash
# mesa-deploy — actualizador del game-server en el VPS de Mesa Primera.
#
# Modelo: pull-based + guardrail.
#   1. Hace docker pull de ghcr.io/<owner>/mesa-game-server:<tag>.
#   2. Si la imagen no cambió, sale 0 sin tocar nada.
#   3. Consulta /health del contenedor activo. Si hay jugadores o partidas
#      activas, aborta (a menos que se pase --force).
#   4. Recrea el contenedor con la nueva imagen.
#   5. Espera a que /health responda 200; si no, hace rollback al digest
#      anterior.
#
# El VPS NUNCA recibe conexiones desde GitHub. Este script se invoca:
#   - automáticamente por systemd (mesa-deploy.timer) en ventana 03–05h.
#   - manualmente por el desarrollador vía SSH con su llave personal.
#
# Variables esperadas en /etc/mesa/deploy.env:
#   GHCR_OWNER          (ej. "tu-usuario-github")
#   GHCR_USERNAME       (mismo usuario o un service account)
#   GHCR_TOKEN          (PAT con read:packages, ver runbook)
#   IMAGE_TAG           (default: "main")
#   CONTAINER_NAME      (default: "mesa-backend")
#   DOCKER_NETWORK      (default: "mesa-internal")
#   ENV_FILE            (default: "/etc/mesa/runtime.env")
#   REPLAYS_VOLUME      (default: "/srv/mesa/replays")
#   HEALTH_URL          (default: "http://127.0.0.1:2567/health")
#   FORCE_LOG_DIR       (default: "/var/log/mesa-deploy")

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "[mesa-deploy] Debe ejecutarse como root mediante systemd o sudo." >&2
  exit 1
fi

FORCE=0
CLI_IMAGE_TAG=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    --image-tag)
      [[ "$#" -ge 2 && -n "$2" ]] || { echo "--image-tag requiere un valor" >&2; exit 2; }
      CLI_IMAGE_TAG="$2"
      shift 2
      ;;
    --image-tag=*)
      CLI_IMAGE_TAG="${1#*=}"
      [[ -n "$CLI_IMAGE_TAG" ]] || { echo "--image-tag requiere un valor" >&2; exit 2; }
      shift
      ;;
    --help|-h)
      echo "Uso: mesa-deploy [--force] [--image-tag sha-<git-sha>]"
      exit 0
      ;;
    *)
      echo "Argumento desconocido: $1" >&2
      exit 2
      ;;
  esac
done

# ── Config ────────────────────────────────────────────────────────────
ENV_FILE_DEPLOY="${MESA_DEPLOY_CONFIG:-/etc/mesa/deploy.env}"
[[ -f "$ENV_FILE_DEPLOY" ]] || { echo "[mesa-deploy] Falta $ENV_FILE_DEPLOY" >&2; exit 1; }
DEPLOY_OWNER="$(stat -c '%U:%G' "$ENV_FILE_DEPLOY")"
DEPLOY_MODE="$(stat -c '%a' "$ENV_FILE_DEPLOY")"
if [[ "$DEPLOY_OWNER" != "root:root" || "$DEPLOY_MODE" != "600" ]]; then
  echo "[mesa-deploy] $ENV_FILE_DEPLOY debe ser root:root 600 (actual: $DEPLOY_OWNER $DEPLOY_MODE)." >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE_DEPLOY"

: "${GHCR_OWNER:?GHCR_OWNER no configurado en $ENV_FILE_DEPLOY}"
: "${GHCR_USERNAME:?GHCR_USERNAME no configurado en $ENV_FILE_DEPLOY}"
: "${GHCR_TOKEN:?GHCR_TOKEN no configurado en $ENV_FILE_DEPLOY}"

IMAGE_TAG="${CLI_IMAGE_TAG:-${IMAGE_TAG:-main}}"
IMAGE_REF="ghcr.io/${GHCR_OWNER}/mesa-game-server:${IMAGE_TAG}"
CONTAINER_NAME="${CONTAINER_NAME:-mesa-backend}"
DOCKER_NETWORK="${DOCKER_NETWORK:-mesa-internal}"
ENV_FILE="${ENV_FILE:-/etc/mesa/runtime.env}"
REPLAYS_VOLUME="${REPLAYS_VOLUME:-/srv/mesa/replays}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:2567/health}"
LOG_DIR="${FORCE_LOG_DIR:-/var/log/mesa-deploy}"
CONTAINER_MEMORY="${CONTAINER_MEMORY:-2g}"
CONTAINER_CPUS="${CONTAINER_CPUS:-2}"
CONTAINER_PIDS="${CONTAINER_PIDS:-512}"

validate_secret_file() {
  local file="$1"
  local owner mode
  [[ -f "$file" ]] || { echo "[mesa-deploy] Falta $file" >&2; exit 1; }
  owner="$(stat -c '%U:%G' "$file")"
  mode="$(stat -c '%a' "$file")"
  if [[ "$owner" != "root:root" || "$mode" != "600" ]]; then
    echo "[mesa-deploy] $file debe pertenecer a root:root y tener modo 600 (actual: $owner $mode)." >&2
    exit 1
  fi
}

validate_secret_file "$ENV_FILE"

if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  echo "[mesa-deploy] Falta la red Docker privada $DOCKER_NETWORK. Créala durante el bootstrap del VPS." >&2
  exit 1
fi

LOCK_DIR="${MESA_DEPLOY_LOCK_DIR:-/run/mesa-deploy}"
mkdir -p "$LOCK_DIR"
exec 9>"$LOCK_DIR/deploy.lock"
if ! flock -n 9; then
  echo "[mesa-deploy] Ya existe otro despliegue en ejecución." >&2
  exit 75
fi

mkdir -p "$LOG_DIR"
mkdir -p "$REPLAYS_VOLUME"
find "$LOG_DIR" -type f -name '*.log' -mtime +30 -delete
LOG_FILE="$LOG_DIR/$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "──────────────────────────────────────────────────────────"
echo "[mesa-deploy] $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "[mesa-deploy] image     = $IMAGE_REF"
echo "[mesa-deploy] container = $CONTAINER_NAME"
echo "──────────────────────────────────────────────────────────"

# ── 1. Login a GHCR (read-only) ───────────────────────────────────────
export DOCKER_CONFIG="$LOCK_DIR/docker-auth-$$"
install -d -m 0700 "$DOCKER_CONFIG"
cleanup() {
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf "$DOCKER_CONFIG"
}
trap cleanup EXIT
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null

# ── 2. Pull y comparación con la imagen realmente activa ─────────────
PREV_IMAGE="$(docker inspect --format='{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"
docker pull "$IMAGE_REF"
NEW_DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE_REF")"
NEW_IMAGE="$(docker image inspect --format='{{.Id}}' "$IMAGE_REF")"

echo "[mesa-deploy] imagen activa  = ${PREV_IMAGE:-<ninguna>}"
echo "[mesa-deploy] digest nuevo   = $NEW_DIGEST"

if [[ "$PREV_IMAGE" == "$NEW_IMAGE" && "$FORCE" -eq 0 ]]; then
  echo "[mesa-deploy] Imagen sin cambios. Nada que hacer."
  exit 0
fi

run_container() {
  local image="$1"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --network "$DOCKER_NETWORK" \
    --publish 127.0.0.1:2567:2567 \
    --publish 127.0.0.1:2568:2568 \
    --env-file "$ENV_FILE" \
    --volume "$REPLAYS_VOLUME":/data/replays \
    --stop-timeout 35 \
    --init \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --pids-limit "$CONTAINER_PIDS" \
    --memory "$CONTAINER_MEMORY" \
    --cpus "$CONTAINER_CPUS" \
    --log-driver local \
    --log-opt max-size=10m \
    --log-opt max-file=5 \
    "$image"
}

health_is_reliable() {
  local health_json="$1"
  jq -e '
    .roomCountersReliable == true and
    (.activeRooms | type == "number") and
    (.activePlayers | type == "number") and
    (.activeGames | type == "number")
  ' >/dev/null <<<"$health_json"
}

# ── 3. Guardrail: chequear /health del contenedor activo ──────────────
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[mesa-deploy] Verificando /health del contenedor activo..."
  if ! HEALTH_JSON="$(curl -fsS --max-time 5 "$HEALTH_URL")"; then
    if [[ "$FORCE" -ne 1 ]]; then
      echo "[mesa-deploy] /health no respondió; aborto fail-closed." >&2
      exit 75
    fi
    echo "[mesa-deploy] ⚠️ /health no respondió, pero --force permite continuar."
  elif ! health_is_reliable "$HEALTH_JSON"; then
    if [[ "$FORCE" -ne 1 ]]; then
      echo "[mesa-deploy] /health no garantiza contadores fiables; aborto fail-closed." >&2
      exit 75
    fi
    echo "[mesa-deploy] ⚠️ Contadores no fiables, pero --force permite continuar."
  else
    echo "[mesa-deploy] /health: $HEALTH_JSON"
    ACTIVE_PLAYERS="$(jq -r '.activePlayers' <<<"$HEALTH_JSON")"
    ACTIVE_ROOMS="$(jq -r '.activeRooms' <<<"$HEALTH_JSON")"
    ACTIVE_GAMES="$(jq -r '.activeGames' <<<"$HEALTH_JSON")"
    if (( ACTIVE_PLAYERS > 0 || ACTIVE_GAMES > 0 )); then
      if [[ "$FORCE" -eq 1 ]]; then
        echo "[mesa-deploy] ⚠️ Hay jugadores/juegos activos pero --force permite continuar."
      else
        echo "[mesa-deploy] Guardrail: activePlayers=$ACTIVE_PLAYERS activeRooms=$ACTIVE_ROOMS activeGames=$ACTIVE_GAMES."
        echo "[mesa-deploy] Aborto: esperar siguiente ventana o usar --force."
        exit 75
      fi
    fi
  fi
else
  echo "[mesa-deploy] No hay contenedor activo. Procediendo a primer arranque."
fi

# ── 4. Recrear el contenedor ──────────────────────────────────────────
echo "[mesa-deploy] Recreando contenedor..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  # Stop con grace period suficiente para SIGTERM handler (30s).
  docker stop --time 35 "$CONTAINER_NAME" || true
  docker rm "$CONTAINER_NAME" || true
fi

run_container "$IMAGE_REF"

# ── 5. Health check post-deploy con rollback ──────────────────────────
echo "[mesa-deploy] Esperando /health..."
HEALTH_OK=0
for i in $(seq 1 30); do
  if CANDIDATE_HEALTH="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null)" \
    && health_is_reliable "$CANDIDATE_HEALTH"; then
    HEALTH_OK=1
    echo "[mesa-deploy] /health OK tras ${i}s"
    break
  fi
  sleep 1
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "[mesa-deploy] ❌ Health check falló. Iniciando rollback..."
  docker stop --time 35 "$CONTAINER_NAME" || true
  docker rm "$CONTAINER_NAME" || true
  if [[ -n "$PREV_IMAGE" ]]; then
    run_container "$PREV_IMAGE"
    ROLLBACK_OK=0
    for i in $(seq 1 30); do
      if ROLLBACK_HEALTH="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null)" \
        && health_is_reliable "$ROLLBACK_HEALTH"; then
        ROLLBACK_OK=1
        echo "[mesa-deploy] Rollback saludable tras ${i}s: $PREV_IMAGE"
        break
      fi
      sleep 1
    done
    if [[ "$ROLLBACK_OK" -ne 1 ]]; then
      echo "[mesa-deploy] ❌ El rollback tampoco superó el healthcheck." >&2
    fi
  else
    echo "[mesa-deploy] No había digest previo; no se pudo hacer rollback."
  fi
  exit 1
fi

echo "[mesa-deploy] ✅ Despliegue exitoso: $NEW_DIGEST"
