# Seguridad

Documentacion de seguridad transversal del proyecto.

Estado actual:

- La seguridad admin y la politica de acceso viven en `docs/admin/ADMIN_SECURITY.md`.
- La deteccion anti-colusion actual es pasiva y se documenta entre `ADMIN_SECURITY.md` y `mejoras_anti_colusion.md`.

Archivos vivos:

- `mejoras_anti_colusion.md`: roadmap de endurecimiento futuro sobre el sistema anti-colusion.

Regla:

- Si una migracion toca auth, RLS, MFA, passkeys, sesiones o controles antifraude, esta carpeta o `docs/admin/ADMIN_SECURITY.md` deben actualizarse.
