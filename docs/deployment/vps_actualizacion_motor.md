# VPS de Mesa Primera: aprovisionamiento seguro y operación

> Estado: el VPS está desactivado. Este documento es la fuente de verdad para
> crear su reemplazo. No reutilizar IP, host key, contraseñas ni configuraciones
> del servidor anterior sin validarlas.

Esta guía separa el **bootstrap inicial**, que requiere la consola del proveedor,
de la operación diaria con un usuario dedicado. El objetivo es exponer únicamente
HTTPS y un acceso administrativo restringido, mantener Redis en una red privada y
desplegar imágenes verificables desde GHCR con rollback.

## 1. Baseline aprobado

- Ubuntu Server 24.04 LTS minimal, x86_64, actualizado.
- Usuario humano operativo: `mesaops`; nunca iniciar sesión SSH como `root`.
- SSH exclusivamente con claves ED25519 protegidas por passphrase.
- Firewall del proveedor y UFW con política deny-by-default.
- Caddy como único punto público para HTTP/HTTPS y WebSocket.
- Game-server y Redis en la red Docker privada `mesa-internal`.
- Puertos `2567`, `2568` publicados solo en `127.0.0.1`; Redis no se publica.
- Secretos en `/etc/mesa`, propiedad `root:root`, modo `0600`.
- Datos persistentes en `/srv/mesa`; estado operativo en `/var/lib/mesa-deploy`.
- Docker controlado por un servicio systemd root; `mesaops` no pertenece al
  grupo `docker`, porque ese grupo equivale prácticamente a acceso root.
- Backups cifrados y fuera del VPS, con restauraciones ensayadas.

No desplegar sobre una distribución o arquitectura distinta sin validar primero
Docker, Playwright/Chromium, FFmpeg, Caddy, Redis y el apagado limpio de Colyseus.

## 2. Inventario obligatorio

Registrar en el gestor de secretos o inventario operativo, no en Git:

| Dato | Ejemplo | Regla |
|---|---|---|
| Proveedor e ID de instancia | `provider-instance-id` | Necesario para consola/KVM |
| IPv4/IPv6 | Asignadas al crear la instancia | No reutilizar valores antiguos |
| Dominio del game-server | `game.example.com` | DNS antes de activar Caddy |
| CIDR administrativo | `203.0.113.10/32` | Único origen permitido para SSH |
| Fingerprint ED25519 | `SHA256:...` | Obtener desde la consola del VPS |
| Responsable y suplente | Equipo de operaciones | Para incidentes y rotaciones |
| RPO/RTO | 24 h / 4 h, por ejemplo | Debe acordarse explícitamente |
| Ubicación de backups | Repositorio restic offsite | Nunca solo en el mismo VPS |

Usar UTC en el servidor. No codificar la IP del VPS en documentación ni código;
usar DNS y actualizar las variables de Vercel cuando cambie el hostname.

## 3. Topología y puertos

```text
Internet
  ├─ 22/tcp  ── SSH, solo desde ADMIN_CIDR o VPN
  ├─ 80/tcp  ── Caddy: redirect y ACME
  └─ 443/tcp ── Caddy TLS
                    ├─ 127.0.0.1:2567 Colyseus/HTTP
                    └─ 127.0.0.1:2568 Socket.IO

Docker network: mesa-internal
  ├─ mesa-backend
  └─ mesa-redis:6380, sin puerto publicado
```

| Puerto | Exposición | Uso |
|---|---|---|
| `22/tcp` | Restringido por CIDR/VPN | Administración SSH |
| `80/tcp` | Público | ACME y redirección HTTPS |
| `443/tcp` | Público | HTTPS/WSS mediante Caddy |
| `2567/tcp` | Solo loopback | Colyseus y `/health` |
| `2568/tcp` | Solo loopback | Socket.IO |
| `6380/tcp` | Solo red Docker privada | Redis |

Nunca publicar Docker API (`2375/2376`), Redis, Colyseus o Socket.IO directamente
a Internet. UFW no debe considerarse suficiente para corregir un puerto Docker
publicado en `0.0.0.0`; la publicación debe estar ligada a `127.0.0.1` desde el
propio `docker run`.

