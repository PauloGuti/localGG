# localGG

Compañero open source, gratuito y ligero para League of Legends. Ver [PLAN.md](PLAN.md) para la visión completa.

> localGG no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en producir o gestionar League of Legends.

## Desarrollo

```bash
pnpm install
pnpm dev:mock   # overlay con una partida simulada (no necesita LoL)
pnpm dev        # overlay real: lee la Live Client API en 127.0.0.1:2999
pnpm test && pnpm typecheck
```

Atajos: `Cmd/Ctrl+Shift+O` oculta/muestra el overlay, `Cmd/Ctrl+Shift+Q` cierra la app.
Para ver el overlay dentro del juego, usa **ventana sin bordes** (no pantalla completa exclusiva).

## Estructura
- `apps/desktop` — Electron (overlay transparente y click-through)
- `packages/engine` — motor de reglas puro + reglas editables en `rules/*.json`
- `packages/liveclient` — cliente de la Live Client API
- `packages/data` — Data Dragon con caché en disco
