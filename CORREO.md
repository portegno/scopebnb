# Autenticación de correo de scopebnb.com — qué está roto y cómo arreglarlo

Instructivo para quien tome este trabajo. Se puede leer sin contexto previo.

Fecha del diagnóstico: **10 de septiembre de 2026**. Todo lo de acá se verificó
con `dig` contra `8.8.8.8`; los comandos están para que los vuelvas a correr
antes de tocar nada, porque el DNS puede haber cambiado.

---

## Resumen en una línea

Cada mail que una persona manda desde `@scopebnb.com` **falla DMARC**, y como la
política del dominio es `p=quarantine`, el receptor lo manda a spam por orden
nuestra. Nadie se entera porque los informes de DMARC van a un buzón del
registrador que no lee ninguna persona de la casa.

---

## Lo que NO está roto — no lo toques

**El envío por Resend está bien configurado.** Verificado:

```
$ dig +short TXT send.scopebnb.com
"v=spf1 include:amazonses.com ~all"

$ dig +short MX send.scopebnb.com
10 feedback-smtp.sa-east-1.amazonses.com.

$ dig +short TXT resend._domainkey.scopebnb.com
"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDJGJWddmBWWADqaW6iV10qBNEX1S52eA2eE03BO…"
```

Los mails que salen por Resend —las confirmaciones de compra, el newsletter—
usan `send.scopebnb.com` como dominio de retorno, ahí el SPF pasa, y como la
política tiene alineación relajada (`aspf=r`), eso **alinea** con
`scopebnb.com`. Además firman con el DKIM `resend._domainkey`, que existe.
Pasan por las dos patas.

Si al arreglar lo de abajo te dan ganas de "ordenar" estos registros, no lo
hagas: están bien y son la única parte del correo que hoy funciona.

---

## Problema 1 — el dominio raíz no tiene SPF ni DKIM, y la política es quarantine

```
$ dig +short TXT scopebnb.com
"google-site-verification=PaquGHw82q_T_8FM_dWLdzQzGLtVx5r7G4ktFcezgCI"
"fah-claim=002-02-6ec5f1dd-a826-47bc-8235-5bf57282a975"
```

**No hay ningún `v=spf1`.**

```
$ dig +short TXT google._domainkey.scopebnb.com
(vacío)
```

**No hay DKIM de Google Workspace.** `google` es el selector que usa Workspace
por defecto; que no exista significa que la firma nunca se generó en la consola
de administración.

```
$ dig +short MX scopebnb.com
1 smtp.google.com.

$ dig +short TXT _dmarc.scopebnb.com
"v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"
```

El correo del dominio lo maneja Google Workspace, y la política DMARC es
`quarantine`.

**Por qué esto es grave.** Cuando una persona escribe desde `contact@scopebnb.com`
—contestándole a un cliente, por ejemplo— el dominio de retorno es
`scopebnb.com`. Ahí no hay SPF, así que SPF da `none`. Y como no hay clave DKIM
publicada, Workspace no firma con este dominio. DMARC necesita que **al menos
una** de las dos pase y alinee: no pasa ninguna. Con `p=quarantine`, el
resultado no es "llega marcado": es que el receptor lo aparta, porque nosotros
se lo pedimos.

O sea: **el correo humano de la casa se está yendo a spam, y es culpa de nuestra
propia política.**

### El arreglo, en este orden

**Paso 1. Generar el DKIM de Google Workspace.** Es lo primero porque es lo que
autentica el correo humano, y no depende de nadie más.

En `admin.google.com` → Apps → Google Workspace → Gmail → *Autenticar correo
electrónico*. Elegí el dominio `scopebnb.com`, generá la clave (2048 bits) y
copiá el registro TXT que te da. Publicalo tal cual en el DNS, con el nombre que
te indique (normalmente `google._domainkey`). Volvé a la consola y apretá
**Iniciar autenticación**.

No inventes el valor: sale de la consola y es distinto para cada dominio.