## 4. Bootstrap sin riesgo de bloqueo

### 4.1 Regla anti-lockout

Antes de cambiar SSH o firewall:

1. Confirmar acceso a consola/KVM del proveedor.
2. Mantener abierta la sesión inicial de consola/root.
3. Crear y probar `mesaops` en una **segunda sesión SSH**.
4. Probar `sudo -v` desde esa segunda sesión.
5. Permitir SSH en ambos firewalls.
6. Validar `sshd` antes de recargarlo.
7. Deshabilitar root y contraseña únicamente al final.

Si cualquier prueba falla, detenerse. No cerrar la sesión inicial hasta terminar
todo el checklist de esta sección.

### 4.2 Actualizar el sistema

Ejecutar únicamente desde la consola segura del proveedor:

```bash
apt update
apt full-upgrade -y
apt install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades \
  needrestart chrony jq openssl git restic auditd apparmor-utils
timedatectl set-timezone UTC
systemctl enable --now chrony
systemctl enable auditd
aa-status
```

Si se actualizó kernel u OpenSSH, reiniciar desde la consola antes de continuar y
confirmar que la instancia vuelve a estar accesible.

### 4.3 Crear el usuario operativo

```bash
adduser --gecos "Mesa Primera Operations" mesaops
usermod -aG sudo mesaops
install -d -o mesaops -g mesaops -m 0700 /home/mesaops/.ssh
```

La contraseña local de `mesaops` solo autentica `sudo`: debe ser única, aleatoria
y guardarse en el gestor de secretos. SSH por contraseña se deshabilitará.

En la estación de trabajo:

```bash
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/mesa_vps_ed25519 \
  -C "operador@mesa-primera"
```

Usar passphrase. Copiar **solo la clave pública** mediante la consola y verificar
propietario y permisos:

```bash
install -o mesaops -g mesaops -m 0600 /tmp/mesa_vps_ed25519.pub \
  /home/mesaops/.ssh/authorized_keys
rm -f /tmp/mesa_vps_ed25519.pub
```

Cada operador debe tener una clave diferente. No compartir claves privadas ni
usar una clave de agente como credencial humana.

### 4.4 Verificar identidad del host

Desde la consola del VPS:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Comparar esa fingerprint por un canal confiable antes de registrar el host:

```bash
ssh-keygen -R "$VPS_HOST" 2>/dev/null || true
ssh-keyscan -H -t ed25519 "$VPS_HOST" >> ~/.ssh/known_hosts
ssh-keygen -F "$VPS_HOST"
```

`ssh-keyscan` solo obtiene la clave; no demuestra su identidad. La seguridad
proviene de compararla con la fingerprint observada en la consola del proveedor.

Configuración local recomendada:

```sshconfig
Host vps-mesa
    HostName game.example.com
    User mesaops
    IdentityFile ~/.ssh/mesa_vps_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking yes
```

Prohibido usar `StrictHostKeyChecking no`.

### 4.5 Permitir SSH antes de endurecerlo

Primero crear en el firewall del proveedor una regla `22/tcp` desde el CIDR
administrativo. Después validar el valor y activar UFW mientras la sesión de
consola permanece abierta:

```bash
( set -euo pipefail
read -r -p 'CIDR administrativo (ej. 203.0.113.10/32): ' ADMIN_CIDR
python3 - "$ADMIN_CIDR" <<'PY'
import ipaddress, sys
ipaddress.ip_network(sys.argv[1], strict=False)
print('CIDR válido')
PY

ufw default deny incoming
ufw default allow outgoing
ufw allow proto tcp from "$ADMIN_CIDR" to any port 22 comment 'SSH administracion'
ufw show added
ufw --force enable
ufw status verbose
)
```

Abrir otra sesión como `mesaops` y ejecutar `sudo -v`. Solo después de confirmar
esa segunda sesión se puede continuar con el hardening de OpenSSH.

### 4.6 Endurecer OpenSSH

Crear `/etc/ssh/sshd_config.d/99-mesa-hardening.conf`:

