# Handoff: Rolder — rediseño visual completo (feed de swipe + pantallas)

## Overview
Rediseño visual y de marca de la app de matchmaking de rol (repo Expo/React Native, antes «RolMatch», ahora **Rolder**). Cubre: feed de swipe estilo Tinder, panel de detalles con mini-grid semanal, overlay de match, vitrina de personajes (dorso de tarjeta), menú principal, login, onboarding (4 pasos), perfil de mesa, crear mesa, likes recibidos (teaser premium), matches, mis personajes, mis mesas y canjear código.

## Sobre los archivos de diseño
Los `.dc.html` de esta carpeta son **referencias de diseño en HTML** — prototipos que muestran el aspecto y comportamiento previstos, NO código de producción. La tarea es **recrear estos diseños en el codebase existente** (React Native + Expo, componentes en `src/components/swipe/`, pantallas en `src/app/`), respetando sus patrones: `react-native-reanimated` + `gesture-handler` para el swipe (ya implementado en `deck.tsx`), Expo Router, tema en `src/constants/theme.ts`.

## Fidelidad
**Alta (hifi).** Colores, tipografía, radios, espaciados y copys son finales. Recrear píxel a píxel con los componentes existentes.

## Marca
- Nombre: **rolder** (minúsculas), wordmark en Sora 800 con gradiente `#FF5A5F → #8B6CFF`, letter-spacing -0.02em.
- Icono/logo: hexágono d20 (clip-path `polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)`), gradiente 135deg `#FF5A5F → #8B6CFF`, con «20» en blanco Sora 800 centrado. Ratio ancho:alto ≈ 44:48.
- Icono de app: el mismo hexágono sobre squircle `#1B1B26` o directamente el gradiente.

## Design tokens
Colores:
- Fondo app: `#101018` · fondo página: `#0B0B12` · superficie tarjeta/fila: `#16161F` (borde `rgba(255,255,255,.08)`) · superficie input/botón oscuro: `#1B1B26`
- Violeta primario: `#8B6CFF` (secundario `#5865F2`, texto suave `#B9A6FF`/`#CBBAFF`)
- Verde like/éxito: `#3BD16F` (gradiente botón `135deg #3BD16F → #22A855`, texto sobre verde `#0B2416`, chip verde `#7FF2AC` sobre `rgba(59,209,111,.22)` borde `.6`)
- Rojo pass: `#FF5A5F` (sello: fondo `#FF5A5F`, texto/borde `#3D0A0C`)
- Dorado premium/boost: `#F5A623` (gradiente `#F5C34D → #D9902A`, texto `#3A2503`)
- Discord: `#5865F2`
- Texto: blanco con opacidades .85 / .55–.7 (secundario) / .45 (terciario)
Tipografía: **Sora** (400/600/700/800) para todo; **Nunito** 900 solo en los sellos sticker. Título tarjeta 26px/800; título pantalla 20px/800; labels de sección 11px/700 uppercase letter-spacing .08em color `#8B6CFF`; cuerpo 13–14px.
Radios: tarjeta swipe 20px · tarjetas/filas 14–16px · botones grandes 14px · chips 999px · sellos 14px.
Espaciado: padding pantalla 20px (login 32px) · gap entre filas 12px · gap chips 6–8px.

## Pantallas