**Paso 2. Publicar el SPF del dominio raíz.**

```
Nombre:  @   (o "scopebnb.com", según el panel del DNS)
Tipo:    TXT
Valor:   v=spf1 include:_spf.google.com ~all
```

`include:_spf.google.com` porque el MX es `smtp.google.com`. **No** agregues acá
el include de Resend: Resend sale por `send.scopebnb.com`, que ya tiene el suyo.
Meterlo también en la raíz no arregla nada y gasta una de las diez consultas que
permite SPF.

**Sólo puede haber un registro SPF por nombre.** Si el panel ya tiene uno cuando
vayas a crearlo, editá ese en vez de crear un segundo: dos registros `v=spf1`
hacen que SPF falle con `permerror`, que es peor que no tener ninguno.

**Paso 3. Esperar y verificar.** El DNS tarda; con TTL bajo son minutos, con TTL
alto puede ser una hora.

```
dig +short TXT scopebnb.com | grep spf1
dig +short TXT google._domainkey.scopebnb.com
```

Después mandá un mail desde `contact@scopebnb.com` a una casilla de Gmail
personal, abrilo, y en el menú de tres puntos elegí *Mostrar original*. Tienen
que decir `PASS` las tres líneas: SPF, DKIM y DMARC. Si DKIM dice `PASS` pero
DMARC no, mirá que el `d=` de la firma sea `scopebnb.com` y no otro dominio: eso
es un problema de alineación, no de firma.

---

## Problema 2 — nadie lee los informes de DMARC

```
rua=mailto:dmarc_rua@onsecureserver.net
```

Esa dirección es la que pone el registrador por defecto. **No es de la casa.**
Hace meses que llegan informes diarios sobre este dominio a un buzón que nadie
abre, y son el único lugar donde se ve quién está mandando correo como nosotros.

Cambiá el registro por:

```
Nombre:  _dmarc
Tipo:    TXT
Valor:   v=DMARC1; p=quarantine; adkim=r; aspf=r; np=reject; rua=mailto:contact@scopebnb.com; ruf=mailto:contact@scopebnb.com; fo=1
```

Qué cambia y por qué:

- `rua` a una casilla nuestra. Es el punto entero de este paso.
- `ruf` con `fo=1` manda un aviso por cada mensaje que falla, no sólo el resumen
  diario. Con el volumen de hoy no inunda nada, y es lo que avisa el mismo día
  si algo se rompe. Si el volumen crece y molesta, se saca.
- `np=reject` rechaza el correo que dice venir de subdominios que no existen. Es
  gratis y no puede romper nada: por definición no hay nada legítimo mandando
  desde un subdominio inexistente.
- `p=quarantine` **se queda como está**. No lo bajes a `none` para "probar": lo
  que está mal no es la política, es que el dominio no autentica. Bajarla
  esconde el problema en vez de arreglarlo.

---

## Lo que no hay que hacer

- **No bajes `p` a `none`.** Es la tentación obvia cuando ves mails yendo a
  spam, y deja el dominio abierto a falsificación mientras tapa el síntoma.
- **No subas a `p=reject` todavía.** Primero que autentique, después dos semanas
  de informes limpios llegando a una casilla nuestra, y recién ahí.
- **No toques nada de `send.scopebnb.com`.** Es lo único que funciona.
- **No pongas dos registros `v=spf1`** en el mismo nombre.
- **No copies valores de DKIM de ningún lado**: la clave la genera la consola de
  Workspace y es única de este dominio.

---

## Cómo saber que quedó bien

Una semana después del cambio tiene que llegar un informe de DMARC a
`contact@scopebnb.com`. Es un `.zip` con un XML adentro. Lo que hay que mirar:

- que todas las filas digan `dkim: pass` y `spf: pass`;
- que las `source_ip` sean todas de Google o de Amazon SES (Resend), y de nadie
  más.

Si aparece una IP que no reconocés, alguien está mandando correo como nosotros y
eso es lo que estos informes existen para mostrar.
