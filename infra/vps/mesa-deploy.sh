#!/usr/bin/env bash
# mesa-deploy — actualizador del game-server en el VPS de Mesa Primera.
#
# Modelo: pull-based + guardrail.
#   1. Hace docker pull de ghcr.io/<owner>/mesa-game-server:<tag>.
#   2. Si la imagen no cambió, sale 0 sin tocar nada.
#   3. Consulta /health del contenedor activo. Si hay jugadores o mesas
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
#   ENV_FILE            (default: "/root/.env.production")
#   REPLAYS_VOLUME      (default: "/root/replays")
#   HEALTH_URL          (default: "http://127.0.0.1:2567/health")
#   FORCE_LOG_DIR       (default: "/var/log/mesa-deploy")

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────
ENV_FILE_DEPLOY="${MESA_DEPLOY_CONFIG:-/etc/mesa/deploy.env}"
if [[ -f "$ENV_FILE_DEPLOY" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE_DEPLOY"
fi

: "${GHCR_OWNER:?GHCR_OWNER no configurado en $ENV_FILE_DEPLOY}"
: "${GHCR_USERNAME:?GHCR_USERNAME no configurado en $ENV_FILE_DEPLOY}"
: "${GHCR_TOKEN:?GHCR_TOKEN no configurado en $ENV_FILE_DEPLOY}"

IMAGE_TAG="${IMAGE_TAG:-main}"
IMAGE_REF="ghcr.io/${GHCR_OWNER}/mesa-game-server:${IMAGE_TAG}"
CONTAINER_NAME="${CONTAINER_NAME:-mesa-backend}"
ENV_FILE="${ENV_FILE:-/root/.env.production}"
REPLAYS_VOLUME="${REPLAYS_VOLUME:-/root/replays}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:2567/health}"
LOG_DIR="${FORCE_LOG_DIR:-/var/log/mesa-deploy}"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "──────────────────────────────────────────────────────────"
echo "[mesa-deploy] $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "[mesa-deploy] image     = $IMAGE_REF"
echo "[mesa-deploy] container = $CONTAINER_NAME"
echo "──────────────────────────────────────────────────────────"

FORCE=0
SKIP_GUARDRAIL=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --skip-guardrail) SKIP_GUARDRAIL=1 ;;
    --help|-h)
      sed -n '2,30p' "$0"
      exit 0 ;;
    *) echo "Argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

# ── 1. Login a GHCR (read-only) ───────────────────────────────────────
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT

# ── 2. Pull de la imagen y comparación de digest ──────────────────────
PREV_DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE_REF" 2>/dev/null || true)"
docker pull "$IMAGE_REF"
NEW_DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE_REF")"

echo "[mesa-deploy] digest previo  = ${PREV_DIGEST:-<ninguno>}"
echo "[mesa-deploy] digest nuevo   = $NEW_DIGEST"

if [[ "$PREV_DIGEST" == "$NEW_DIGEST" && "$FORCE" -eq 0 ]]; then
  echo "[mesa-deploy] Imagen sin cambios. Nada que hacer."
  exit 0
fi

# ── 3. Guardrail: chequear /health del contenedor activo ──────────────
if [[ "$SKIP_GUARDRAIL" -eq 0 ]]; then
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[mesa-deploy] Verificando /health del contenedor activo..."
    HEALTH_JSON="$(curl -fsS --max-time 5 "$HEALTH_URL" || true)"
    if [[ -z "$HEALTH_JSON" ]]; then
      echo "[mesa-deploy] /health no respondió. Procediendo (asume contenedor zombie)."
    else
      echo "[mesa-deploy] /health: $HEALTH_JSON"
      ACTIVE_PLAYERS=$(echo "$HEALTH_JSON" | grep -oE '"activePlayers":[0-9]+' | head -n1 | grep -oE '[0-9]+' || echo 0)
      ACTIVE_ROOMS=$(echo "$HEALTH_JSON" | grep -oE '"activeRooms":[0-9]+' | head -n1 | grep -oE '[0-9]+' || echo 0)
      ACTIVE_GAMES=$(echo "$HEALTH_JSON" | grep -oE '"activeGames":[0-9]+' | head -n1 | grep -oE '[0-9]+' || echo 0)
      if (( ACTIVE_PLAYERS > 0 || ACTIVE_GAMES > 0 )); then
        if [[ "$FORCE" -eq 1 ]]; then
          echo "[mesa-deploy] ⚠️  Hay jugadores/juegos activos pero --force activo. Continuando."
        else
          echo "[mesa-deploy] Guardrail: activePlayers=$ACTIVE_PLAYERS activeRooms=$ACTIVE_ROOMS activeGames=$ACTIVE_GAMES."
          echo "[mesa-deploy] Aborto: esperar siguiente ventana o usar --force."
          exit 75 # EX_TEMPFAIL
        fi
      fi
    fi
  else
    echo "[mesa-deploy] No hay contenedor activo. Procediendo a primer arranque."
  fi
fi

# ── 4. Recrear el contenedor ──────────────────────────────────────────
echo "[mesa-deploy] Recreando contenedor..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  # Stop con grace period suficiente para SIGTERM handler (30s).
  docker stop --time 35 "$CONTAINER_NAME" || true
  docker rm "$CONTAINER_NAME" || true
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --network host \
  --env-file "$ENV_FILE" \
  -v "$REPLAYS_VOLUME":/data/replays \
  --stop-timeout 35 \
  "$IMAGE_REF"

# ── 5. Health check post-deploy con rollback ──────────────────────────
echo "[mesa-deploy] Esperando /health..."
HEALTH_OK=0
for i in $(seq 1 30); do
  if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
    HEALTH_OK=1
    echo "[mesa-deploy] /health OK tras ${i}s"
    break
  fi
  sleep 1
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "[mesa-deploy] ❌ Health check falló. Iniciando rollback..."
  docker stop --time 5 "$CONTAINER_NAME" || true
  docker rm "$CONTAINER_NAME" || true
  if [[ -n "$PREV_DIGEST" ]]; then
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --network host \
      --env-file "$ENV_FILE" \
      -v "$REPLAYS_VOLUME":/data/replays \
      --stop-timeout 35 \
      "$PREV_DIGEST"
    echo "[mesa-deploy] Rollback completado a $PREV_DIGEST"
  else
    echo "[mesa-deploy] No había digest previo; no se pudo hacer rollback."
  fi
  exit 1
fi

echo "[mesa-deploy] ✅ Despliegue exitoso: $NEW_DIGEST"