### 1. Feed de swipe (`Prototipo RolMatch.dc.html` → `src/app/index.tsx`)
- Cabecera: logo (hex 24×27 + wordmark 21px) izquierda; avatar 38px (borde 2px `rgba(123,92,255,.7)`) derecha, abre menú.
- Tarjeta a sangre: imagen o fallback (gradiente de marca + emoji 110px). Ocupa todo el alto entre cabecera y botones, radio 20, sombra `0 10px 40px rgba(0,0,0,.45)`.
- Info inferior sobre degradado `transparent → rgba(10,10,18,.94)` (70px de fade): título 26px/800 + fila de chips translúcidos (`rgba(255,255,255,.14)`, borde `.25`, 11.5px/600) + chip verde de horario («📅 Sáb tarde · coincidís 3 h»).
- Badge % compatibilidad: pill arriba-dcha `rgba(0,0,0,.55)` + blur, borde blanco .3 — **oculto por defecto** (tweak `mostrarScore`).
- Banner superior (a 22px del borde): like recibido violeta `rgba(88,101,242,.92)`, one-shot verde `rgba(59,209,111,.88)` texto `#0B2416`, boost dorado `rgba(245,166,35,.92)`; 13.5px/800 centrado.
- Sellos (estilo sticker): **¡CRÍTICO! 🎲 ARRIBA-DERECHA** (rotado +8°, fondo `#3BD16F`, borde 3px `#0B2416`, sombra dura `4px 4px 0`) y **💀 PIFIA ARRIBA-IZQUIERDA** (rotado -7°, `#FF5A5F`/`#3D0A0C`). Nunito 900 19px. Opacidad = progreso del arrastre. ⚠️ Posiciones invertidas respecto a Tinder, decisión del cliente.
- Dorso (jugadores con personajes): tap alterna caras persona → personajes (indicador de barras 26×4px arriba); cara personaje: label «Personaje de X» 12px + nombre + chips clase/sistema/nivel + concepto en itálica 13px.
- Botones: ↩ rewind 46px (`#1B1B26`, icono `#F5A623`) · ✕ pass 64px (`#1B1B26`, borde 2px `#FF5A5F`) · **⚔ like 64px (gradiente verde, sombra `0 6px 18px rgba(59,209,111,.35)`)** · ⓘ info 46px (icono `#8B6CFF`). Gap 18px.
- Tira «Proponer:» bajo la tarjeta (solo mesas, si hay personajes «buscando mesa»): chips seleccionables violeta.
- Estado vacío: 🃏 + mensaje + botón outline violeta «Volver a empezar».

### 2. Física del swipe (parámetros para `deck.tsx`)
- Rotación: `(dx / anchoTarjeta) * 12°`. dy limitado a -40px al pintar.
- Umbral de decisión: **25% del ancho** (tweak elegido por el cliente; era 35%).
- Salida: 300ms ease-in hasta `±1.6 × ancho`. Muelle de vuelta: 320ms `cubic-bezier(.2,1.6,.4,1)`.
- Tarjeta siguiente detrás: `scale 0.95 → 1` proporcional al progreso.
- Arrastre hacia arriba (dy < -90, |dx| < 70): abre panel de detalles. Tap (< 6px de movimiento): gira la cara.
- Teclado (web): ← pass, → like.

### 3. Panel de detalles
Cubre el área de la tarjeta, fondo `#14141E`, borde blanco .1, radio 20, scroll interno, animación fadeDown 200ms. Secciones con label violeta uppercase: Sobre la mesa/Bio, Horario, **mini-grid semanal** (7 columnas L–D × 4 franjas Mañana/Tarde/Noche/Madrugada; celdas 22px radio 5: morado `rgba(139,108,255,.5)` = disponibilidad, verde `#3BD16F` = coincide con sesión, `rgba(59,209,111,.25)` + anillo blanco = sesión sin coincidencia, `rgba(255,255,255,.07)` = vacío; leyenda 10.5px), Estilo y mesa, Compatibilidad, Fiabilidad. Pie: «Reportar» y «Bloquear» en `#FF5A5F`.

### 4. Overlay de match
Pantalla completa `rgba(11,11,18,.92)` + blur 8px. Logo hexágono «20» 56×63 con animación pop (scale .7→1.06→1, 500ms) → «¡Es un match!» 34px/800 gradiente `#FF5A5F → #8B6CFF` → dos círculos 96px solapados -18px (mi avatar + su imagen/fallback) → subtítulo (menciona el canal de Discord del bot) → botones «💬 Ver mis matches» (gradiente verde) y «Seguir buscando» (outline blanco .3).

