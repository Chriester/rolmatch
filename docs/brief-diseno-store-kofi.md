# Brief para Claude Design — ficha de Play Store y página de Ko-fi

Documento autocontenido para pegar en la herramienta de diseño de Claude
(que no ve este repo). Junto a este texto, adjuntar SIEMPRE los assets
listados en §3 — sin ellos el diseño se inventará la marca.

> Nota de marca: «Roldr» es el nombre actual. La estrategia de marca
> definitiva está en manos de la encargada de marketing (ver
> pendientes.md); si el nombre cambia antes de publicar, solo cambia el
> wordmark — el resto del brief sigue valiendo.

## 1. Qué es el producto (para que el diseño hable con propiedad)

**Roldr** es una app de matchmaking para rol de mesa online **en español**,
estilo Tinder: los jugadores deslizan entre mesas y los GMs entre
candidatos. El algoritmo cruza **horario real (con zona horaria), sistema
de juego, experiencia y estilo de mesa**. Cuando hay match, la mesa tiene
**chat de grupo, chat 1-a-1, organización de sesiones con votaciones,
tiradas de dados en el chat** y cada jugador lleva su **vitrina de
personajes con hojas por sistema** (D&D 5e, Vampiro, Cthulhu, Blades…).
Progresión de XP y niveles **cosmética** (títulos roleros). Web + Android
(APK), gratis, sin anuncios.

- Público: roleros hispanohablantes 16+, tanto veteranos sin mesa como
  novatos que nunca encontraron grupo; también GMs buscando jugadores.
- Propuesta en una frase (tagline oficial, usar tal cual):
  **«Encuentra mesa. Encuentra grupo. Juega.»**
- Diferencia clave frente a foros/LFG de Discord: no publicas un anuncio y
  esperas — la app te cruza por compatibilidad real de horario y estilo, y
  el swipe hace que buscar grupo sea un juego en sí.

## 2. Identidad visual (exacta, no aproximar)

⚠ ACTUALIZADO 2026-08-16: la app adoptó el design system Roldr (fases F1-F5,
`docs/Roldr Design System/` manda). Paleta y tipografías vigentes:

- **Dark-only.** Fondo de página `#0A090C` · superficie `#131119` (borde
  sólido `#2E2839`).
- **Gradiente de marca** (100°): carmesí `#B01B5E` → ciruela `#8A2B76` →
  violeta `#5D4A93` (el dado del logo es arte entregado, no recrear).
- Acentos UI: lila `#C77DFF` (acento/interactivo) · verde éxito `#3FBF8F` ·
  rojo `#E5484D` · dorado premium `#E8A44C`.
- **Tipografía**: Outfit 700 para display/titulares, Manrope (400/600/700)
  para todo lo demás, JetBrains Mono para notación de dados; Nunito 900
  solo en sellos tipo sticker.
- **Tono de voz**: cercano, rolero y con humor ligero — en la app el like
  es «🎲 ¡CRÍTICO!» y el pass «💀 PIFIA»; se tutea siempre; español neutro
  con guiños de la afición (mesa, GM, one-shot, PJ). Nada corporativo.
- El logo es **arte entregado e intocable**: no recrear, no recolorear, no
  añadir efectos. Usar los PNG adjuntos tal cual sobre fondos oscuros.

## 3. Assets a adjuntar junto a este brief

1. `assets/logoicon.png` — d20 icosaedro con la «R», anillo orbital y
   destellos (2048², fondo transparente). Es EL icono.
2. `assets/logotext.png` — wordmark «Roldr» con el dado como «o» (2048²,
   transparente).
3. Pack de capturas reales de la app (login, feed de swipe, encuentros,
   chats, opciones) — pedírselas a Claude Code si no están a mano: las
   genera del rig de QA en un minuto.

## 4. Encargo A — Ficha de Google Play

Entregables que se piden al diseño, con sus límites duros:

| Pieza | Límite/spec | Notas |
|---|---|---|
| Título | ≤ 30 caracteres | «Roldr» + coletilla corta si cabe |
| Descripción corta | ≤ 80 caracteres | el gancho; aparece bajo el título |
| Descripción larga | ≤ 4000 caracteres | estructura: gancho → qué hace (bullets con emoji) → cómo funciona (3 pasos) → para GMs → gratis/sin anuncios → cierre con tagline |
| Icono | 512×512 px, PNG 32-bit | derivar de logoicon sobre `#0B0B12` |
| Feature graphic | 1024×500 px | dado + wordmark + tagline sobre fondo de marca |
| Capturas teléfono | mín. 2, ideal 6-8 · 1080×1920 aprox | capturas reales enmarcadas con un titular corto por captura («Desliza entre mesas», «Cuadra horarios solos», «Chat y dados incluidos»…) |

Claves de copy para la descripción larga (material, no texto final):
- Dolor: «te apetece jugar rol y no tienes grupo» / «tu mesa se deshizo» /
  «eres GM y te faltan jugadores».
- El matching cruza horario CON zona horaria (clave para hispanohablantes
  de dos continentes), sistema y estilo (combate↔narrativo, serio↔humor).
- Todo lo que pasa después del match ya está dentro: chat, sesiones con
  votación, recordatorios, dados, hojas de personaje.
- Gratis, sin anuncios, hecho por y para la comunidad rolera hispana.
- Cierre: «Encuentra mesa. Encuentra grupo. Juega.»

## 5. Encargo B — Página de Ko-fi

Contexto de negocio (docs/monetizacion.md): en beta NO se cobra nada; el
Ko-fi es **apoyo voluntario** para medir intención de pago y cubrir costes
de infraestructura (~25-45 €/mes cuando se salga de free tier). El premium
de la app se regala a los testers. No prometer features a cambio de dinero.

Entregables:

| Pieza | Spec | Notas |
|---|---|---|
| Foto de perfil | cuadrada (≥400²) | logoicon sobre `#0B0B12` |
| Banner/portada | ~1320×352 px | dado + wordmark + tagline |
| Texto «About» | 2-4 párrafos | quiénes somos (dos personas construyendo la app en abierto), a qué va el dinero (servidores, sin anuncios jamás), tono rolero |
| Nombre de objetivo | corto | p. ej. «Mantener los servidores tirando dados» |
| Mensaje de agradecimiento | 1-2 frases | el que Ko-fi envía tras donar; guiño rolero («+150 XP», «tirada de carisma superada») |

Recompensa prevista en producto (mencionable en el About): **insignia
cosmética de mecenas** en el perfil de la app. Nada más — el matching es
y será gratis (principio rector del proyecto).

## 6. Qué NO debe hacer el diseño

- Inventar features que no existen (marketplace, iOS, eventos…).
- Usar imágenes de sistemas con IP ajena (logos de D&D, arte de Wizards…):
  los sistemas se citan solo por nombre en texto.
- Salirse de la paleta o del dark-only, o recrear/retocar el logo.
- Copy en otro idioma o con «usted»: siempre español de tuteo.
