# PRD — "RolMatch" (nombre provisional)
### App de matchmaking para grupos de rol de mesa online en español

**Versión:** 1.0 · **Fecha:** Julio 2026 · **Autor:** Chris

---

## 1. Visión

Conectar jugadores y grupos de rol de mesa hispanohablantes mediante un sistema de matching tipo swipe centrado en **grupos** (no solo 1-a-1), con integración profunda con Discord y perfiles duales: la persona y sus personajes.

**Online-first:** el MVP funciona 100% online para todo el mercado hispanohablante. El modo presencial por ciudades es fase posterior.

## 2. Problema

- Los jugadores hispanohablantes buscan grupo en foros de Roll20, r/lfg y servidores de Discord dispersos, sin filtros de compatibilidad real.
- Los competidores (RPGMatch, Demiplane) fallan en lo esencial: emparejan sin tener en cuenta zona horaria, idioma ni juegos en común, y no permiten que un **grupo existente** busque jugadores.
- Los grupos se disuelven por incompatibilidad de horarios y estilo de juego, un dolor recurrente documentado en la comunidad.

## 3. Usuarios objetivo

1. **Jugador suelto:** busca grupo o partida (campaña o one-shot).
2. **GM/Máster:** busca jugadores para su mesa.
3. **Grupo existente:** mesa con hueco que busca 1-2 jugadores compatibles.

## 4. Entidades y modelo conceptual

### 4.1 Perfil de persona
- Nombre/alias, avatar, bio corta.
- Zona horaria (auto-detectada) + franjas de disponibilidad semanal (matriz día × franja).
- Rol: jugador / GM / ambos.
- Sistemas que juega (D&D 5e, Pathfinder 2e, Cthulhu, Vampiro, indies…) con nivel de experiencia por sistema.
- Estilo de juego (sliders o tags): combate ↔ narrativo, serio ↔ humor, roleo pesado ↔ ligero.
- Preferencias: voz/texto, cámara sí/no, VTT preferido (Roll20, Foundry, solo Discord).
- Idioma(s) y verificación de cuenta Discord (OAuth).
- Safety tools que usa/espera (líneas y velos, tarjeta X…).

### 4.2 Perfil de personaje (diferenciador clave)
- Cada usuario puede crear y "exponer" **varios personajes** en su perfil, como una vitrina.
- Campos: nombre, sistema, clase/arquetipo, nivel, imagen/retrato, concepto en 1-2 frases, trasfondo breve.
- **Subida de hoja de personaje:** el usuario sube un PDF o imagen de su hoja, que queda adjunta y visible en el perfil del personaje. Los datos del perfil se rellenan manualmente. (Extracción automática con IA: pospuesta a fase futura, ver §5 Fase 4.)
- Estados: "buscando mesa", "en juego", "retirado/galería".
- Al hacer swipe, un GM puede ver qué personaje propone el jugador para su mesa.

### 4.3 Perfil de grupo (núcleo del producto)
- Creado por un GM o un miembro fundador.
- Campos: nombre de la mesa, sistema, campaña/one-shot, frecuencia y horario de sesión, plazas libres, nivel de experiencia buscado, estilo de mesa, VTT usado, enlace opcional a su servidor Discord.
- Miembros vinculados con sus perfiles (y personajes).
- El grupo hace swipe sobre candidatos y los candidatos sobre grupos → match bidireccional.

## 5. Funcionalidades por fase

### Fase 1 — MVP (semanas 1-6)
- [ ] Registro/login con Discord OAuth (+ email como fallback).
- [ ] Perfil de persona completo con disponibilidad y zona horaria.
- [ ] Creación de grupos con plazas y requisitos.
- [ ] Feed de swipe: jugadores ven grupos/GMs; grupos ven candidatos.
- [ ] Algoritmo de matching v1 (scoring, ver §7).
- [ ] Match → creación automática de canal/invitación en Discord (bot).
- [ ] Notificaciones push (nuevo match, mensaje del bot).
- [ ] Reportar/bloquear usuarios + moderación básica.

