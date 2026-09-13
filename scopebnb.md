# ScopeBnB — biblia del proyecto

Fuente única de verdad del proyecto. Si algo acá contradice al `README.md`, gana
esto (el README quedó del scaffold inicial y menciona un stack que ya no es).
Escrito para que cualquiera (persona o sesión de Claude) se ubique sin contexto
previo. Se actualiza en el mismo movimiento en que cambia lo que describe.

Última actualización: 13 sep 2026.

---

## Qué es

Alquiler de un telescopio remoto de nivel profesional bajo cielos **Bortle 1** en
**Starfront Observatories, Rockwood, Texas** (~270 noches despejadas al año).
Cualquiera, desde cualquier lugar, saca astrofotografía sin tener equipo.

Dos modalidades:
- **Managed Imaging** (foto por encargo): el cliente elige target y encuadre; el
  equipo captura y entrega los lights + calibración (FITS) en 24 h. Add-on:
  imagen integrada por $25.
- **Remote Control (N.I.N.A.)**: el cliente maneja el rig él mismo. Plan estrella:
  **semana de 7 noches de corrido a $300 flat** (MOST POPULAR, se empuja a esto).
  También noche suelta.

El rig: William Optics RedCat 91 (91mm f/4.9) · montura ZWO AM5N · cámara color
ZWO ASI2600MC · rotador CAA · filtro Optolong L-Extreme · EAF · NUC con N.I.N.A.
Campo ancho ≈ 3.0° × 2.0° (nebulosas grandes y campos estelares, no galaxias chicas).

## Stack real (NO es lo que dice el README)

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind v4**.
- **Firebase**: Auth + **Firestore** (NO Supabase). Admin SDK server-side
  (`src/lib/firebase/admin.ts`, bypassa reglas); cliente solo create/read.
  Credenciales locales en `serviceAccountKey.json` (gitignored); en prod, ADC.
- **Firebase App Hosting** para el deploy (NO Vercel). Config en `apphosting.yaml`,
  secrets en Cloud Secret Manager.
- **PayPal** Orders v2 + Smart Buttons para pagos (NO Stripe).
- **Resend** para email. **GA4** para analytics.
- Framing tool: Aladin Lite en `public/framer/` (popup desde /book).

## Layout

```
src/app/(site)/     páginas públicas (book, pricing, faq, blog, dashboard, ...)
src/app/(landing)/  landings de campaña outbound (/l/club, /l/night) — de la Agencia
src/app/admin/      panel admin (orders, customers, newsletter, team, occupancy)
src/app/api/        route handlers (paypal, newsletter, discount, bookings, admin, ...)
src/components/      UI compartida
src/config/site.ts  marca, nav, ubicación, url, email (fuente de datos del sitio)
src/data/           data demo/seed, separada de la UI
src/lib/            firebase, paypal, email, newsletter, bookings, pricing, seo, ...
```

## Pagos (PayPal)

- Cobra a **contact@scopebnb.com**. Flujo: reservar → botón PayPal → captura
  server-side confirma la reserva. El monto SIEMPRE sale del booking en el server
  (`/api/paypal/order`), nunca del cliente. Hold de pago de 10 min con countdown.
