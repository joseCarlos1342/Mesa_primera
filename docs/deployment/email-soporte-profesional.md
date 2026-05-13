# Implementacion de correo profesional de soporte

## Estado

La direccion `soporte@primerariveradalos4ases.com` ya esta operativa como correo de soporte profesional.

La implementacion quedo completada con:

- **Recepcion** mediante Cloudflare Email Routing.
- **Envio** mediante Brevo SMTP.
- **Alias operativo** en Gmail para uso diario del equipo.
- **Autenticacion del dominio** con SPF, DKIM y DMARC.

## Resultado funcional

- Los correos enviados desde `soporte@primerariveradalos4ases.com` llegan correctamente.
- El dominio ya aparece autenticado en Brevo.
- El envio saliente ya no depende de Gmail SMTP.
- La politica DMARC puede mantenerse en modo estricto.

## Configuracion activa

### Recepcion

- Proveedor: Cloudflare Email Routing
- MX activos: `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net`

### Envio

- Proveedor: Brevo
- Servidor SMTP: `smtp-relay.brevo.com`
- Puerto recomendado: `587` con TLS
- Autenticacion: credenciales SMTP de Brevo

### Cliente operativo

- Cliente: Gmail
- Seccion: `Configuracion > Cuentas e importacion > Enviar correo como`
- Remitente configurado: `soporte@primerariveradalos4ases.com`

## DNS de referencia

La implementacion depende de estos elementos:

- SPF del dominio incluyendo Cloudflare Email Routing y Brevo.
- DKIM de Cloudflare Email Routing para recepcion.
- DKIM de Brevo para envio.
- DMARC configurado en modo estricto.

Valor esperado de DMARC:

```txt
v=DMARC1; p=reject; sp=reject
```

## Notas operativas

- Si se cambia el proveedor SMTP en el futuro, revisar SPF, DKIM y DMARC antes de enviar correos reales.
- Si Gmail muestra un nombre personal como remitente, corregirlo en `Editar informacion` dentro de `Enviar correo como`.
- El nombre recomendado para el alias es `Soporte Mesa Primera`.

## Objetivo cumplido

Queda documentado que la implementacion del correo profesional de soporte ya fue completada y esta lista para uso operativo.