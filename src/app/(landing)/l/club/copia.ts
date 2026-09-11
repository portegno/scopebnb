/**
 * La página del club, en los tres idiomas en los que la casa puede sostener una
 * conversación.
 *
 * **Por qué el idioma viene en el link y no en la ruta.** Verónica escribe el
 * mail en el idioma del club porque su sitio no tiene versión en inglés, y la
 * página tiene que hablar el mismo idioma o el mail queda peor que si hubiera
 * ido en inglés: dice que alguien se tomó el trabajo de entrar en su idioma y
 * que después nadie lo terminó. El link ya sabe de qué cuenta es, así que
 * también sabe en qué idioma escribirle. Una ruta por idioma obligaría a
 * elegirla al armar el enlace, que es una decisión más que alguien olvida.
 *
 * **Los tres y no más.** El inglés es el que se puede sostener por escrito; el
 * español y el italiano existen porque la llamada de la primera noche se puede
 * hacer en los tres. Una página en alemán mandaría a un club a una llamada que
 * nadie de esta casa puede atender, y eso es peor que escribirle en inglés.
 *
 * **Lo que no se traduce.** Los nombres de catálogo (M31, IC 1396A, SHO), las
 * unidades y el nombre del filtro quedan igual en los tres: un astrofotógrafo
 * los lee en cualquier idioma y traducirlos los vuelve irreconocibles.
 */

export type Idioma = "en" | "es" | "it";

export const IDIOMAS: Idioma[] = ["en", "es", "it"];

/** El que habla la página cuando el link no dice nada. */
export const POR_DEFECTO: Idioma = "en";

export const esIdioma = (x: unknown): x is Idioma =>
  typeof x === "string" && (IDIOMAS as string[]).includes(x);

type Paso = { n: string; t: string; d: string };
type Objecion = { q: string; a: string };

export type Copia = {
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    imageAlt: string;
  };
  form: { cta: string; hint: string; done: string };
  oferta: { kicker: string; title: string; lead: string; cuenta: string };
  datos: { noches: string; precio: string; bortle: string; despejadas: string };
  galeria: { kicker: string; title: string; lead: string };
  objetivos: { m31: string; m31cat: string; ancho: string; cerca: string; banda: string };
  crudo: {
    kicker: string;
    title: string;
    lead: string;
    mono: string;
    duo: string;
    alt: string;
    pie: string;
  };
  mike: { kicker: string; title: string; alt: string; p1: string; p2: string };
  equipo: { kicker: string; title: string; lead: string };
  pasos: { kicker: string; title: string; items: Paso[]; guia: string; guiaLink: string; guiaFin: string };
  objeciones: { kicker: string; title: string; items: Objecion[] };
  cierre: { title: string };
};