### 5. Menú principal (`app-menu.tsx`)
Backdrop `rgba(0,0,0,.55)`; panel 280px arriba-dcha (top 60, right 12), `#16171F`, radio 18, borde blanco .18. Fila usuario (avatar 44 + alias 17px/700), divisor, ítems (icono 18px + label 15px/600 + ›): 💘 Te han dado like · 🛡️ Mis mesas · 💬 Mis matches · 🧙 Mis personajes · 👤 Editar perfil · ✨ Canjear código; divisor; 🚪 Cerrar sesión en `#F3485B`.

### 6. Login (`Pantallas RolMatch.dc.html` pestaña Login → `login.tsx`)
Centrado vertical, padding 32px: logo hex 40×45 + wordmark 38px · tagline «Encuentra mesa. Encuentra grupo. Juega.» · botón Discord `#5865F2` («🎮 Continuar con Discord», estado busy «Conectando…») · divisor «o con tu correo» · input email (`#1B1B26`, borde blanco .15, radio 14) · botón outline violeta «Enviarme enlace de acceso» · aviso de éxito verde · nota legal 11px sobre la verificación por Discord.

### 7. Onboarding (4 pasos → `onboarding.tsx`)
Cabecera: título del paso 19px/800 + «Paso X de 4»; barra de progreso 4 segmentos (violeta = completado). Pie: «Atrás» outline + botón primario verde («Siguiente» / «⚔ Guardar y buscar mesa»), deshabilitado a opacidad .4.
- Paso 1 «Quién eres»: avatar 72px borde dashed violeta (tap = cambiar), Alias* (input), Tu rol (chips Jugador/a · GM/Máster · Ambos), Bio (textarea).
- Paso 2 «Cuándo juegas»: banner zona horaria auto («🌍 Europe/Madrid»), grid táctil 7×4 (celdas 34px radio 8, on: `rgba(139,108,255,.55)` borde `.9`), contador de franjas. Validación: ≥1 franja.
- Paso 3 «A qué juegas»: chips de sistema; cada tap cicla Novato → Intermedio → Veterano → quitar (tag de nivel dentro del chip); toggle «Abierto/a a cualquier sistema» (switch 40×22, verde on). Validación: ≥1 sistema u «abierto».
- Paso 4 «Cómo juegas»: 3 sliders 0-100 (Combate↔Narrativo, Serio↔Humor, Roleo ligero↔pesado, accent `#8B6CFF`), chips 🎙 voz / 🎥 cámara, chips VTT (Solo Discord/Roll20/Foundry/Otro).
- Al guardar: overlay check verde 84px + «Perfil guardado» + CTA al feed.
Chips seleccionados (patrón global): fondo `rgba(139,108,255,.3)`, texto `#CBBAFF`, borde `rgba(139,108,255,.8)`; no seleccionados: `rgba(255,255,255,.06)` / `.75` / `.18`.

### 8. Perfil de mesa (pestaña Mesa → `groups/[id].tsx`)
Hero 210px (imagen/fallback) con nombre 24px + chips sobre degradado (incluye chip verde «2 plazas libres»). Secciones: **Plazas** (avatares circulares 52px, GM con borde dorado `#F5A623` y label «· GM», huecos dashed violeta con +) · Sobre la mesa · Horario + mini-grid (mismo patrón que detalles) · **Estilo de la mesa** (3 barras de 6px con punto 14px violeta posicionado en %) · Preferencias (chips) · botones: vista propietario «🔗 Servidor de Discord» (`#5865F2`) + «✏️ Editar mesa» (outline); vista pública «✕ Paso» (outline rojo) + «⚔ Me interesa» (gradiente verde).

