# localGG — Compañero open source para League of Legends

> Herramienta gratuita, local y ligera que ayuda al jugador a tomar mejores decisiones antes, durante y después de cada partida. Alternativa abierta a Blitz / Porofessor / U.GG Pro, sin suscripciones.

**Estado:** documento de diseño (v0.1). **Plataformas:** macOS y Windows. **Licencia propuesta:** MIT (o GPL-3.0 si se quiere impedir forks cerrados).

---

## 1. Principios

1. **Gratis y abierto.** Todo lo que las apps de pago ponen detrás de una suscripción, aquí es gratis.
2. **Local primero.** El análisis corre en la máquina del jugador. Sin cuenta, sin telemetría obligatoria.
3. **Ligero.** Objetivo: < 150 MB RAM y ~0% CPU en partida, para no restar FPS ni ms.
4. **En regla con Riot.** Solo usamos APIs oficiales o toleradas, nunca inyección, lectura de memoria ni automatización de acciones (ver §9).
5. **Información, no automatización.** La app sugiere; el jugador decide y ejecuta.
6. **Explicable.** Cada sugerencia muestra el porqué ("compra Mortal Reminder: el rival tiene 3 con curación").

---

## 2. Funcionalidades por fase de la partida

### 2.1 Pre-partida (lobby y champ select) — vía LCU
| Función | Detalle |
|---|---|
| **Sugerencia de pick** | Ranking de campeones según: tus estadísticas por campeón, meta del parche, sinergia con aliados ya elegidos, counters a los rivales ya elegidos, composición (AD/AP, frontline, engage, CC). |
| **Sugerencia de ban** | Qué baneas según tu pool, tu rol y los campeones que más te castigan (tu historial). |
| **Runas automáticas** | Página de runas óptima según campeón, rival de línea y composición; aplicada con un clic (o automática si el usuario lo activa). |
| **Hechizos y orden de habilidades** | Según matchup y rol (Flash D/F configurable). |
| **Build inicial y plan de items** | Core + botas + situacionales, guardado como *item set* en el cliente. |
| **Análisis del lobby** | Rango, racha, winrate reciente y *main* de aliados y rivales (cuando el cliente expone sus datos). |
| **Plan de partida** | Resumen: condición de victoria de tu equipo, power spikes, peligros del enemigo. |

### 2.2 En partida (overlay) — vía Live Client Data API
| Función | Detalle |
|---|---|
| **Recuadro "qué comprar"** | Pequeño y translúcido sobre el mapa. Según oro actual, build, items del rival y estado de la partida: "Con 1 250 oro: Serrated Dirk ahora, o espera 400 para Bloodthirster". |
| **Aviso de back** | Combina oro disponible, vida/maná, oleadas y timers: "Tienes 1 300 oro: back tras esta oleada compra X". |
| **Items situacionales** | Antiheal, anti-armadura, anti-AP, antiburst… según la composición rival real, no genérica. |
| **Poder relativo** | Comparación de oro, items y niveles tú vs. rival de línea y equipo vs. equipo. Detecta quién escala y quién debe jugar a tempo. |
| **Timers de objetivos** | Dragón, Barón, Heraldo, Atakhan/objetivos de temporada: respawn y prioridad según la partida. |
| **Tracker de jungla** | Con lo visible en eventos (campamentos, kills, ward vision): estimación de dónde puede estar el jungla rival. Si eres jungla: ruta sugerida, ventana de *gank*, *tempo* de clears. |
| **Cooldowns/Summoners rivales** | Seguimiento manual asistido ("Flash usado a las 12:30, vuelve a las 15:00"). |
| **Power spikes** | Avisos cuando un rival completa item clave o llega a nivel 6/11/16. |
| **Alertas de condición de victoria** | "Su equipo escala mejor: cierra antes de 25 min". |
| **Minimapa de ayuda** | Copia del minimapa en el overlay con flechas/zonas (no se modifica el minimapa del juego). |

### 2.3 Post-partida
| Función | Detalle |
|---|---|
| **Resumen de partida** | Oro por minuto, CS, visión, daño por oro, momentos clave (muertes evitables, objetivos perdidos). |
| **Revisión de decisiones** | Qué compraste vs. qué convenía, cuándo hiciste back, errores recurrentes. |
| **Tendencias** | Tu progreso por campeón/rol/parche; en qué eres peor que tu rango. |
| **Pool recomendado** | Qué campeones jugar/abandonar para subir. |
| **Coach opcional con IA** | Explicación en lenguaje natural de tu partida (ver §5.3). |