const EN: Copia = {
  meta: {
    title: "A week of Bortle 1 for your club",
    description:
      "Seven consecutive nights on a professional rig under Bortle 1 skies, driven by your members through N.I.N.A. Every frame is yours.",
  },
  hero: {
    eyebrow: "For astronomy clubs",
    title: "Your club's gear is fine. Your sky isn't.",
    sub: "Seven consecutive nights on a professional rig under Bortle 1 skies in West Texas, driven by your own members. $300 for the week, which across a membership is a few dollars a head.",
    imageAlt: "Emission nebula photographed from the ScopeBnB rig in Rockwood, Texas",
  },
  form: {
    cta: "Ask about a week",
    hint: "One email. We'll reply with the open weeks and what the club needs to decide.",
    done: "Got it. We'll write back with the weeks that are open and what the club needs to decide.",
  },
  oferta: {
    kicker: "What the club gets",
    title: "One week, and everything that comes out of it.",
    lead: "Seven nights in a row on the rig, a half-hour call on the first night so somebody in the club knows how to drive it, the remote imaging guide in writing, and every frame from all seven nights. Three hundred dollars, flat, no subscription.",
    cuenta:
      "The arithmetic is the part that only works for a club: split across thirty members it's ten dollars each, for a sky none of them can reach from home at any price.",
  },
  datos: { noches: "Nights", precio: "Flat price", bortle: "Bortle", despejadas: "Clear nights / yr" },
  galeria: {
    kicker: "What comes out of it",
    title: "Targets shot on this rig.",
    lead: "The same telescope your members would be driving, on the nights it was pointed at these. Wide field, detail and a narrowband treatment of the same object: what comes back is material, so how it ends up looking is still your decision.",
  },
  objetivos: {
    m31: "Andromeda Galaxy",
    m31cat: "M31 · with M32 and M110",
    ancho: "Elephant's Trunk Nebula",
    cerca: "The same field, closer",
    banda: "And processed as narrowband",
  },
  crudo: {
    kicker: "What comes back",
    title: "One frame of seventy-four. Times seven nights.",
    lead: "A single 180-second exposure through a dual-narrowband filter, auto-stretched and nothing else done to it. Drag to see how the same data reads in mono and in duochrome. One night is 74 of these; the week is seven of those nights.",
    mono: "Mono",
    duo: "Duochrome",
    alt: "Crescent Nebula (NGC 6888), single 180-second L-Extreme exposure",
    pie: "Crescent Nebula (NGC 6888) · 180 s · Optolong L-Extreme · 11 July 2026 · one light frame of 74",
  },
  mike: {
    kicker: "Night one",
    title: "Somebody walks you through it before you touch anything.",
    alt: "Mike, from ScopeBnB, standing beside the imaging rig",
    p1: "Half an hour on a call with whoever in the club is going to drive: connecting to the rig, finding the target, framing it, focus, and starting the first sequence. By the end of it the club has taken its own first frame.",
    p2: "You keep the written guide too, so the member who wasn't on the call on Monday can still take the scope on Thursday.",
  },
  equipo: {
    kicker: "The rig",
    title: "What it can frame.",
    lead: "If your members already image remotely, the question is not whether this rig is good. It is whether it frames what yours cannot. That is a focal length question, so here is the answer first.",
  },
  pasos: {
    kicker: "How a week works",
    title: "Three things happen, in this order.",
    items: [
      {
        n: "01",
        t: "Pick your week",
        d: "Seven nights in a row, on dates that suit the club. One rig, one sky, so the calendar is real availability and not a queue.",
      },
      {
        n: "02",
        t: "Half an hour on night one",
        d: "A live call with whoever will be driving: connecting, framing, focus, and starting a sequence. After that the week is yours.",
      },
      {
        n: "03",
        t: "Everyone keeps everything",
        d: "Every light frame and every calibration frame from all seven nights. Split them, stack them, or have five members process the same data and compare.",
      },
    ],
    guia: "The written guide is ",
    guiaLink: "the remote imaging guide",
    guiaFin: ". It's the same one we walk through on the call.",
  },
  objeciones: {
    kicker: "Before you ask",
    title: "The four questions every club asks.",
    items: [
      {
        q: "Does someone in the club need to know N.I.N.A.?",
        a: "No. That's what the first-night call is for, and you get the remote imaging guide in writing so nobody has to remember it. If a member already runs N.I.N.A. at home, they'll be at ease in ten minutes: it's the same software, pointed at better sky.",
      },
      {
        q: "What if the week is clouded out?",
        a: "Around 270 nights a year are clear here, so a whole week lost is unlikely. Weather isn't your problem either: nights lost to cloud are made up. That's why the week is sold as seven nights and not as seven dates.",
      },
      {
        q: "Can several members use it during the week?",
        a: "Yes, and that's the point. The club decides who drives which night. Nothing stops you from giving each night to a different member, or running one long project across all seven.",
      },
      {
        q: "Who owns the data?",
        a: "You do. All of it, raw, with calibration. There's no watermark, no exclusivity and nothing held back. What your members do with it afterwards is entirely theirs.",
      },
    ],
  },
  cierre: {
    title: "Seven nights under the darkest sky in Texas, and your members keep every frame.",
  },
};

