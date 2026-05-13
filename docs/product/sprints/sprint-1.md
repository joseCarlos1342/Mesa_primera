# Documentación de Fase: Sprint 1 (Auth + Wallet + Depósitos + Anti-Fraude)

**Estado:** 100% Completado ✅

## Resumen del Sprint

El Sprint 1 se centró en asegurar el perímetro de ingreso de usuarios, administradores y la capa del Ledger Financiero. Se crearon los flujos completos de autenticación utilizando Supabase Auth y se protegió la capa de Server Actions implementando filtros de seguridad, rate limiters, y una arquitectura inmutable de transacciones.

## Hitos Completados

### 1. Sistema de Autenticación

- **Player OTP Login:** Se implementó `loginWithPhone` en Next.js Server Actions para orquestar con Supabase Auth (OTP Server-side). La vista de login se construyó bajo estrictas directivas de TailwindCSS v4 de alta calidad.
- **Player Registration:** Formulario construido para almacenar el número telefónico, nombre real (Full Name) y un tag/nickname. Los datos adicionales pasan al metadata del perfíl de Supabase.
- **Admin MFA:** Redirección automática de administradores a la página de verificación `mfa` TOTP tras validar las credenciales base, garantizando blindaje a las vistas corporativas.
- **Middleware Protected Routes:** El enrutador central de Next.js verifica los JWT tokens validando que perfiles `player` no puedan navegar a `(admin)` y viceversa.

### 2. Capa Anti-Fraude y Seguridad

- **Rate Limiting API:** Se implementó una lógica de Token Bucket con `ioredis` limitando a un umbral los intentos de inicio de sesión o acciones financieras por IP local / X-Forwarded-For.
- **Device Fingerprinting:** Tabla `user_devices` activa. Se registra el fingerprint base para un futuro matching de comportamientos maliciosos.

### 3. Ledger Financiero y Billetera (Wallet)

- **Player Wallet UI:** Panel en tiempo real que refleja el saldo unificado con visualización histórica (Ledger).
- **Flujo de Depósitos (Approve/Reject):** El administrador cuenta con la ruta `admin/deposits` para procesar comprobantes.
- **Flujo de Retiros:** Interfaz construida donde el jugador provee su CBU/Alias. El administrador decide aprobar la transacción impactando un descuento directo. Todo retiro congelado como `pending` pasa a un balance definitivo (`completed`/`failed`) manejado por la utileria Server Action `processTransaction()` modificando exclusivamente `balance`.

## Próximos Pasos (Sprint 2)

Al dominar el esquema monetario y de identidades, la etapa siguiente es construir el **Motor Core de Colyseus** donde comenzaremos a inyectar las partidas multijugador y barajar cartas de manera criptográficamente segura.
