# Estudio de monetización — RolMatch

Objetivo: cubrir los costes de crecer (Supabase Pro ~25 $/mes, EAS ~19 $/mes,
Apple 99 $/año, Play 25 $ único, API de IA en fase 4) y, más adelante,
generar ingreso real. Punto de partida del PRD (§5 Fase 4): premium +
marketplace de GMs de pago.

## Principio rector

**El matching básico se queda gratis siempre.** Una app de matchmaking vive
de la liquidez (cuántas mesas y jugadores hay): cobrar por el core mata el
producto antes de nacer. Se monetiza lo que añade comodidad, visibilidad o
identidad — nunca lo que bloquea encontrar mesa.

## Modelos, de menos a más infraestructura

### 1. Apoyo voluntario (beta) — 0 € de infra
Botón «Apóyanos» (Ko-fi/BuyMeACoffee) + insignia cosmética de mecenas.
No paga facturas, pero **mide la intención de pago** de la comunidad antes
de construir nada. Recomendado durante la beta.

### 2. Premium por suscripción (modelo Tinder) — infra media
Candidatas a features premium (valor real sin dañar la liquidez):
- **Ver quién te ha dado like** en lista, antes de swipear (Tinder Gold;
  el dato ya existe: `likedGroup`/swipes recibidos).
- **Rewind**: deshacer el último swipe.
- **Boost**: mesa/perfil destacado en los feeds X días.
- **Filtros avanzados** del feed (sistema concreto, experiencia, estilo fino).
- **Cosméticos**: temas de tarjeta, marcos de retrato, insignias — a la
  comunidad rolera le encantan y no tocan el matching.
- Vitrina ampliada / más propuestas de personaje.

Precio orientativo para comunidad hispana (sensible al precio):
**2,99–4,99 €/mes o ~24 €/año**. Con ~15–25 suscriptores se cubren los
costes fijos de infraestructura — objetivo realista de primera etapa
(conversión freemium típica: 2–5 % de usuarios activos).

### 3. Boosts sueltos (micropagos) — infra media-baja
Pago único (1–3 €) por destacar una mesa 1 semana. Más fácil de vender que
una suscripción y sin gestión de recurrencia. Buen primer experimento de
pago real.

### 4. Marketplace de GMs de pago — infra alta (la apuesta a largo plazo)
Comisión del 10–15 % sobre mesas de pago (PRD). Requiere **Stripe Connect**
(pagos divididos, verificación de identidad de GMs, reembolsos/disputas,
facturación). Es el modelo con más techo — y además, al ser un **servicio
del mundo real**, las tiendas (Apple/Google) permiten cobrarlo fuera del
IAP, sin su comisión del 15–30 %. Dejarlo para cuando haya GMs activos.

### ❌ Publicidad
Descartada: audiencia nicho pequeña, CPMs bajos en español y destroza la
UX tipo Tinder.

## Infraestructura técnica

### La pieza clave: entitlements desacoplados del proveedor de pago
Antes de cualquier pasarela, una migración pequeña:

```sql
alter table profiles add column premium_until timestamptz;      -- null = no premium
alter table profiles add column premium_source text;            -- 'granted' | 'stripe' | 'iap' | 'promo'
-- solo el service role escribe (webhooks/admin); RLS de lectura propia
```

Con esto:
- **Alpha/beta**: se regala premium a los testers con un UPDATE
  (`premium_source = 'granted'`) — exactamente el plan previsto — y se
  construyen y prueban las features premium ANTES de tener pagos.
- El día que entren pagos, solo cambia QUIÉN escribe la columna.
- Gating en cliente (`isPremium`) + en servidor donde importe (p. ej.
  `boosted_until` en groups escrita solo por Edge Function).

### Pagos por plataforma
| Canal | Solución | Coste |
|---|---|---|
| **Web (Vercel) y APK directo** | **Stripe Checkout + Customer Portal + webhook** → Edge Function actualiza entitlements (mismo patrón que discord-match) | Sin cuota; ~1,5–2,5 % + 0,25 € por transacción |
| **App Store / Google Play** (cuando toque) | IAP obligatorio para bienes digitales → **RevenueCat** como capa única (free tier hasta ~2.500 $/mes de ingreso) | 15 % de comisión de tienda (programa small business) |
| **Marketplace GMs** | Stripe Connect (exento de IAP por ser servicio real) | Stripe + nuestra comisión 10–15 % |

Nota clave: mientras la distribución sea **web + APK por enlace** (la etapa
actual), Stripe solo es suficiente y no hay comisión de tiendas.

### Lo legal-mínimo antes de cobrar un euro
Alta de actividad (autónomo o sociedad), términos de servicio y política de
privacidad publicadas, e IVA UE (Stripe Tax lo automatiza). Nada de esto
hace falta para la etapa de `granted` a testers.

## Plan recomendado por etapas

1. **Ahora (0 €)**: migración de entitlements + construir 2–3 features
   premium (empezar por «ver quién te ha dado like» y Rewind) + concederlas
   gratis a los testers de la alpha. Se valida el VALOR antes que el cobro.
2. **Beta**: botón Ko-fi + insignia de mecenas. Medir.
3. **Primer cobro real**: Stripe Checkout en web (suscripción o boosts
   sueltos, lo que la beta sugiera). Solo cuando haya retención semana 4.
4. **Tiendas**: RevenueCat + IAP al publicar en App Store/Play.
5. **Marketplace GMs**: Stripe Connect cuando haya GMs con demanda real.