- **Estado actual: pagos APAGADOS en prod** (modo request: "Confirm booking" →
  el admin cobra por fuera). `paymentsOn = !!NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Se
  prenden agregando las 3 vars a `apphosting.yaml` (el bloque está comentado ahí).
- **Requiere cuenta PayPal Business** (se puede como sole proprietor, sin empresa).
  Pendiente: crear app LIVE, cargar client id + secret, `PAYPAL_ENV=live`, deploy,
  compra de control. Ver memoria `scopebnb-payments`.
- Reglas de Firestore endurecidas: bookings solo create+read desde el cliente;
  update/delete solo Admin SDK. Comisiones PayPal se calculan y guardan (fee/net).

## Email (Resend)

- From `ScopeBnB <contact@scopebnb.com>`. `src/lib/email/client.ts` (`sendEmail`,
  `addToAudience`), gateado por `RESEND_API_KEY` (no-op sin key).
- **Confirmación de reserva**: al reservar (o al pagar, cuando haya pagos) se manda
  un email con logo + nota de Mike, 3 variantes (managed / remoto noche / remoto
  semana) con su política de clima. Idempotente (`confirmationEmailSentAt`).
  Copy sin em dashes. Ver `scopebnb-booking-emails`.
- **Deliverability**: el correo por Resend (`send.scopebnb.com`) autentica OK. El
  correo HUMANO de @scopebnb.com se arregló (SPF+DKIM+DMARC pasan). Ver `CORREO.md`.

## Newsletter + descuento

- Caja de suscripción (home/pricing/book). Colección `newsletterSubscribers`
  (Admin SDK). Fuente única del %/código: **`src/lib/newsletter/constants.ts`**.
- **Descuento primera sesión: 5%**, código **`FIRSTLIGHT5`** (el viejo
  `FIRSTLIGHT10` sigue aceptado como legacy). Se aplica en el checkout
  (`DiscountField`), se valida server-side contra el email del comprador
  (suscrito + primera vez), y se cobra/redime de verdad. Para cambiar el
  descuento: tocar SOLO `constants.ts`.
- **Opt-in de compradores**: al reservar, el comprador entra al newsletter (soft
  opt-in: aviso en el checkout + baja en cada email). Ver `scopebnb-newsletter`.

## SEO / GEO

robots.ts (permite bots de IA), sitemap dinámico, `public/llms.txt`, JSON-LD
(Organization/LocalBusiness/FAQ/BlogPosting) y Open Graph. Ver `scopebnb-seo-geo`.

## Deploy — LEER ANTES DE DESPLEGAR

- **Producción se sirve de la rama `main`.** (Antes hubo una rama temporal
  `deploy-weekly-sessions` para aislar WIP; se abandonó el 13 sep 2026 al converger
  todo a `main`. No volver a esa rama.)
- **Regla de oro: todo lo que va a producción se commitea y se pushea a `main`.**
  Nada de deployar ramas paralelas: dos ramas sirviendo prod se pisan (pasó, tiró
  las landings de campaña). Si `main` no compila, no se despliega nada.
- Rollout: `firebase apphosting:rollouts:create scopebnb --git-branch main`.
  Es async (vuelve antes de terminar). **Un build a la vez**: si hay otro en curso
  da 409, hay que esperar y reintentar. Verificar el resultado en la API de
  builds/rollouts o poll del sitio (no confiar en que "encoló" = "live").
- **Después de cada deploy, verificar** que sigan vivas las rutas críticas:
  ```
  for r in / /book /l/club /l/night /admin; do curl -s -o /dev/null -w "$r %{http_code}\n" "https://scopebnb.com$r"; done
  ```
- NUNCA commitear WIP de otras sesiones a `main` (históricamente `scripts/nina/*`
  y `src/components/session/SessionReport.tsx` estaban a medias).

## Convenciones

- **Copy del sitio en inglés, SIN em dashes** (—). Usar comas, dos puntos o punto.
- **Radius 4px** en botones y paneles (`rounded-[4px]`).
- Data demo/seed separada de la UI (en `src/data/`), componentes reutilizables.
- El "+10%" de Remote Control es el RECARGO del uso remoto, no el descuento.

## Coordinación entre sesiones

Varias sesiones de Claude tocan este repo (esta, y la **Agencia Portegno** que
maneja las campañas outbound y las landings `/l/*`). Reglas:
- Todos deployан `main`. Avisar antes de un rollout para no pisarse.
- La Agencia tiene un worker que chequea que las landings de campañas abiertas no
  den 404. Las landings son destino de mail en frío: un 404 quema un contacto único.
- Si una sesión no puede escribirle a otra directamente, Gabriel hace de puente.

## Punteros

- `PENDIENTES.md` — lo que falta hacer y por qué (se borra cuando está hecho).
- `CORREO.md` — autenticación de correo (DNS), qué NO tocar.
- `AGENTS.md` — reglas de esta versión de Next.js.
- Memorias de Claude (proyecto): `scopebnb`, `scopebnb-payments`,
  `scopebnb-booking-emails`, `scopebnb-newsletter`, `scopebnb-seo-geo`,
  `scopebnb-correo-dns`, `scopebnb-remote-week`, y más.
