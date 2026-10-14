# localGG — Estado del desarrollo

Última actualización: 2026-10-14. Repo: https://github.com/PauloGuti/localGG (público, MIT).
Visión completa en [PLAN.md](PLAN.md).

## Hecho

### Base y distribución
- Monorepo pnpm: `apps/desktop` (Electron + React) y `packages/{engine,liveclient,data,lcu}`.
- CI en GitHub (typecheck, tests, build, escaneo de secretos con gitleaks): pasa en `main`.
- Empaquetado con electron-builder (`pnpm --filter @localgg/desktop run pack` genera `localGG.app` en Mac; probado local).
- Auto-update con electron-updater contra GitHub Releases (solo en app empaquetada).
- Workflow `release.yml`: un tag `vX.Y.Z` construye Mac + Windows y publica el Release. **Nunca ejecutado todavía.**
- Protección de secretos: `.gitignore`, gitleaks en CI, `SECURITY.md`, Dependabot.

### Overlay en partida (verificado en una partida de práctica real, en Mac)
- Ventana transparente, click-through, siempre encima (en macOS es un `panel`, necesario para verse sobre el juego).
- Lee la Live Client API cada 1 s (`127.0.0.1:2999`) solo cuando hay partida.
- Muestra tiempo, oro y hasta 3 sugerencias de compra.
- Atajos: `Cmd/Ctrl+Shift+O` oculta/muestra, `Cmd/Ctrl+Shift+Q` cierra.
- Modo mock: `pnpm dev:mock` (partida simulada sin abrir LoL).

### Motor de reglas (`packages/engine`, 6 tests)
- Perfil de amenazas del equipo rival: % daño AD/AP, curanderos, tanques.
- Consciente de tu rol (AD / AP / tanque): no sugiere items que no te sirven.
- Solo propone compras alcanzables (máx. 1 500 de oro de diferencia); descuenta componentes que ya tienes.
- Reglas editables en `packages/engine/rules/*.json` (nombres validados contra el parche 16.20.1).

### LCU y localización (`packages/lcu`, 3 tests)
- Lee el lockfile del cliente (Mac y rutas típicas de Windows; `LOL_INSTALL_DIR` para instalaciones personalizadas).
- Verificado con el cliente real: idioma `es_MX` y fase de juego (`ChampSelect`).
- Los nombres de items se muestran en el idioma del cliente; las reglas siguen usando nombres en inglés.

## Pendiente por verificar mañana
1. **Nombres en español en el overlay.** Solo está probado con tests; hay que verlo en una partida (la app ya corre la última versión en `pnpm dev`).
2. Que las sugerencias tengan sentido con enemigos curanderos y distintos campeones propios (Ahri vs. tirador vs. tanque).
3. El workflow de release (Mac + Windows) y el auto-update: se prueban publicando un tag de prueba, p. ej. `v0.0.2`.

## Limitaciones conocidas
- **Mac sin firmar:** el auto-update de macOS no funciona sin firma (Apple Developer, 99 USD/año) y los usuarios verán el aviso de "desarrollador no identificado". Windows sí actualiza, con aviso de SmartScreen.
- **RAM:** ~240 MB entre los procesos de Electron; la meta era < 150 MB. Hay que medir y optimizar antes de publicar (la alternativa es Tauri).
- **Overlay fijo** arriba al centro; todavía no se puede mover ni configurar (tamaño, opacidad).
- **Reglas básicas:** solo antiheal, armadura y resistencia mágica. Sin conocimiento de builds por campeón ni del estado de la partida (ir ganando/perdiendo).
- **Sin tests del lado de Windows**: nunca se ha ejecutado en Windows.
- Windows: si el juego no está en una ruta típica, hace falta `LOL_INSTALL_DIR`; falta detectarlo desde el proceso del cliente.

## Siguientes pasos (orden propuesto)

### Mañana: Fase 2 — Champ select
1. **Detectar la fase del cliente** (`/lol-gameflow/v1/gameflow-phase`, ya probado; mejor por WebSocket del LCU) y mostrar el overlay también en la selección de campeón.
2. **Leer la sesión de champ select** (`/lol-champ-select/v1/session`): tu rol, picks y bans de ambos equipos.
3. **Runas automáticas con un clic**: elegir fuente de datos (propuesta: CommunityDragon + reglas básicas ahora, pipeline de meta después) y aplicarlas con `/lol-perks/v1/pages`. Con interruptor para activar/desactivar el auto-aplicado.
4. **Resumen de los rivales del lobby**: rango, winrate reciente y campeón principal vía LCU (`/lol-ranked`, `/lol-match-history`), sin API key.
   - Para probar hace falta una partida normal o personalizada (la herramienta de práctica no pasa por champ select).

### Después
- **Fase 3 — Datos de meta:** pipeline en GitHub Actions que genere un dataset por parche (requiere pedir clave de producción a Riot) y sugerencia de pick/ban.
- **Mejorar el motor en partida:** builds por campeón, estado de la partida, aviso de back, timers de objetivos.
- **Overlay configurable:** mover/redimensionar, opacidad, atajos, modo "legal estricto".
- **Release real:** probar `v0.0.x`, decidir firma de código (Apple Developer / SignPath), medir RAM y CPU.
- **IA opcional (post-partida):** modelo local (Ollama) y/o clave propia del usuario guardada con `safeStorage`; nada de claves en el repo ni servidor propio.
- Verificar la política de desarrolladores de Riot sobre recomendaciones en partida y registrar el producto (ver §9 de PLAN.md).

## Decisiones tomadas
- Electron (no Tauri por ahora), licencia MIT, nombre **localGG** (`openGG` descartado: ya existe y se parece a OP.GG).
- Empezar sin firma de código.
- IA opcional y local por defecto; las claves de cada usuario solo viven en su equipo.

## Cómo retomar
```bash
cd ~/Develop/Aplicaciones/localGG
git pull
pnpm install
pnpm test && pnpm typecheck
pnpm dev:mock   # sin LoL
pnpm dev        # con LoL abierto (ventana sin bordes)
```
