# Guía de Acceso y Actualización del Motor del Juego (VPS)

Este documento detalla el procedimiento exacto para conectarse al VPS que aloja el servidor de Colyseus (Motor del Juego) y cómo actualizarlo a la última versión luego de realizar cambios en el repositorio.

## 1. Credenciales y Acceso por SSH

**⚠️ IMPORTANTE:** El acceso operativo debe hacerse por SSH Key.
Durante la verificación del 2026-04-18 se confirmó acceso por key a la IP actual del VPS. Si el host sigue aceptando contraseña como fallback, no dependas de esa vía y vuelve a deshabilitarla después de recuperar acceso.

- **IP del VPS:** `157.254.174.201` (CubePath `vps21242.cubepath.net`)
- **Usuario:** `root`
- **Método de autenticación recomendado:** SSH Key (ED25519)

### Conexión rápida (si ya tienes el alias configurado):
```bash
ssh vps-mesa
```

### Conexión manual:
```bash
ssh -i ~/.ssh/id_ed25519_vps root@157.254.174.201
```

### Cómo configurar el alias `vps-mesa` en una máquina nueva:
Agrega lo siguiente a `~/.ssh/config`:
```
Host vps-mesa
   HostName 157.254.174.201
   User root
   IdentityFile ~/.ssh/id_ed25519_vps
   StrictHostKeyChecking no
```

### Cómo autorizar una nueva máquina/usuario:
1. En la máquina nueva, genera una key si no tienes:
   ```bash
   ssh-keygen -t ed25519 -C "tu-nombre@mesa-primera" -f ~/.ssh/id_ed25519_vps
   ```
2. Copia el contenido de `~/.ssh/id_ed25519_vps.pub`
3. Desde una máquina que ya tenga acceso, agrégala al VPS:
   ```bash
   ssh vps-mesa "echo 'PEGA_AQUI_LA_KEY_PUBLICA' >> /root/.ssh/authorized_keys"
   ```

### Keys autorizadas actualmente:
- `antigravity-mesa` — Key del agente de deploy
- `jose@mesa-primera` — Key de desarrollo de Jose (ubicada en `~/.ssh/id_ed25519_vps`)

> **Nota para automatización:** Usa la key directamente: `ssh -i ~/.ssh/id_ed25519_vps root@157.254.174.201 "comando"`. Ya no se necesita `expect` ni `sshpass`.

### Verificación rápida de acceso y versión desplegada:
Desde una máquina con la key autorizada, puedes confirmar conectividad y versión con:

```bash
ssh vps-mesa 'cd /root/Mesa_primera && echo VPS=$(git rev-parse HEAD) && echo GIT=$(git ls-remote origin refs/heads/main | cut -f1)'
```

Si ambos hashes coinciden, el VPS está en la última versión disponible en Git.

### En caso de emergencia (recuperar acceso si pierdes la key):
Accede al panel de CubePath → VPS Console (KVM/VNC) → Inicia sesión como root desde la consola web → Edita `/root/.ssh/authorized_keys` para agregar tu nueva key pública. O restaura el backup: `cp /etc/ssh/sshd_config.backup.20260407 /etc/ssh/sshd_config && systemctl restart ssh` para reactivar temporalmente el acceso por contraseña.

> **⚠️ La contraseña de emergencia del VPS NO debe almacenarse en el repositorio.** Consulta el gestor de secretos del equipo o al administrador.

---

## 2. Procedimiento de Actualización (modelo pull-based)

> **Cambio de modelo (2026-04):** se eliminó el flujo manual de `git pull` + `docker build` en el VPS.
> Ahora la imagen se construye en GitHub Actions y se publica a GHCR. El VPS hace `docker pull`
> mediante el script `mesa-deploy`, ya sea automáticamente (systemd timer en ventana 03–05h hora del
> VPS) o manualmente desde tu máquina por SSH. **GitHub no tiene credenciales del VPS.**

### Arquitectura del despliegue

```
┌─────────────┐   push main   ┌──────────────────┐   docker pull   ┌─────────┐
│  GitHub     │──────────────▶│ GHCR (registry)  │◀─────────────── │   VPS   │
│  Actions    │   build+push  │ ghcr.io/.../...  │   (PAT ro)      │         │
└─────────────┘               └──────────────────┘                 └─────────┘
       │                                                                ▲
       └─ NO acceso al VPS, NO SSH key.                                 │
                                                                        │
   Desarrollador  ────────────  ssh + mesa-deploy  ─────────────────────┘
   (su llave personal)
```

### Componentes

- **GitHub Actions** (`.github/workflows/main.yml`): job `publish-game-server-image` construye la imagen
  cuando un push a `main` pasa todos los tests, y la publica a `ghcr.io/<owner>/mesa-game-server` con
  tags `main` y `sha-<commit>`. Permisos del workflow: `contents: read`, `packages: write`.
- **GHCR**: registro privado de imágenes. El VPS lee con un PAT classic con scope `read:packages`.
- **`mesa-deploy`** (`infra/vps/mesa-deploy.sh`): script en el VPS que pulea, valida `/health`,
  recrea el contenedor y hace rollback si el health post-deploy falla.