```text
PubkeyAuthentication yes
AuthenticationMethods publickey
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
PermitRootLogin no
AllowUsers mesaops
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no
UsePAM yes
```

Comprobar que cloud-init u otro snippet no lo contradiga:

```bash
grep -RniE 'PermitRootLogin|PasswordAuthentication|KbdInteractiveAuthentication' \
  /etc/ssh/sshd_config /etc/ssh/sshd_config.d
sshd -t
sshd -T | grep -E \
  'permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|authenticationmethods|allowusers'
systemctl reload ssh
```

Sin cerrar la sesión inicial, abrir otra terminal:

```bash
ssh -o IdentitiesOnly=yes vps-mesa
sudo -v
```

También verificar que root y una clave incorrecta sean rechazados. La recuperación
se hace por consola/KVM agregando una nueva clave a `mesaops`; nunca reactivando
permanentemente contraseñas o root SSH.

## 5. Firewall y protección de acceso

Con SSH ya probado y restringido, abrir HTTP/HTTPS tanto en el firewall del
proveedor como en UFW:

```bash
ufw allow 80/tcp comment 'Caddy ACME HTTP'
ufw allow 443/tcp comment 'Caddy HTTPS WSS'
ufw show added
ufw reload
ufw status verbose
```

Si la IP administrativa es dinámica, establecer antes una VPN de administración;
no abrir SSH globalmente como solución permanente. `ufw limit 22/tcp` es solo una
medida temporal, no sustituye la restricción por red ni las claves.

Configurar `/etc/fail2ban/jail.d/sshd.local`:

```ini
[sshd]
enabled = true
backend = systemd
banaction = ufw
maxretry = 5
findtime = 10m
bantime = 1h
ignoreip = 127.0.0.1/8 <ADMIN_CIDR_VALIDADO>
```

```bash
fail2ban-client -t
systemctl enable --now fail2ban
fail2ban-client status sshd
```

Desde una red externa autorizada y otra no autorizada, revisar:

```bash
nmap -Pn -p 22,80,443,2567,2568,6380 "$VPS_HOST"
```

El resultado esperado es `80/443` públicos, `22` solo desde administración y los
demás puertos cerrados.

## 6. Actualizaciones de seguridad

Activar actualizaciones automáticas de seguridad, pero no reinicios desatendidos:

```bash
dpkg-reconfigure -plow unattended-upgrades
```

En `/etc/apt/apt.conf.d/52mesa-unattended-upgrades`:

```text
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
```

```bash
unattended-upgrade --dry-run --debug
systemctl list-timers apt-daily.timer apt-daily-upgrade.timer
```

Programar reinicios requeridos en una ventana sin jugadores, separada de backups
y despliegues. Los repositorios externos de Docker y Caddy deben revisarse aparte;
no asumir que `unattended-upgrades` los incluye.

## 7. Docker Engine

Instalar Docker desde su repositorio oficial, no mediante `curl | sh`:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin \
  docker-compose-plugin
