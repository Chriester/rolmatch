# Assets base para la ficha de Play y Ko-fi (bug 14)

Generados por Claude Code con el rig de QA (`.claude/skills/qa-visual`)
contra producción (rolmatch.vercel.app), cuenta "Vaelen QA". Son **material
base**, no la entrega final — la diseñadora los enmarca, les pone titular y
compone el feature graphic a partir de aquí (ver `../brief-diseno-store-kofi.md`).

## `icon-512.png`

512×512, PNG 32-bit (RGBA), `logoicon.png` compuesto sobre `#0A090C` — tal
cual pide el brief §4. Listo para subir directo a Play Console.

## `screenshots/`

420×820 @2x → 840×1640 px reales. Por debajo de los 1080×1920 "ideal" del
brief, pero dentro de lo que Play acepta (mín. 320 px de lado, ratio
máx./mín. ≤ 2 — aquí da 1.95). Si hace falta el tamaño exacto, reescalar o
volver a capturar con un viewport mayor.

Cuenta QA sin mesas propias, así que dos capturas salen en estado vacío —
usables solo si la diseñadora quiere mostrar ese estado a propósito;
si no, mejor apoyarse en las otras 5:

| Archivo | Pantalla | Estado |
|---|---|---|
| `01-login.png` | Login | ✅ buena — logo, tagline, los 3 métodos de entrada |
| `02-feed-swipe.png` | Feed de swipe | ✅ buena — tarjeta de mesa real con datos |
| `03-encuentros.png` | Encuentros (likes) | ✅ usable — 1 encuentro real |
| `04-personajes.png` | Vitrina de personajes | ✅ buena — 3 personajes reales |
| `05-opciones.png` | Opciones | ✅ buena — ojo, enseña Premium activo (cuenta QA) |
| `06-chats-vacio.png` | Mis chats | ⚠️ vacío — la cuenta QA no está en ninguna mesa |
| `07-mesas-vacio.png` | Mis mesas | ⚠️ vacío — mismo motivo |

Para capturar `chats`/`mesas` con contenido real hace falta una cuenta que
sí sea miembro de una mesa — pide a Chris que genere una sesión de una
cuenta de prueba con mesa activa, o pídemelo y lo repito con esos datos.

## Lo que sigue faltando (trabajo de la diseñadora, no automatizable)

- Feature graphic (1024×500)
- Descripción corta (≤80) y larga (≤4000) — el brief trae las claves de copy
- Enmarcado + titular de cada captura elegida
- Banner de Ko-fi (~1320×352) y el texto "About"