- **`mesa-deploy.timer`** (`infra/vps/systemd/mesa-deploy.timer`): dispara `mesa-deploy.service`
  cada 15 min entre 03:00 y 04:45 hora local del VPS.
- **`/health` enriquecido**: el game-server expone `draining`, `activeRooms`, `activePlayers`,
  `activeGames`. El script aborta si hay jugadores/juegos activos (a menos que se pase `--force`).
- **Apagado limpio (SIGTERM)**: `index.ts` cierra Socket.IO, BullMQ y queues con timeout 30s.

### 2.1 Setup inicial del VPS (una vez)

```bash
# 1. Generar PAT classic en GitHub con SOLO scope `read:packages`.
#    https://github.com/settings/tokens
#    Vencimiento: 90 días. Anotar fecha de rotación.

# 2. Crear el archivo de configuración en el VPS:
ssh vps-mesa
mkdir -p /etc/mesa
cp /root/Mesa_primera/infra/vps/deploy.env.example /etc/mesa/deploy.env
chmod 600 /etc/mesa/deploy.env
nano /etc/mesa/deploy.env   # rellenar GHCR_OWNER, GHCR_USERNAME, GHCR_TOKEN

# 3. Instalar el script y unidades systemd:
install -m 0755 /root/Mesa_primera/infra/vps/mesa-deploy.sh /usr/local/bin/mesa-deploy
install -m 0644 /root/Mesa_primera/infra/vps/systemd/mesa-deploy.service /etc/systemd/system/
install -m 0644 /root/Mesa_primera/infra/vps/systemd/mesa-deploy.timer   /etc/systemd/system/

# 4. Habilitar el timer:
systemctl daemon-reload
systemctl enable --now mesa-deploy.timer
systemctl list-timers mesa-deploy.timer
```

### 2.2 Despliegue automático (sin intervención)

El timer corre cada 15 min en la ventana 03:00–04:45 (hora del VPS).

- Si la imagen `:main` cambió **y** no hay jugadores activos → recrea el contenedor.
- Si hay jugadores activos → aborta con código 75 y reintenta en 15 min.
- Si el `/health` post-deploy falla → rollback automático al digest anterior.

Logs de cada ejecución: `/var/log/mesa-deploy/*.log` y `journalctl -u mesa-deploy.service`.

### 2.3 Despliegue manual (desde tu máquina)

```bash
# Desde tu laptop, con tu llave personal:
ssh vps-mesa /usr/local/bin/mesa-deploy

# Forzar (saltar guardrail de jugadores activos):
ssh vps-mesa /usr/local/bin/mesa-deploy --force

# Fijar a un commit específico (en vez de :main):
ssh vps-mesa "IMAGE_TAG=sha-<full-commit-sha> /usr/local/bin/mesa-deploy"
```

### 2.4 Rollback explícito a un commit conocido

```bash
ssh vps-mesa "IMAGE_TAG=sha-<commit-anterior> /usr/local/bin/mesa-deploy --force"
```

### 2.5 Rotación del PAT de GHCR (cada 90 días)

```bash
# 1. Generar nuevo PAT en GitHub (read:packages).
# 2. Actualizar /etc/mesa/deploy.env con el nuevo valor.
# 3. Probar:
ssh vps-mesa /usr/local/bin/mesa-deploy
# 4. Revocar el PAT antiguo en GitHub.
```

---

## 3. Verificación

```bash
# Estado del contenedor
ssh vps-mesa "docker ps --filter name=mesa-backend"

# Logs del game-server
ssh vps-mesa "docker logs mesa-backend --tail 50 -f"

# Health enriquecido
ssh vps-mesa "curl -s http://127.0.0.1:2567/health"

# Próximo disparo del timer
ssh vps-mesa "systemctl list-timers mesa-deploy.timer"

# Logs del último deploy automático
ssh vps-mesa "ls -lt /var/log/mesa-deploy | head"
ssh vps-mesa "journalctl -u mesa-deploy.service -n 100 --no-pager"
```

`/health` debe responder algo como:

```json
{
  "status": "ok",
  "version": "0.17.8",
  "timestamp": "2026-04-27T03:14:00.000Z",
  "draining": false,
  "activeRooms": 0,
  "activePlayers": 0,
  "activeGames": 0
}
```

---

## 4. Modelo de seguridad

- **GitHub → VPS:** ninguna conexión. GitHub no posee llaves SSH del VPS.
- **VPS → GHCR:** PAT classic con scope **read:packages** (sin `repo`, sin `write:packages`).
  Almacenado solo en `/etc/mesa/deploy.env` con `chmod 600`. Nunca en git.
- **Workflow `publish-game-server-image`**: usa `GITHUB_TOKEN` con permisos mínimos
  (`contents: read`, `packages: write`). No requiere PAT ni secretos extra.
- **Manual:** lo realiza el desarrollador desde su máquina con su llave personal SSH.

