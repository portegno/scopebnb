# Pendientes

Lo que falta hacer y por qué, para no volver a discutirlo desde cero. Una
sección por tema, y se borra cuando está hecho.

---

## Publicación programada del blog

**Para qué.** Los agentes de [Agencia Portegno](../Agentes_etapa1) escriben y
revisan posts solos, y Gabriel autoriza la publicación desde el chat. Falta poder
decir "publicalo el martes a las 9" en vez de solo "publicalo ahora". Sin eso,
publicar es siempre un acto en el momento, y el contenido sale cuando alguien se
acuerda en vez de cuando conviene.

**La forma más simple, y la que recomiendo: no hace falta ningún scheduler.**

Hoy `listPublished()` filtra `status == "published"` y ordena por `publishedAt`,
y la página del blog es `force-dynamic`, o sea que relee en cada request. Con eso
alcanza:

1. Al programar, se guarda `status: "published"` con `publishedAt` **en el
   futuro**.
2. `listPublished()` y `getPublishedBySlug()` agregan `publishedAt <= now` al
   filtro.
3. El post aparece solo, exactamente a su hora, sin cron, sin Cloud Function y
   sin nada corriendo de fondo.

El costo de esa decisión es que un post programado queda con `status:
"published"` aunque no sea visible, y eso puede confundir a quien lea el
documento suelto. Se compensa con un campo `programado: true` o mostrando en el
admin "Programado para el …" cuando `publishedAt > now`.

**La alternativa**, si se prefiere que el estado diga la verdad: agregar
`"scheduled"` a `PostStatus` y una tarea que lo pase a `published` a su hora. Es
más correcto de leer y necesita algo corriendo (Cloud Scheduler + una Function),
que es justo lo que la opción de arriba evita.

**Dónde tocar** (verificado el 31 ago 2026):

| archivo | qué |
|---|---|
| `src/lib/blog/store.ts:140` | `listPublished()`, agregar el filtro por fecha |
| `src/lib/blog/store.ts:148` | `getPublishedBySlug()`, lo mismo |
| `src/lib/blog/store.ts:115` | hoy estampa `publishedAt` al pasar a published; hay que respetar una fecha futura si viene dada |
| `src/lib/blog/types.ts` | `BlogPostPatch` tiene que aceptar `publishedAt` |
| `src/app/api/admin/blog/[id]/route.ts` | aceptar la fecha en el PATCH |
| `src/components/admin/PostEditor.tsx` | selector de fecha y hora al publicar |
| `src/app/admin/blog/page.tsx` | que la lista distinga programado de publicado |

**Ojo con la zona horaria.** El equipo está en Buenos Aires y el sitio le habla a
Estados Unidos: "martes a las 9" tiene que quedar sin ambigüedad. Guardar siempre
en UTC y mostrar en el admin con la zona explícita al lado.

**Lo que el sistema de agentes espera de esto.** La herramienta `publicar` del
worker (`Agentes_etapa1/src/herramientas/publicar.js`) hoy pone `status:
"published"` y `publishedAt: now`. Cuando esto exista, va a aceptar un `cuando`
opcional y escribir esa fecha. No hace falta ninguna API nueva: los agentes
escriben en Firestore con el Admin SDK, así que alcanza con que el sitio respete
el campo.