### 2.4 Utilidades
- Importación de builds/runas/item sets al cliente.
- Perfiles de overlay (posición, tamaño, opacidad, atajos).
- Modo "legal estricto": desactiva cualquier función en partida que Riot restrinja.
- Idiomas: ES / EN primero.

---

## 3. ¿Qué dan Blitz/Porofessor en sus versiones de pago, y qué haremos gratis?
> Basado en conocimiento general; **verificar** la oferta actual de cada app antes de publicar comparativas.

| Típico de pago | Nuestro equivalente gratis |
|---|---|
| Sin anuncios | La app no tiene anuncios, por diseño. |
| Estadísticas avanzadas de rivales (winrate con el campeón, últimas N partidas, tendencias) | Lo calculamos desde el historial que expone el LCU, sin API key. |
| Builds/runas "óptimas" por matchup | Dataset de meta por parche generado por un pipeline abierto (§5.2). |
| Análisis de composición y *win conditions* | Motor de reglas abierto (§5.1). |
| Plan de partida y sugerencias en vivo | Overlay + motor de reglas. |
| Revisión post-partida y coaching | Análisis local + coach IA opcional con la clave del propio usuario. |
| Personalización del overlay | Totalmente configurable, temas de la comunidad. |
| Sincronización entre dispositivos | Opcional vía exportar/importar un archivo (sin servidor propio). |

---

## 4. Arquitectura