### 9. Crear mesa (pestaña Crear mesa → `groups/new.tsx`)
Formulario scroll: Nombre* (input) · Sistema* (chips) · Formato (Campaña/One-shot) · Frecuencia (Semanal/Quincenal/Mensual) · Sesión (7 chips de día 34px + 4 chips de franja) · Plazas libres (stepper − n +, 1–6) · Nivel buscado (Cualquiera/Novato/Intermedio/Veterano) · Mesa virtual (chips VTT) · Descripción (textarea) · «🛡 Publicar mesa» (verde, deshabilitado sin nombre+sistema). Éxito: overlay «¡Mesa publicada!» con CTA al perfil de mesa.

### 10. Te han dado like (pestaña Likes → `likes.tsx`)
Título + contador («3 likes te esperan»). **Free:** banner dorado gradiente con CTA «✨ Hazte premium»; filas con thumb difuminado (blur 7px), nombre «● ● ● ● ●», sub «Hazte premium para verlo». **Premium:** nombres visibles, sub «Esta mesa quiere ficharte» / «Quiere jugar en “X”», badge «💘 match» violeta. Filas: thumb 54px radio 12 + textos, fondo `#16161F`.

### 11. Mis matches (`matches.tsx`)
Tarjetas con thumb 54px + título (jugador: nombre mesa; GM: «Candidato → Mesa») + fecha; botón «Abrir canal en Discord» `#5865F2` o estado «⏳ El canal de Discord se creará en unos segundos…».

### 12. Mis personajes (`characters/`)
Subtítulo «Tu vitrina pública. Los GMs la ven al girar tu tarjeta.» Filas: retrato 64px radio 14 (fallback gradiente+emoji), nombre 15px/700, meta «Clase · Sistema · Nivel», chip «📄 hoja.pdf» si tiene hoja, pill de estado dcha: EN JUEGO (violeta), BUSCANDO MESA (verde), RETIRADA (gris). Tarjeta dashed «+ Nuevo personaje».

### 13. Mis mesas (`groups/index.tsx`)
Filas: thumb + nombre + meta «Sistema · Formato · Horario · plazas»; badge estado («3 CANDIDATOS» verde / «COMPLETA» gris); botón «⚔ Ver candidatos» outline violeta si busca gente. Tarjeta dashed «+ Crear mesa».

### 14. Canjear código (`promo.tsx`)
Centrado: ✨ 44px, título, blurb, input uppercase centrado con letter-spacing .12em, botón gradiente violeta «Canjear» (deshabilitado vacío), éxito verde con animación pop.

## Estado y datos
- Feed unificado por rol (mesas si jugador, candidatos si GM); likes recibidos primero.
- Estado del feed: index, cara activa (vitrina), proposedId, lastSwiped (para rewind, premium), match activo.
- Rewind deshace el último swipe salvo si hubo match.
- El % y las horas de solape vienen del algoritmo de matching existente (`src/lib/matching.ts`).

## Assets
Sin assets binarios: logo y sellos son CSS puro (clip-path + gradientes); imágenes de tarjeta = fotos de usuario/mesa con fallback gradiente+emoji (patrón ya existente en `card-shell.tsx`). Fuentes: Sora y Nunito vía Google Fonts / expo-font.

## Capturas (`screenshots/`)
Referencia visual de cada pantalla y estado. `feed-*` salen del prototipo interactivo (incluyen estados en vivo: sello ¡CRÍTICO! a media arrastre, dorso de personaje, overlay de match, menú abierto). `pantalla-*` cubren login, los 4 pasos del onboarding, perfil de mesa, crear mesa y los menús. Nota: `pantalla-08-likes` muestra la vista FREE (difuminada); la vista premium se describe en §10.

## Archivos incluidos
- `Prototipo RolMatch.dc.html` — feed de swipe interactivo completo (física, sellos, detalles, vitrina, match, menú). Configuración por defecto = decisiones del cliente (sellos sticker, umbral 25%, % oculto).
- `Pantallas RolMatch.dc.html` — login, onboarding, perfil de mesa, crear mesa, likes, matches, personajes, mis mesas, código (pestañas superiores = navegación de preview, no UI de la app).
- `Exploraciones RolMatch.dc.html` — direcciones descartadas y rondas de naming (contexto histórico, no implementar).
