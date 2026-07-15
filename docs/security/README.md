# Seguridad

Documentacion de seguridad transversal del proyecto.

Estado actual:

- La seguridad admin y la politica de acceso viven en `docs/admin/ADMIN_SECURITY.md`.
- El sistema anti-trampas (multi-cuenta, colusion, chip dumping, auto-ban, score de riesgo) se documenta en `mejoras_anti_colusion.md`.

Archivos vivos:

- `mejoras_anti_colusion.md`: roadmap maestro del sistema anti-trampas. Recopila lo ya implementado (cron anti-colusion, `AntiCheatService`, `user_devices`, KPI de fraude), lo que falta del plan original (bloqueo pre-juego, chip dumping, confiscacion) y nuevas medidas (pagina `/admin/fraud` consolidada, score de riesgo, strikes auto-ban, notificacion proactiva).

Regla:

- Si una migracion toca auth, RLS, MFA, passkeys, sesiones o controles antifraude, esta carpeta o `docs/admin/ADMIN_SECURITY.md` deben actualizarse.
- Si se completa una fase del roadmap anti-trampas, mover los items de "Falta" a "Hecho" en `mejoras_anti_colusion.md` con commit hash referenciando la migracion+PR.