const ES: Copia = {
  meta: {
    title: "Una semana de Bortle 1 para tu club",
    description:
      "Siete noches seguidas en un equipo profesional bajo cielo Bortle 1, manejado por los socios del club con N.I.N.A. Todas las tomas son suyas.",
  },
  hero: {
    eyebrow: "Para clubes de astronomía",
    // El original dice "your gear is fine, your sky isn't". En castellano el
    // posesivo repetido suena a traducción; la oposición se sostiene sola.
    title: "El equipo del club está bien. El cielo no.",
    sub: "Siete noches seguidas en un equipo profesional bajo cielo Bortle 1 en el oeste de Texas, manejado por los propios socios. 300 dólares la semana, que repartidos entre los socios son unos pocos dólares por cabeza.",
    imageAlt: "Nebulosa de emisión fotografiada desde el equipo de ScopeBnB en Rockwood, Texas",
  },
  form: {
    cta: "Consultar por una semana",
    hint: "Un solo mail. Contestamos con las semanas libres y con lo que el club tiene que decidir.",
    done: "Listo. Te escribimos con las semanas que están libres y con lo que el club tiene que decidir.",
  },
  oferta: {
    kicker: "Qué se lleva el club",
    title: "Una semana, y todo lo que salga de ella.",
    lead: "Siete noches seguidas en el equipo, media hora de llamada la primera noche para que alguien del club aprenda a manejarlo, el manual de operación remota por escrito, y todas las tomas de las siete noches. Trescientos dólares, precio plano, sin suscripción.",
    cuenta:
      "La cuenta es la parte que sólo le cierra a un club: repartida entre treinta socios son diez dólares cada uno, por un cielo al que ninguno llega desde su casa a ningún precio.",
  },
  datos: { noches: "Noches", precio: "Precio plano", bortle: "Bortle", despejadas: "Noches despejadas / año" },
  galeria: {
    kicker: "Qué sale de acá",
    title: "Objetos fotografiados con este equipo.",
    lead: "El mismo telescopio que van a manejar los socios, en las noches en que apuntó a estos objetos. Campo ancho, detalle y una versión en banda angosta del mismo objeto: lo que vuelve es material, así que cómo termina viéndose sigue siendo decisión suya.",
  },
  objetivos: {
    m31: "Galaxia de Andrómeda",
    m31cat: "M31 · con M32 y M110",
    ancho: "Nebulosa Trompa de Elefante",
    cerca: "El mismo campo, más cerca",
    banda: "Y procesado en banda angosta",
  },
  crudo: {
    kicker: "Qué vuelve",
    title: "Una toma de setenta y cuatro. Por siete noches.",
    lead: "Una sola exposición de 180 segundos con filtro dual de banda angosta, con estiramiento automático y nada más. Arrastrá para ver cómo se lee el mismo dato en mono y en duocromo. Una noche son 74 de estas; la semana son siete de esas noches.",
    mono: "Mono",
    duo: "Duocromo",
    alt: "Nebulosa Creciente (NGC 6888), una exposición de 180 segundos con L-Extreme",
    pie: "Nebulosa Creciente (NGC 6888) · 180 s · Optolong L-Extreme · 11 de julio de 2026 · una toma de 74",
  },
  mike: {
    kicker: "La primera noche",
    title: "Alguien te lo explica antes de que toques nada.",
    alt: "Mike, de ScopeBnB, al lado del equipo de captura",
    p1: "Media hora de llamada con quien del club vaya a manejarlo: conectarse al equipo, encontrar el objeto, encuadrarlo, enfocar y arrancar la primera secuencia. Cuando termina, el club ya sacó su propia primera toma.",
    p2: "El manual escrito queda con ustedes, así el socio que no estuvo en la llamada del lunes puede igual tomar el telescopio el jueves.",
  },
  equipo: {
    kicker: "El equipo",
    title: "Qué encuadra.",
    lead: "Si los socios ya fotografían en remoto, la pregunta no es si este equipo es bueno. Es si encuadra lo que el de ustedes no puede. Eso es una pregunta de distancia focal, así que va la respuesta primero.",
  },
  pasos: {
    kicker: "Cómo funciona una semana",
    title: "Pasan tres cosas, en este orden.",
    items: [
      {
        n: "01",
        t: "Eligen la semana",
        d: "Siete noches seguidas, en las fechas que le sirvan al club. Un equipo, un cielo, así que el calendario es disponibilidad real y no una cola de espera.",
      },
      {
        n: "02",
        t: "Media hora la primera noche",
        d: "Una llamada en vivo con quien vaya a manejarlo: conectarse, encuadrar, enfocar y arrancar una secuencia. Después la semana es de ustedes.",
      },
      {
        n: "03",
        t: "Todos se quedan con todo",
        d: "Todas las tomas y todos los cuadros de calibración de las siete noches. Repártanlas, apílenlas, o que cinco socios procesen el mismo dato y comparen.",
      },
    ],
    guia: "El manual escrito es ",
    guiaLink: "la guía de operación remota",
    guiaFin: ". Es la misma que recorremos en la llamada.",
  },
  objeciones: {
    kicker: "Antes de que preguntes",
    title: "Las cuatro preguntas que hace todo club.",
    items: [
      {
        q: "¿Alguien del club tiene que saber N.I.N.A.?",
        a: "No. Para eso es la llamada de la primera noche, y el manual de operación remota queda por escrito para que nadie tenga que acordarse. Si algún socio ya usa N.I.N.A. en su casa, en diez minutos está cómodo: es el mismo software, apuntado a mejor cielo.",
      },
      {
        q: "¿Y si la semana se nubla?",
        a: "Acá hay unas 270 noches despejadas al año, así que perder una semana entera es poco probable. El clima tampoco es problema de ustedes: las noches que se pierden por nubes se reponen. Por eso la semana se vende como siete noches y no como siete fechas.",
      },
      {
        q: "¿Pueden usarlo varios socios durante la semana?",
        a: "Sí, y es justamente la idea. El club decide quién maneja cada noche. Nada impide darle una noche a cada socio, o llevar un solo proyecto largo a lo largo de las siete.",
      },
      {
        q: "¿De quién son los datos?",
        a: "De ustedes. Todo, en crudo, con calibración. No hay marca de agua, no hay exclusividad y no se reserva nada. Lo que los socios hagan después con eso es enteramente suyo.",
      },
    ],
  },
  cierre: {
    title: "Siete noches bajo el cielo más oscuro de Texas, y los socios se quedan con cada toma.",
  },
};

