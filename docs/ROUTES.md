# Mesa Primera — Mapa de Rutas

> Última actualización: Sprint 1

---

## Credenciales de Prueba

| Rol    | Email / Teléfono        | Contraseña       | Notas                               |
| ------ | ----------------------- | ---------------- | ----------------------------------- |
| Admin  | gomezjose7042@gmail.com | Bvf79h1010152653 | Login vía email + password + 2FA    |
| Player | +573205802918           | — (OTP SMS)      | Login vía OTP SMS (requiere Twilio) |

---

## Rutas de Autenticación `(auth)`

| URL                           | Método | Descripción                            | Estado                       |
| ----------------------------- | ------ | -------------------------------------- | ---------------------------- |
| `/login/player`               | Phone  | Login jugador — envía OTP por SMS      | ✅ UI Premium / Twilio OK    |
| `/login/player/verify?phone=` | OTP    | Verificar código OTP del jugador       | ✅ UI Premium                |
| `/login/admin`                | Email  | Login administrador — email + password | ✅ UI Premium Estación Admin |
| `/login/admin/mfa`            | TOTP   | Verificar 2FA del admin                | ✅ UI funcional              |

---

## Rutas del Player `(player)`

| URL                | Protegida | Descripción                          | Estado                   |
| ------------------ | --------- | ------------------------------------ | ------------------------ |
| `/`                | ✅ Auth   | Home del jugador — Lobby VIP         | ✅ UI Premium Lobby Real |
| `/wallet`          | ✅ Auth   | Billetera — saldo + historial ledger | ✅ UI lista              |
| `/wallet/deposit`  | ✅ Auth   | Cargar fichas — subir comprobante    | ✅ UI lista              |
| `/wallet/withdraw` | ✅ Auth   | Retirar saldo — datos bancarios      | ✅ UI lista              |

---

## Rutas del Admin `(admin)`

| URL                  | Protegida | Descripción                     | Estado                  |
| -------------------- | --------- | ------------------------------- | ----------------------- |
| `/admin`             | ✅ Admin  | Dashboard admin — Centro Mando  | ✅ UI Premium Dashboard |
| `/admin/deposits`    | ✅ Admin  | Bandeja de depósitos pendientes | ✅ Funcional            |
| `/admin/withdrawals` | ✅ Admin  | Cola de retiros pendientes      | ✅ Funcional            |

---

## Sprint 1 — Estado Actualizado

- [x] **Login OTP SMS**: UI terminada con estética de lujo.
- [x] **Registro Pro**: Perfiles cuentan con Nombre, Nickname y Avatar SVG.
- [x] **Seguridad por Roles**: Middleware configurado para evitar cruce de sesiones.
- [x] **Botón de Salida**: Integrado globalmente con `SignOutButton`.
- [x] **Lobby & Admin**: Rediseñados con efecto glassmorphism y animaciones.
