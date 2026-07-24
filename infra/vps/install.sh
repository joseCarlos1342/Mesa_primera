#!/usr/bin/env bash
# Instalador de mesa-deploy. Ejecutar con sudo desde un checkout verificado.
# Es idempotente y no sobrescribe secretos existentes.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "[install] Debe ejecutarse como root mediante sudo." >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${1:-$SCRIPT_DIR}"
echo "[install] Fuente: $SRC_DIR"

# 1. Crear /etc/mesa
mkdir -p /etc/mesa
chown root:root /etc/mesa
chmod 700 /etc/mesa

# 2. Si no existe deploy.env, copiar plantilla con permisos restrictivos.
if [[ ! -f /etc/mesa/deploy.env ]]; then
  cp "$SRC_DIR/deploy.env.example" /etc/mesa/deploy.env
  chown root:root /etc/mesa/deploy.env
  chmod 600 /etc/mesa/deploy.env
  echo "[install] /etc/mesa/deploy.env creado desde plantilla. EDITAR antes de habilitar el timer."
else
  echo "[install] /etc/mesa/deploy.env ya existe (no sobrescrito)."
fi

if [[ ! -f /etc/mesa/runtime.env ]]; then
  install -o root -g root -m 0600 /dev/null /etc/mesa/runtime.env
  echo "[install] /etc/mesa/runtime.env creado vacío. COMPLETAR antes del primer deploy."
else
  echo "[install] /etc/mesa/runtime.env ya existe (no sobrescrito)."
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
install -d -o root -g root -m 0750 /var/log/mesa-deploy
install -d -o root -g root -m 0750 /var/lib/mesa-deploy
# La imagen oficial node usa UID/GID 1000 para el usuario runtime `node`.
install -d -o 1000 -g 1000 -m 0750 /srv/mesa/replays

# 6. Reportar estado
echo ""
echo "──────────────────────────────────────────────────────────"
echo "Listo. Pasos pendientes (manuales):"
echo "  1. Completar /etc/mesa/deploy.env y /etc/mesa/runtime.env."
echo "  2. Verificar: stat -c '%U:%G %a %n' /etc/mesa/*.env"
echo "  3. Probar: systemctl start mesa-deploy.service"
echo "  4. Habilitar timer: systemctl enable --now mesa-deploy.timer"
echo "──────────────────────────────────────────────────────────"