systemctl enable --now docker
```

No añadir `mesaops` al grupo `docker`. Crear `/etc/docker/daemon.json`:

```json
{
  "live-restore": true,
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

```bash
dockerd --validate --config-file=/etc/docker/daemon.json
systemctl restart docker
docker info
docker network create --driver bridge mesa-internal
```

No configurar `"iptables": false`: Docker necesita sus reglas para aislar redes.
No habilitar la API TCP del daemon. La red no usa `--internal` porque el
game-server necesita salida HTTPS hacia Supabase y OneSignal; el aislamiento de
Redis se obtiene al no publicar ningún puerto y exigir autenticación.

## 8. Redis privado

Redis se ejecuta en `mesa-internal`, sin `ports:`. Usar una imagen aprobada y, en
producción, fijarla por digest después de probarla.

```bash
install -d -o root -g root -m 0750 /srv/mesa/redis
install -d -o root -g root -m 0700 /etc/mesa
```

Crear `/etc/mesa/redis.conf`:

```text
bind 0.0.0.0
port 6380
protected-mode yes
appendonly yes
appendfsync everysec
dir /data
aclfile /usr/local/etc/redis/users.acl
save 900 1
save 300 10
save 60 10000
```

Generar una contraseña de al menos 32 bytes y guardarla en el gestor de secretos.
Crear `/etc/mesa/redis-users.acl` sin introducir el secreto en el historial:

```text
user default on >REEMPLAZAR_CON_SECRETO ~* &* +@all
```

Antes de arrancar, obtener el UID de la imagen y restringir los archivos:

```bash
REDIS_IMAGE='redis:7-alpine' # sustituir por digest aprobado en producción
REDIS_UID="$(docker run --rm "$REDIS_IMAGE" id -u redis)"
chown root:root /etc/mesa/redis.conf
chmod 0644 /etc/mesa/redis.conf
chown "$REDIS_UID:$REDIS_UID" /etc/mesa/redis-users.acl /srv/mesa/redis
chmod 0400 /etc/mesa/redis-users.acl
chmod 0750 /srv/mesa/redis

docker run -d \
  --name mesa-redis \
  --restart unless-stopped \
  --network mesa-internal \
  --user "$REDIS_UID:$REDIS_UID" \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 128 \
  --memory 512m \
  --log-driver local \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --volume /etc/mesa/redis.conf:/usr/local/etc/redis/redis.conf:ro \
  --volume /etc/mesa/redis-users.acl:/usr/local/etc/redis/users.acl:ro \
  --volume /srv/mesa/redis:/data \
  "$REDIS_IMAGE" redis-server /usr/local/etc/redis/redis.conf
```

Verificar autenticación sin poner la contraseña en la línea de comandos:

```bash
docker exec -it mesa-redis redis-cli -p 6380 --askpass PING
docker port mesa-redis                  # no debe listar puertos
docker inspect mesa-redis --format '{{json .NetworkSettings.Networks}}'
```

BullMQ requiere un conjunto amplio de comandos Redis; por eso el usuario `default`
con contraseña conserva `+@all` dentro de una red privada. Revisar permisos más
granulares solo después de ejecutar toda la suite de workers.

## 9. Directorios y secretos

```bash
install -d -o root -g root -m 0700 /etc/mesa
install -d -o 1000 -g 1000 -m 0750 /srv/mesa/replays
install -d -o root -g root -m 0750 /var/lib/mesa-deploy
install -d -o root -g root -m 0750 /var/log/mesa-deploy
```

Archivos:

| Ruta | Contenido | Permisos |
|---|---|---|
| `/etc/mesa/deploy.env` | GHCR y parámetros del deploy | `root:root 0600` |
| `/etc/mesa/runtime.env` | Supabase, Redis, OneSignal e internos | `root:root 0600` |
| `/etc/mesa/redis-users.acl` | Credencial Redis | UID Redis, `0400` |

Ejemplo mínimo de `/etc/mesa/runtime.env`:

```env
NODE_ENV=production
REPLAY_DIR=/data/replays
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>
REDIS_HOST=mesa-redis
REDIS_PORT=6380
REDIS_PASSWORD=<mismo-secreto-del-acl>
REDIS_URL=redis://default:<password-percent-encoded>@mesa-redis:6380
ONESIGNAL_APP_ID=01eec15a-d02d-46f8-be84-9a5e9c3158f0
ONESIGNAL_REST_API_KEY=<secret-rest-de-onesignal>
INTERNAL_API_SECRET=<secret-compartido-con-la-web>
```

Actualizar secretos atómicamente con un archivo temporal y `install -m 0600`.
No editarlos en comandos, argumentos Docker, tickets, logs o Git. Cualquier usuario
con control de Docker puede leer los secretos del contenedor: limitar ese acceso.

## 10. Caddy y TLS

Instalar Caddy desde su repositorio oficial. DNS debe apuntar al VPS y `80/443`
deben estar abiertos antes de solicitar certificados:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  > /etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
chmod o+r /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
```

Ejemplo `/etc/caddy/Caddyfile`:

```caddyfile
game.example.com {
	encode zstd gzip

	@monitor path /colyseus*
	respond @monitor 404

	handle /socket.io/* {
		reverse_proxy 127.0.0.1:2568
	}

	handle {
		reverse_proxy 127.0.0.1:2567
	}

	log {
		output file /var/log/caddy/mesa-access.log {
			roll_size 10MiB
			roll_keep 10
			roll_keep_for 720h
		}
	}
}
```

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy
journalctl -u caddy --since -10m --no-pager
curl -fsS https://game.example.com/health
```

Validar también una conexión WSS real de Colyseus y Socket.IO. No habilitar
on-demand TLS ni exponer `/colyseus` sin autenticación.

## 11. Instalar el flujo de despliegue

Copiar un checkout verificado a una ruta temporal o `/opt`; nunca depender de
`/root/Mesa_primera`:

```bash
sudo /ruta/verificada/infra/vps/install.sh
sudoedit /etc/mesa/deploy.env
sudoedit /etc/mesa/runtime.env
sudo stat -c '%U:%G %a %n' /etc/mesa/*.env
sudo systemd-analyze verify /etc/systemd/system/mesa-deploy.service
sudo systemctl daemon-reload
```

El resultado esperado para ambos `.env` es `root:root 600`.

`mesaops` pertenece a `sudo`, por lo que sigue siendo una cuenta administrativa
con capacidad efectiva de root. La diferencia de seguridad es que no existe login
root remoto, cada operador usa una identidad individual y las elevaciones quedan
registradas. No añadirlo además al grupo `docker`: ese grupo permite saltarse el
flujo esperado de `sudo` y reduce la trazabilidad.

Primer despliegue:

```bash
sudo systemctl start mesa-deploy.service
sudo systemctl status mesa-deploy.service --no-pager
sudo journalctl -u mesa-deploy.service -n 100 --no-pager
sudo systemctl enable --now mesa-deploy.timer
systemctl list-timers mesa-deploy.timer
```

El script:

- impide ejecuciones concurrentes con `flock`;
- valida propietario y modo de los secretos;
- usa la red privada `mesa-internal`;
- publica `2567/2568` solo en loopback;
- elimina capabilities, impide nuevos privilegios y aplica límites;
- registra la imagen activa real para rollback;
- aborta si hay jugadores activos;
- restaura la imagen anterior si falla `/health`.

No usar `--force` salvo incidente aprobado y con un plan de compensación para las
partidas activas.

## 12. Backups y restauración

Respaldar, cifrado y fuera del VPS:

- `/srv/mesa/replays`;
- `/srv/mesa/redis` después de un snapshot coherente;
- `/etc/mesa`, Caddy y unidades systemd;
- inventario de tags/digests desplegados.

No respaldar `/var/lib/docker` como sustituto de las imágenes de GHCR.

Baseline sugerido con restic:

- backup diario;
- retención: 7 diarios, 5 semanales y 12 mensuales;
- `restic check` semanal;
- restauración de prueba mensual o trimestral;
- alerta si el último snapshot supera el RPO.

Antes del backup Redis:

```bash
docker exec -it mesa-redis redis-cli -p 6380 --askpass BGSAVE
```

Esperar a que finalice y ejecutar restic desde un servicio/timer separado. Un
backup no se considera válido hasta restaurar un replay y comprobar su checksum.
Los secretos solo se respaldan dentro de un repositorio cifrado con credenciales
separadas de las almacenadas en el VPS.

## 13. Observabilidad y mantenimiento

Comprobaciones regulares:

```bash
systemctl --failed
systemctl list-timers --all
ss -lntup
ufw status verbose
fail2ban-client status sshd
docker ps --no-trunc
docker stats --no-stream
docker system df
curl -fsS http://127.0.0.1:2567/health
curl -fsS https://game.example.com/health
journalctl -u mesa-deploy.service --since today --no-pager
journalctl -u caddy --since today --no-pager
```

`/health` debe devolver `roomCountersReliable: true`. El deploy aborta de forma
fail-closed si el endpoint no responde, devuelve JSON inválido, omite contadores o
no puede garantizar que los contadores de salas sean confiables. Solo `--force`
permite superar ese guardrail durante un incidente aprobado.

Configurar límites de journald en `/etc/systemd/journald.conf.d/mesa.conf`, por
ejemplo `SystemMaxUse=500M` y `MaxRetentionSec=30day`, según el disco disponible.
Monitorizar disco, memoria, CPU, certificados TLS, antigüedad de backups, errores
del dispatcher OneSignal y trabajos pendientes en `notification_outbox`.

## 14. Verificación de salida a producción

- [ ] Consola/KVM probada.
- [ ] Fingerprint SSH registrada y verificada.
- [ ] `mesaops` accede por clave y ejecuta `sudo -v`.
- [ ] Root, contraseña y keyboard-interactive rechazados por SSH.
- [ ] Firewall del proveedor y UFW activos.
- [ ] Solo `22` restringido y `80/443` son públicos.
- [ ] `2567`, `2568`, `6380` no responden externamente.
- [ ] `mesaops` no pertenece al grupo `docker`.
- [ ] Docker daemon validado y sin API TCP.
- [ ] `docker inspect mesa-backend --format '{{.Config.User}}'` devuelve `node`.
- [ ] Redis no publica puertos y exige autenticación.
- [ ] Secretos son `root:root 0600` y no aparecen en logs.
- [ ] Caddy sirve HTTPS válido y bloquea `/colyseus`.
- [ ] `/health`, Colyseus WSS y Socket.IO WSS funcionan.
- [ ] Deploy guardrail y rollback probados.
- [ ] Backups offsite y restauración de prueba completados.
- [ ] Actualizaciones automáticas sin reboot desatendido.
- [ ] OneSignal probado solo con una cuenta de prueba.

## 15. Push y OneSignal al restaurar el VPS

Supabase ya contiene el outbox y los triggers de notificaciones. Al volver a
activar el runtime:

1. Configurar `ONESIGNAL_APP_ID` y `ONESIGNAL_REST_API_KEY` en
   `/etc/mesa/runtime.env`.
2. Confirmar que `NEXT_PUBLIC_ONESIGNAL_APP_ID` sigue configurado en Vercel.
3. Desplegar el game-server y revisar:

   ```bash
   sudo docker logs mesa-backend --since 10m 2>&1 | \
     grep -E 'NotificationDispatcher|OneSignal'
   ```

4. Activar avisos con una cuenta de prueba.
5. Generar una recarga/retiro de prueba.
6. Confirmar inbox, Push y transición de `notification_outbox` a `accepted`.

No enviar un broadcast real para probar infraestructura.

## 16. Rollback e incidentes

Para volver a un commit publicado:

```bash
sudo /usr/local/bin/mesa-deploy --image-tag "sha-<git-sha>" --force
```

El uso de `--force` requiere verificar antes que no hay partidas activas. Distinguir:

- tag de commit: `sha-<git-sha>`;
- digest de registry: `repo@sha256:...`;
- image ID local: `sha256:...`.

En compromiso SSH:

1. aislar la instancia desde el firewall del proveedor;
2. preservar logs y snapshot forense;
3. rotar claves SSH, PAT de GHCR, Supabase, Redis, OneSignal e internos;
4. reconstruir desde una imagen limpia, no “limpiar” el host comprometido;
5. restaurar únicamente datos verificados;
6. documentar causa, impacto y acciones preventivas.

## 17. Fuentes oficiales

- Ubuntu OpenSSH: <https://ubuntu.com/server/docs/how-to/security/openssh-server/>
- Ubuntu automatic updates: <https://ubuntu.com/server/docs/how-to/software/automatic-updates/>
- Docker Engine security: <https://docs.docker.com/engine/security/>
- Docker firewall: <https://docs.docker.com/engine/network/packet-filtering-firewalls/>
- Docker Ubuntu install: <https://docs.docker.com/engine/install/ubuntu/>
- Redis security: <https://redis.io/docs/latest/operate/oss_and_stack/management/security/>
- Caddy automatic HTTPS: <https://caddyserver.com/docs/automatic-https>
- Caddy reverse proxy: <https://caddyserver.com/docs/caddyfile/directives/reverse_proxy>

Revisar estas fuentes al aprovisionar el servidor: las opciones de paquetes,
Docker, OpenSSH y systemd pueden cambiar entre versiones.