const IT: Copia = {
  meta: {
    title: "Una settimana di Bortle 1 per il vostro club",
    description:
      "Sette notti consecutive su una strumentazione professionale sotto cieli Bortle 1, guidata dai vostri soci con N.I.N.A. Tutti i frame sono vostri.",
  },
  hero: {
    eyebrow: "Per i gruppi astrofili",
    title: "La strumentazione del club va bene. Il cielo no.",
    sub: "Sette notti consecutive su una strumentazione professionale sotto cieli Bortle 1 nel Texas occidentale, guidata dai vostri soci. 300 dollari a settimana, che divisi tra i soci sono pochi dollari a testa.",
    imageAlt: "Nebulosa a emissione fotografata dalla strumentazione ScopeBnB a Rockwood, Texas",
  },
  form: {
    cta: "Chiedere una settimana",
    hint: "Una sola mail. Rispondiamo con le settimane libere e con quello che il club deve decidere.",
    done: "Ricevuto. Vi scriviamo con le settimane libere e con quello che il club deve decidere.",
  },
  oferta: {
    kicker: "Cosa ottiene il club",
    title: "Una settimana, e tutto quello che ne esce.",
    lead: "Sette notti di fila sulla strumentazione, mezz'ora di call la prima notte perché qualcuno del club impari a guidarla, la guida all'imaging remoto per iscritto, e tutti i frame delle sette notti. Trecento dollari, prezzo fisso, senza abbonamento.",
    cuenta:
      "Il conto è la parte che torna solo a un club: divisi tra trenta soci sono dieci dollari a testa, per un cielo che nessuno di loro raggiunge da casa a nessun prezzo.",
  },
  datos: { noches: "Notti", precio: "Prezzo fisso", bortle: "Bortle", despejadas: "Notti serene / anno" },
  galeria: {
    kicker: "Cosa ne esce",
    title: "Oggetti ripresi con questa strumentazione.",
    lead: "Lo stesso telescopio che guideranno i vostri soci, nelle notti in cui è stato puntato su questi oggetti. Campo largo, dettaglio e una versione in banda stretta dello stesso oggetto: quello che torna è materiale grezzo, quindi come finirà per apparire resta una vostra decisione.",
  },
  objetivos: {
    m31: "Galassia di Andromeda",
    m31cat: "M31 · con M32 e M110",
    ancho: "Nebulosa Proboscide d'Elefante",
    cerca: "Lo stesso campo, più da vicino",
    banda: "E processato in banda stretta",
  },
  crudo: {
    kicker: "Cosa torna indietro",
    title: "Un frame su settantaquattro. Per sette notti.",
    lead: "Una singola posa da 180 secondi con filtro dual narrowband, con stretch automatico e nient'altro. Trascinate per vedere come si legge lo stesso dato in mono e in duocromia. Una notte sono 74 di questi; la settimana sono sette di quelle notti.",
    mono: "Mono",
    duo: "Duocromia",
    alt: "Nebulosa Crescente (NGC 6888), singola posa da 180 secondi con L-Extreme",
    pie: "Nebulosa Crescente (NGC 6888) · 180 s · Optolong L-Extreme · 11 luglio 2026 · un frame su 74",
  },
  mike: {
    kicker: "La prima notte",
    title: "Qualcuno ve lo spiega prima che tocchiate qualcosa.",
    alt: "Mike, di ScopeBnB, accanto alla strumentazione di ripresa",
    p1: "Mezz'ora di call con chi del club la guiderà: collegarsi alla strumentazione, trovare l'oggetto, inquadrarlo, mettere a fuoco e avviare la prima sequenza. Alla fine il club ha già scattato il suo primo frame.",
    p2: "La guida scritta resta a voi, così il socio che lunedì non era in call può comunque prendere il telescopio il giovedì.",
  },
  equipo: {
    kicker: "La strumentazione",
    title: "Cosa riesce a inquadrare.",
    lead: "Se i vostri soci fanno già imaging da remoto, la domanda non è se questa strumentazione sia buona. È se inquadra quello che la vostra non riesce a inquadrare. È una questione di lunghezza focale, quindi ecco prima la risposta.",
  },
  pasos: {
    kicker: "Come funziona una settimana",
    title: "Succedono tre cose, in quest'ordine.",
    items: [
      {
        n: "01",
        t: "Scegliete la settimana",
        d: "Sette notti di fila, nelle date che vanno bene al club. Una strumentazione, un cielo: il calendario è disponibilità reale e non una coda.",
      },
      {
        n: "02",
        t: "Mezz'ora la prima notte",
        d: "Una call dal vivo con chi la guiderà: collegarsi, inquadrare, mettere a fuoco e avviare una sequenza. Dopo, la settimana è vostra.",
      },
      {
        n: "03",
        t: "Tutti si tengono tutto",
        d: "Tutti i light e tutti i frame di calibrazione delle sette notti. Divideteli, sommateli, o fate elaborare lo stesso dato a cinque soci e confrontate.",
      },
    ],
    guia: "La guida scritta è ",
    guiaLink: "la guida all'imaging remoto",
    guiaFin: ". È la stessa che percorriamo durante la call.",
  },
  objeciones: {
    kicker: "Prima che lo chiediate",
    title: "Le quattro domande che fa ogni club.",
    items: [
      {
        q: "Qualcuno del club deve saper usare N.I.N.A.?",
        a: "No. Serve a questo la call della prima notte, e la guida all'imaging remoto resta per iscritto così nessuno deve ricordarsela. Se un socio usa già N.I.N.A. a casa, in dieci minuti è a suo agio: è lo stesso software, puntato su un cielo migliore.",
      },
      {
        q: "E se la settimana è tutta nuvolosa?",
        a: "Qui ci sono circa 270 notti serene all'anno, quindi perdere una settimana intera è improbabile. Il meteo non è nemmeno un vostro problema: le notti perse per nuvole vengono recuperate. Per questo la settimana si vende come sette notti e non come sette date.",
      },
      {
        q: "Possono usarla più soci durante la settimana?",
        a: "Sì, ed è proprio il punto. Il club decide chi guida ogni notte. Nulla vieta di dare una notte a ogni socio, o di portare avanti un solo progetto lungo su tutte e sette.",
      },
      {
        q: "Di chi sono i dati?",
        a: "Vostri. Tutti, grezzi, con la calibrazione. Non c'è filigrana, non c'è esclusiva e non si trattiene nulla. Quello che i vostri soci ne faranno dopo è interamente loro.",
      },
    ],
  },
  cierre: {
    title: "Sette notti sotto il cielo più buio del Texas, e i vostri soci si tengono ogni frame.",
  },
};

const TODAS: Record<Idioma, Copia> = { en: EN, es: ES, it: IT };

/** La copia del idioma pedido, o el inglés si no lo hablamos. */
export const copiaDe = (idioma: unknown): Copia =>
  TODAS[esIdioma(idioma) ? idioma : POR_DEFECTO];
