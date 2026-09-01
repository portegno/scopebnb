# Pendientes

Lo que falta hacer y por qué, para no volver a discutirlo desde cero. Una
sección por tema, y se borra cuando está hecho.

---

_Nada pendiente por ahora._

<!--
Hecho (31 ago 2026): Publicación programada del blog. Sin scheduler: al publicar
se puede fijar un `publishedAt` futuro y `listPublished()`/`getPublishedBySlug()`
filtran `publishedAt <= now` en memoria, así el post aparece solo a su hora. El
editor tiene selector de fecha/hora (zona local, guardado en UTC) con botón
"Schedule", y la lista del admin marca "Scheduled". Falta, del lado del worker de
agentes (otro repo, Agentes_etapa1), que la herramienta `publicar` acepte un
`cuando` opcional y escriba esa fecha; el sitio ya respeta el campo.
-->