### Fase 2 — Personajes (semanas 7-9)
- [ ] Vitrina de personajes en el perfil (CRUD manual).
- [ ] Subida de hoja (PDF/imagen) como adjunto visible en el perfil del personaje (Supabase Storage, sin procesamiento).
- [ ] Propuesta de personaje al aplicar/swipear a una mesa.

### Fase 3 — Comunidad y retención
- [ ] Valoraciones post-sesión entre miembros (fiabilidad/asistencia, no "nota" pública agresiva).
- [ ] Calendario de sesiones + recordatorios vía bot de Discord.
- [ ] One-shots como formato de "primera cita" entre grupo y candidato.

### Fase 4 — Presencial, monetización y mejoras IA
- [ ] Modo presencial con geolocalización (PostGIS), lanzamiento ciudad a ciudad (Madrid primero).
- [ ] Premium: perfiles/mesas destacadas, filtros avanzados.
- [ ] Marketplace opcional de GMs de pago (comisión 10-15%).
- [ ] Extracción automática de datos de la hoja de personaje con IA (API de Claude con visión): rellena el perfil desde el PDF/imagen ya subido, siempre editable por el usuario antes de publicar.

## 6. Integración con Discord (crítica)

- **OAuth2** para login e identidad verificada (reduce fake profiles).
- **Bot propio** (discord.js):
  - Al producirse un match de grupo: crea canal privado en el servidor comunitario de la app, o genera invitación al servidor del grupo.
  - Recordatorios de sesión y confirmación de asistencia.
  - Comando para publicar una mesa desde Discord hacia la app.
- **No integrar Roll20** (sin API pública). Los grupos enlazan su VTT en el perfil. Considerar módulo de Foundry VTT en el futuro.

## 7. Algoritmo de matching v1 (sin ML)

Score ponderado en SQL/Edge Function. Filtros duros primero, score después:

**Filtros duros (excluyentes):**
1. Solapamiento real de disponibilidad horaria ≥ 1 franja (convertida a UTC — el fallo nº1 de RPGMatch).
2. Idioma compatible.
3. Sistema: al menos 1 en común (o "abierto a cualquiera").

**Score (0-100):**
- Solapamiento horario (nº de franjas comunes): 35%
- Afinidad de estilo de juego (distancia entre sliders/tags): 25%
- Sistema y experiencia: 20%
- Preferencias técnicas (voz/cámara/VTT): 10%
- Actividad/fiabilidad del perfil: 10%

## 8. Stack técnico

### 8.1 Frontend
- **React Native + Expo** (iOS, Android y web con una base).
- Navegación: Expo Router. Estado: Zustand o React Query.
- Librería de swipe: react-native-deck-swiper o gesto propio con Reanimated.

### 8.2 Backend
- **Supabase**: Postgres, Auth (con provider Discord), Realtime, Storage (avatares, hojas de personaje), Edge Functions (matching, webhooks del bot).
- Row Level Security en todas las tablas desde el día 1.

### 8.3 Esquema de datos (tablas principales)
`users`, `availability_slots`, `systems`, `user_systems`, `characters`, `character_sheets` (archivo + JSON extraído), `groups`, `group_members`, `group_openings`, `swipes`, `matches`, `reports`, `ratings`.

### 8.4 Bot de Discord
- Node.js + discord.js, desplegado en Railway/Fly.io (~5 $/mes) o como servicio junto a Edge Functions con webhooks.

### 8.5 Hojas de personaje (v1: subida simple)
- Subida de PDF/imagen a Supabase Storage (límite ~5 MB por archivo), vinculada al personaje.
- Visualización: imagen inline; PDF con visor o enlace de descarga.
- La tabla `character_sheets` conserva desde el día 1 un campo `parsed_data JSONB` (vacío por ahora) para que la futura extracción con IA no requiera migración.