```
┌────────────────────────── Electron (Mac/Win) ──────────────────────────┐
│ Main process (Node/TS)                                                 │
│  ├─ LCU service        → lockfile + WebSocket del cliente (WAMP)       │
│  ├─ LiveClient service → https://127.0.0.1:2999 (poll 1 s en partida)  │
│  ├─ Data service       → Data Dragon + dataset de meta (cache local)   │
│  ├─ Engine             → reglas + puntuación (módulo puro, testeable)  │
│  ├─ Store (SQLite)     → historial, perfil, ajustes                    │
│  └─ Updater            → electron-updater (GitHub Releases)            │
│ Renderer: ventana principal (React) + ventana overlay (transparente)   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Main + dos ventanas**: la principal (lobby, estadísticas, ajustes) se puede cerrar; el overlay solo existe en partida.
- **Engine como paquete aparte** (`packages/engine`): sin dependencias de Electron, para poder testearlo y reutilizarlo.
- **Monorepo** (pnpm workspaces): `apps/desktop`, `packages/engine`, `packages/lcu`, `packages/data`, `tools/dataset-pipeline`.
- **Overlay**: ventana sin marco, transparente, `alwaysOnTop` con nivel `screen-saver`, `setIgnoreMouseEvents(true)` salvo en modo edición (atajo). El jugador debe usar **ventana sin bordes** (en pantalla completa exclusiva no se puede dibujar encima).
- **Detección de partida**: el LCU avisa de cambios de fase (`Lobby → ChampSelect → InProgress → EndOfGame`); el polling solo empieza cuando hay partida y se detiene al terminar.

---

## 5. Motor de análisis

### 5.1 Capa 1 — Reglas deterministas (el núcleo, sin IA)
Todo lo "en vivo" se decide con lógica explícita: rápido, predecible, explicable y casi sin coste de CPU.

- **Perfil de amenazas rival**: a partir de campeones e items del enemigo se calcula % AD/AP, cantidad de CC, curación, escudos, burst, tanques → reglas tipo `si healing_rival >= umbral → sugerir antiheal`.
- **Motor de compras**: parte de la build objetivo (dataset) y la ajusta por situación. Cada candidato recibe una puntuación = valor de stats por oro + ajuste por amenaza + ajuste por estado de la partida (ganando/perdiendo) − coste de oportunidad. Se muestran 1–3 opciones con su razón.
- **Decisión de back**: función de oro disponible, próximo *breakpoint* de item, salud/maná, oleada y timers de objetivos.
- **Pick/ban**: puntuación ponderada = meta (winrate/pickrate del parche) + matchup + sinergia + tu dominio del campeón + necesidades de composición.
- **Reglas en YAML/JSON** versionadas en el repo, para que la comunidad las edite por PR sin tocar código.

### 5.2 Capa 2 — Datos (no inventamos la rueda)
| Dato | Fuente | Notas |
|---|---|---|
| Campeones, items, runas, imágenes | **Data Dragon** (Riot) / **CommunityDragon** | Gratis y sin clave. Cache local por parche. |
| Estado de partida en vivo | **Live Client Data API** | Local, oficial, sin clave. |
| Selección, runas, historial de jugadores del lobby, rangos | **LCU API** | Local, vía lockfile; sin clave. Cubre gran parte de lo que hacen las apps de pago. |
| Meta del parche (winrate, builds, runas, matchups) | **Dataset propio** generado por un pipeline | Ver abajo. |
| Historial profundo / rangos fuera del lobby | **Riot API** (opcional) | Solo con clave. |

**Pipeline de meta (clave para ser gratis):** un job programado (GitHub Actions) consulta la Riot API con una **clave de producción del proyecto**, agrega partidas de alto volumen por rango/rol/parche y publica un JSON comprimido (pocos MB) como **Release** del repo. La app lo descarga una vez por parche. Así:
- los usuarios **no necesitan clave** ni nosotros un servidor;
- la clave nunca va dentro de la app (un secreto en un binario público se filtra siempre);
- coste de infraestructura: cero.
- Riesgo: hay que solicitar a Riot una clave de producción (las personales caducan cada 24 h y tienen límites bajos). Alternativa de respaldo: dataset de la comunidad con licencia abierta o recolección desde los propios clientes (opt-in).

### 5.3 Capa 3 — IA (opcional, fuera del camino crítico)
Usar IA **no** es necesario para el overlay en vivo, y meterla ahí costaría latencia, recursos y dinero. La reservamos para donde aporta:

| Uso | Cómo |
|---|---|
| **Coach post-partida en lenguaje natural** | El usuario pega su propia clave (Anthropic/OpenAI/etc.) o usa un modelo local (Ollama). Enviamos un resumen estructurado, no datos personales. |
| **Preguntas libres** ("¿por qué perdí línea contra Darius?") | Mismo mecanismo, siempre opt-in. |
| **ML ligero offline** (fase tardía) | Un modelo pequeño de probabilidad de victoria entrenado en el pipeline y distribuido como archivo (~KB-MB), evaluado localmente con coste despreciable. |

Regla: la app debe funcionar al 100 % sin IA y sin conexión (salvo descargar datos).

---

## 6. Rendimiento (que no toque tus ms)
- Overlay con **DOM mínimo** (HTML/CSS; sin canvas pesado ni animaciones continuas). Se actualiza solo cuando cambian los datos.
- Polling a **1 Hz** (los datos de oro/items no cambian más rápido) y solo con partida activa.
- Ventana principal **descargada de memoria** al cerrarse; solo queda el proceso mínimo y el icono de bandeja.
- Cache agresiva en disco; ningún proceso de scraping en el cliente.
- Presupuestos medibles en CI/QA: RAM en partida, CPU promedio, tiempo de arranque. Se prueban en cada release.
- Alternativa futura si Electron pesa demasiado: **Tauri** (WebView nativo, ~10× menos RAM). Se diseña el código para que la UI sea portable (React + engine puro).

---

## 7. Distribución y actualizaciones automáticas
Objetivo: publicar desde tu máquina o CI, y que los usuarios reciban la actualización **dentro de la app**, sin reinstalar.

1. **Repositorio público en GitHub** con licencia, README, guía de contribución y `SECURITY.md`.
2. **electron-builder** genera instaladores: `.dmg`/`.zip` (macOS, arm64 + x64) y `.exe` NSIS (Windows).
3. **electron-updater** consulta los **GitHub Releases** al abrir la app, descarga el delta/instalador en segundo plano y ofrece "Reiniciar para actualizar".
4. **Flujo de release**:
   - Local: `pnpm release` (sube versión, construye y publica un Release en borrador); o
   - CI: al crear un tag `vX.Y.Z`, **GitHub Actions** compila Mac y Windows y adjunta los artefactos (recomendado: reproducible y sin depender de tu máquina; Mac y Win se construyen en runners nativos).
5. **Datos y app se actualizan por separado**: el dataset de meta cambia cada parche (~2 semanas) sin necesidad de nueva versión de la app.
6. **Firma de código** (importante para confianza y para que el auto-update funcione bien):
   - macOS: Apple Developer ID + notarización (99 USD/año). Sin firmar, el auto-update de macOS no funciona.
   - Windows: certificado de firma (o Azure Trusted Signing / SignPath, que tiene programa gratuito para open source). Sin firmar, aparece SmartScreen.
   - Hasta tener firma: lanzar versiones "sin firmar" con instrucciones claras y actualización manual en macOS.
7. Canal **stable** y **beta** (prereleases) para probar con voluntarios.

---

## 8. Estructura prevista del repo
```
localGG/
├─ apps/desktop/           # Electron (main, preload, renderer, overlay)
├─ packages/
│  ├─ engine/              # reglas + puntuación (puro TS, con tests)
│  ├─ lcu/                 # cliente del LCU (lockfile, REST, WebSocket)
│  ├─ liveclient/          # cliente de la Live Client API
│  └─ data/                # Data Dragon, cache, dataset de meta
├─ rules/                  # reglas editables (YAML/JSON) por la comunidad
├─ tools/dataset-pipeline/ # job que genera el meta por parche
├─ .github/workflows/      # CI, release, pipeline programado
├─ PLAN.md  README.md  LICENSE  CONTRIBUTING.md
```

---

## 9. Cumplimiento con Riot (líneas rojas)
**Permitido (base del diseño):** overlays encima del juego, Live Client Data API, LCU API, Data Dragon, Riot API con clave registrada, mostrar información que el jugador ya podría ver.

**Nunca haremos:**
- Inyección en el proceso del juego, lectura de memoria, hooks gráficos o modificar archivos del juego.
- Revelar información oculta (posición de enemigos fuera de visión, etc.).
- Automatizar acciones (clics, compras, habilidades).
- Evadir Vanguard o cualquier anti-cheat.

**A verificar antes de lanzar (riesgos reales):**
1. **Política de desarrolladores de Riot** (developer.riotgames.com): qué tipo de recomendaciones **en partida** están permitidas. Apps comerciales las muestran, pero confirmaremos la política vigente. Diseño con **interruptor por función** para poder desactivar lo que Riot restrinja.
2. **Registrar el producto** en el portal de desarrolladores y pedir la clave de producción para el pipeline.
3. Texto legal obligatorio: *"localGG no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en producir o gestionar League of Legends."*
4. **LCU**: no es API pública oficial, pero es de uso extendido; se mantiene con cuidado y sin abusar.
5. No usar marcas ni imágenes de Blitz/Porofessor; tampoco hacer ingeniería inversa de ellas (por eso **no usaremos REA sobre sus apps**; REA solo para analizar nuestro propio código o formatos documentados).

---

## 10. Hoja de ruta

| Fase | Entrega |
|---|---|
| **0 — Base** | Monorepo, Electron + React, CI, auto-update funcionando con un "hola mundo" firmado/sin firmar. |
| **1 — Overlay en vivo (MVP)** | Detección de partida, Live Client, recuadro "qué comprar" (reglas básicas), aviso de oro/back, timers de objetivos. |
| **2 — Champ select** | Conexión LCU, runas/hechizos automáticos, item sets, análisis del lobby. |
| **3 — Datos de meta** | Pipeline en GitHub Actions, dataset por parche, sugerencia de pick/ban. |
| **4 — Jungla y poder relativo** | Tracker de jungla, ruta/ganks si eres jungla, comparativa de poder, power spikes. |
| **5 — Post-partida** | Resumen, revisión de decisiones, tendencias, pool recomendado. |
| **6 — IA opcional** | Coach con clave propia/Ollama; modelo ligero de win-prob. |
| **7 — Comunidad** | Temas, reglas por PR, traducciones, plugins. |

---

## 11. Decisiones abiertas (a definir juntos)
1. **Electron vs. Tauri** (rapidez de desarrollo vs. consumo de RAM).
2. **Licencia**: MIT (máxima libertad) vs. GPL-3.0 (impide versiones cerradas/de pago basadas en el código).
3. **Firma de código**: ¿asumimos el coste de Apple Developer o arrancamos sin firmar?
4. **Nombre definitivo** (localGG es provisional; revisar que no choque con marcas existentes).
5. **Fuente de meta**: ¿pipeline propio con clave de producción, o dataset comunitario?
6. **Idioma de la interfaz** inicial y servidores/regiones soportados.
