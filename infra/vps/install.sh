#!/usr/bin/env bash
# Instalador de mesa-deploy en el VPS. Idempotente: se puede correr varias veces.
# Asume que /root/Mesa_primera/infra/vps/ existe (lo subimos por scp si no).
set -euo pipefail

SRC_DIR="${1:-/root/Mesa_primera/infra/vps}"
echo "[install] Fuente: $SRC_DIR"

# 1. Crear /etc/mesa
mkdir -p /etc/mesa
chmod 755 /etc/mesa

# 2. Si no existe deploy.env, copiar plantilla con permisos restrictivos.
if [[ ! -f /etc/mesa/deploy.env ]]; then
  cp "$SRC_DIR/deploy.env.example" /etc/mesa/deploy.env
  chmod 600 /etc/mesa/deploy.env
  echo "[install] /etc/mesa/deploy.env creado desde plantilla. EDITAR antes de habilitar el timer."
else
  echo "[install] /etc/mesa/deploy.env ya existe (no sobrescrito)."
fi

# 3. Instalar el script
install -m 0755 "$SRC_DIR/mesa-deploy.sh" /usr/local/bin/mesa-deploy
echo "[install] /usr/local/bin/mesa-deploy instalado."

# 4. Instalar units systemd
install -m 0644 "$SRC_DIR/systemd/mesa-deploy.service" /etc/systemd/system/mesa-deploy.service
install -m 0644 "$SRC_DIR/systemd/mesa-deploy.timer"   /etc/systemd/system/mesa-deploy.timer
systemctl daemon-reload
echo "[install] Units systemd instalados."

# 5. Crear directorio de logs
mkdir -p /var/log/mesa-deploy
chmod 755 /var/log/mesa-deploy

# 6. Reportar estado
echo ""
echo "──────────────────────────────────────────────────────────"
echo "Listo. Pasos pendientes (manuales):"
echo "  1. Editar /etc/mesa/deploy.env y poner GHCR_TOKEN real."
echo "  2. Probar: /usr/local/bin/mesa-deploy --skip-guardrail   # primer pull"
echo "  3. Habilitar timer: systemctl enable --now mesa-deploy.timer"
echo "──────────────────────────────────────────────────────────"