### 8.6 Notificaciones
- Expo Push Notifications (gratis) en apps nativas; web push o avisos vía bot de Discord en la versión web.

### 8.7 Control de versiones y colaboración (GitHub)
- **Repositorio público en GitHub** desde el primer commit (valor de portfolio + colaboración).
- **README.md** cuidado: descripción del proyecto, capturas/GIF, stack, arquitectura, instrucciones de setup local (`.env.example` incluido), roadmap enlazando a este PRD.
- **Flujo de trabajo para 2 personas:**
  - Rama `main` protegida (no push directo); trabajo en ramas `feature/nombre-corto`.
  - Pull Requests con revisión del otro antes de mergear; squash merge para historial limpio.
  - Conventional Commits (`feat:`, `fix:`, `chore:`) — Claude Code los genera bien si se le indica en `CLAUDE.md`.
- **Issues + GitHub Projects** como tablero kanban con las fases de este PRD.
- **Secretos:** claves de Supabase/Discord solo en `.env` (en `.gitignore`); nunca en el repo. Compartir con el colaborador por gestor de contraseñas.
- **CI básica (GitHub Actions, gratis en repo público):** lint + tests en cada PR; opcionalmente deploy automático de la web a Vercel al mergear en `main`.
- **`CLAUDE.md` versionado en el repo:** así ambos colaboradores trabajan con Claude Code con las mismas convenciones y contexto.

## 9. Costes estimados

**Fase de validación (objetivo: 0 €):**

| Concepto | Coste |
|---|---|
| Supabase free tier | 0 $ |
| Web (Expo web + Vercel/Netlify) | 0 $ |
| Bot Discord vía webhooks/Edge Functions | 0 $ |
| GitHub (repo público + Actions) | 0 $ |
| Desarrollo en móvil con Expo Go | 0 $ |

**Al escalar / publicar en tiendas:**

| Concepto | Coste |
|---|---|
| Supabase Pro | 25 $/mes |
| Expo EAS (builds nativas) | ~19 $/mes |
| Dominio | ~15 $/año |
| Apple Developer | 99 $/año |
| Google Play | 25 $ (único) |
| API Claude (extracción hojas, fase 4) | ~5-20 $/mes según volumen |

## 10. Plan de desarrollo con Claude Code

| Semana | Hito |
|---|---|
| 1 | Repo GitHub (README, CI, `CLAUDE.md`), setup Expo + Supabase, esquema DB, auth con Discord |
| 2 | Perfiles de persona + disponibilidad + onboarding |
| 3 | Grupos: creación, plazas, perfil de mesa |
| 4 | Feed de swipe + algoritmo de matching v1 |
| 5 | Bot de Discord + flujo de match completo |
| 6 | Push, moderación, pulido, beta cerrada (TestFlight/Internal testing) |
| 7-8 | Vitrina de personajes (CRUD) + subida de hoja como adjunto |
| 9 | Propuesta de personaje a mesas + pulido |

**Consejos de trabajo con Claude Code:** un `CLAUDE.md` en la raíz con este PRD resumido, convenciones y esquema de DB; trabajar por features con commits pequeños; pedirle tests para el algoritmo de matching (es lo más delicado).

## 11. Métricas de éxito (beta)

- % de usuarios que completan perfil con disponibilidad: > 70%
- Tiempo hasta primer match: < 72 h
- % de matches que llegan a jugar una sesión (medible vía bot): > 30%
- Retención semana 4: > 25%

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| Masa crítica insuficiente | Lanzamiento online-first en todo el idioma; alianzas con servidores Discord y comunidades existentes |
| Matches que no cuajan | One-shots como "primera cita"; valoraciones de fiabilidad |
| Perfiles falsos/toxicidad | Discord OAuth obligatorio para match, reportes, moderación |
| Parsing de hojas impreciso | Siempre editable por el usuario antes de publicar |
| Dependencia de Discord | El grafo social y los datos viven en tu DB; Discord es canal, no plataforma |
