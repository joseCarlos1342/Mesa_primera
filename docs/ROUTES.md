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

| URL                           | Método | Descripción                            | Estado                            |
| ----------------------------- | ------ | -------------------------------------- | --------------------------------- |
| `/login/player`               | Phone  | Login jugador — envía OTP por SMS      | ✅ Twilio configurado en Supabase |
| `/login/player/verify?phone=` | OTP    | Verificar código OTP del jugador       | ✅ UI lista                       |
| `/login/admin`                | Email  | Login administrador — email + password | ✅ Funcional                      |
| `/login/admin/mfa`            | TOTP   | Verificar 2FA del admin                | ✅ UI lista                       |

---

## Rutas del Player `(player)`

| URL                | Protegida | Descripción                          | Estado       |
| ------------------ | --------- | ------------------------------------ | ------------ |
| `/`                | ✅ Auth   | Home del jugador — Crear/Unirse mesa | ✅ Funcional |
| `/wallet`          | ✅ Auth   | Billetera — saldo + historial ledger | ✅ UI lista  |
| `/wallet/deposit`  | ✅ Auth   | Cargar fichas — subir comprobante    | ✅ UI lista  |
| `/wallet/withdraw` | ✅ Auth   | Retirar saldo — datos bancarios      | ✅ UI lista  |

---

## Rutas del Admin `(admin)`

| URL                  | Protegida | Descripción                     | Estado       |
| -------------------- | --------- | ------------------------------- | ------------ |
| `/admin`             | ✅ Admin  | Dashboard admin                 | ✅ Funcional |
| `/admin/deposits`    | ✅ Admin  | Bandeja de depósitos pendientes | ✅ Funcional |
| `/admin/withdrawals` | ✅ Admin  | Cola de retiros pendientes      | ✅ Funcional |

---

## Rutas Legacy (Redirects)

| URL            | Redirige a           | Notas                        |
| -------------- | -------------------- | ---------------------------- |
| `/deposits`    | `/admin/deposits`    | Página movida al panel admin |
| `/withdrawals` | `/admin/withdrawals` | Página movida al panel admin |

---

## Protección de Rutas (Middleware)

```
Sin sesión + no es auth → redirige a /login/player
Con sesión + en /login/admin → si es admin redirige a /admin, si no a /
Con sesión + en /login/* → redirige a /
Con sesión + en /admin/* → verifica rol admin, si no es admin redirige a /
MFA (/login/admin/mfa) → siempre accesible si hay sesión
```

---

## Server Actions

| Archivo                   | Funciones                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `auth-actions.ts`         | `loginWithPhone`, `verifyOtp`, `loginAdmin`, `verifyAdminTotp`, `enrollAdminTotp`, `signOut` |
| `actions/wallet.ts`       | `getWalletData`, `createDepositRequest`                                                      |
| `actions/withdrawals.ts`  | `requestWithdrawal`, `getPendingWithdrawals`                                                 |
| `actions/admin-wallet.ts` | `getPendingDeposits`, `processTransaction`                                                   |
| `actions/anti-fraud.ts`   | Device fingerprinting helpers                                                                |

---

## Supabase Config

| Variable                        | Valor                                      |
| ------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://bhwchdzfvhhhuxovrqio.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ver `.env.local`                           |
| Proyecto ID                     | `bhwchdzfvhhhuxovrqio`                     |

---

## Sprint 1 — Estado

| Tarea                             | Frontend | Backend | Notas                                                |
| --------------------------------- | -------- | ------- | ---------------------------------------------------- |
| Login OTP SMS (Supabase + Twilio) | ✅       | ✅      | Twilio configurado. ⚠️ Verificar Message Service SID |
| Login Email + 2FA TOTP admin      | ✅       | ✅      | Funcional (NULL email_change corregido)              |
| Registro simplificado (phone)     | ✅       | ✅      | shouldCreateUser: true + Twilio                      |
| Device fingerprinting             | ✅       | ⚠️      | Hook existe, falta probar con conexión DB            |
| Rate limiting                     | ❌       | ❌      | No implementado                                      |
| Middleware protección rutas       | ✅       | ✅      | Funcional con RLS + role check                       |
| Wallet — saldo + historial        | ✅       | ✅      | Conecta a Supabase                                   |
| Depósito — subir comprobante      | ✅       | ✅      | Storage + DB                                         |
| Admin — bandeja depósitos         | ✅       | ✅      | Ahora bajo `/admin/deposits`                         |
| Retiro — solicitud                | ✅       | ✅      | DB transactions                                      |
| Admin — cola retiros              | ✅       | ✅      | Ahora bajo `/admin/withdrawals`                      |
| Ledger inmutable                  | ✅       | ✅      | Transactions table = append-only ledger              |
