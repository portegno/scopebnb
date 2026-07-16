# Recon prompt — mini PC de Starfront (para Claude Code en Windows)

Copiá TODO el bloque de abajo y pegáselo a Claude Code corriendo en la mini PC.
Es **solo reconocimiento**: descubre rutas y devuelve datos. No sube nada ni toca
la config de N.I.N.A.

---

Sos Claude Code corriendo en la mini PC de un observatorio remoto (Windows) que
captura astrofotografía con **N.I.N.A.** + guiado con **PHD2**. Estoy montando
un pipeline en ScopeBnB: cuando termina una sesión (una sesión = **una noche**,
un solo reporte por noche), un script de PowerShell tiene que:
1. subir a un endpoint el **.log de N.I.N.A.** y el **GuideLog de PHD2**;
2. el server parsea el log, elige **el light de mejor calidad de estrellas**
   (menor HFR) y devuelve la **ruta absoluta** de ese light (que figura en el
   propio log de N.I.N.A.);
3. el script lee ese archivo del disco y lo sube (para la preview auto-stretch).

Por eso me importa confirmar que las rutas de guardado que el log registra
existen tal cual en disco. Tu tarea es **solo descubrir y reportar** los datos
que necesito para terminar ese script. **NO subas nada, NO modifiques la config
de N.I.N.A., NO borres archivos.** Todo read-only. Usá PowerShell.

Averiguá y devolvéme, con evidencia (los comandos que corriste y su salida):

## 1) Entorno
- Versión de PowerShell: `$PSVersionTable.PSVersion` (necesito saber si es 5.1 o 7).
- ExecutionPolicy actual: `Get-ExecutionPolicy -List`.
- Discos/volúmenes: `Get-PSDrive -PSProvider FileSystem | Select Name,Root,Used,Free`.
- Usuario y rutas base: `$env:USERPROFILE`, `$env:LOCALAPPDATA`.

## 2) Log de N.I.N.A.
- Confirmá la carpeta de logs (default `$env:LOCALAPPDATA\NINA\Logs`) y listá los
  3 más nuevos con fecha y tamaño:
  `Get-ChildItem "$env:LOCALAPPDATA\NINA\Logs" -Filter *.log | Sort LastWriteTime -Desc | Select -First 3 FullName,LastWriteTime,Length`
- Decime el **patrón del nombre** (¿incluye timestamp de inicio? ¿hay un log por
  cada arranque de N.I.N.A.?), así confirmamos que "el más nuevo" == la sesión
  actual.
- Versión de N.I.N.A. (del nombre del log, del perfil, o de la propiedad del exe).

## 3) Dónde guarda N.I.N.A. los LIGHTS (lo más importante)
- Buscá el perfil activo y extraé la ruta y el patrón de guardado de imágenes:
  ```powershell
  $prof = Get-ChildItem "$env:LOCALAPPDATA\NINA\Profiles" -Filter *.profile | Sort LastWriteTime -Desc | Select -First 1
  $json = Get-Content $prof.FullName -Raw | ConvertFrom-Json
  $json.ImageFileSettings | Select FilePath, FilePattern
  ```
  (Si la estructura del JSON es distinta, buscá las claves que contengan
  `FilePath` / `FilePattern` y reportalas.)
- Verificá en disco: bajo esa `FilePath`, ¿cómo se organizan los lights?
  (¿carpetas por target? ¿por fecha? ¿subcarpeta `LIGHT`/`LIGHTS`?). Mostrá un
  ejemplo real: listá los 5 `.fits`/`.fit` más nuevos con ruta completa y fecha:
  ```powershell
  Get-ChildItem "<FilePath>" -Recurse -Include *.fits,*.fit -ErrorAction SilentlyContinue |
    Where-Object LastWriteTime -gt (Get-Date).AddHours(-72) |
    Sort LastWriteTime -Desc | Select -First 5 FullName,LastWriteTime,Length
  ```
- Del FITS más nuevo, leé unas cabeceras clave para confirmar el formato (son
  bloques ASCII de 80 chars al inicio del archivo). Reportá: `NAXIS1`, `NAXIS2`,
  `BITPIX`, `BZERO`, `BAYERPAT`, `IMAGETYP`, `FILTER`, `OBJECT`, `EXPOSURE`,
  `DATE-OBS`. (Podés leer los primeros ~16 KB del archivo como ASCII y grepear
  esas keys.)
- Tamaño típico de un light en MB.
- **Crítico:** confirmá que las rutas que el log de N.I.N.A. registra por cada
  light existen en disco tal cual. En el .log más nuevo buscá las líneas de
  guardado y probá que el path resuelva:
  ```powershell
  $log = Get-ChildItem "$env:LOCALAPPDATA\NINA\Logs" -Filter *.log | Sort LastWriteTime -Desc | Select -First 1
  $lines = Select-String -Path $log.FullName -Pattern "Saved image to|LIGHT" | Select -Last 5
  $lines
  # tomá un path de esas líneas y verificá:
  # Test-Path "<ruta del light que aparece en el log>"
  ```
  Reportá una línea de guardado de ejemplo y si `Test-Path` da `True`. Confirmá
  también que cerca de cada guardado hay una línea de star detection con
  `Average HFR` y `Detected Stars` (así el server puede rankear por HFR).

## 4) GuideLog de PHD2
- Confirmá la carpeta (default `$env:USERPROFILE\Documents\PHD2`) y listá los 3
  `PHD2_GuideLog_*.txt` más nuevos:
  `Get-ChildItem "$env:USERPROFILE\Documents\PHD2" -Filter PHD2_GuideLog_*.txt | Sort LastWriteTime -Desc | Select -First 3 FullName,LastWriteTime,Length`
- ¿PHD2 escribe un GuideLog por arranque? ¿Puede abarcar varias noches si queda
  abierto? (importante para no agarrar el log equivocado).
- Versión de PHD2 si la podés determinar.

## 5) Correlación temporal de la última sesión
Una sesión = una noche = un solo reporte (aunque haya varios targets). Para la
sesión más reciente, compará y reportá los timestamps de:
- el .log de N.I.N.A. más nuevo (hora de inicio y de última escritura),
- los lights más nuevos (primer y último light de esa noche),
- el GuideLog de PHD2 más nuevo.
Decime si alinean (misma noche). Como el server elige el light por HFR desde el
log, no necesito una estrategia de selección de light acá; pero sí confirmá que
"el .log más nuevo" y "el GuideLog más nuevo" corresponden a la misma noche y no
a una sesión previa (¿PHD2/N.I.N.A. quedan abiertos varias noches?).

## 6) Disparo al terminar la secuencia
- ¿N.I.N.A. está configurado con algún trigger de fin de secuencia o "Run
  External Script"? (Si no lo podés inspeccionar, decilo; lo configuramos
  después.)
- ¿Hay alguna carpeta pensada para scripts (ej. `C:\ScopeBnB\`)? Si no, sugerí
  dónde conviene dejarlo.

## Formato de respuesta
Devolvé un bloque final así (con los valores reales), que es lo que me sirve:

```
PS_VERSION      = ...
EXEC_POLICY     = ...
NINA_LOGS_DIR   = ...
NINA_LOG_NEWEST = <ruta> (<fecha>)
NINA_VERSION    = ...
LIGHTS_ROOT     = ...            # el FilePath del perfil
LIGHTS_PATTERN  = ...            # el FilePattern
LIGHTS_LAYOUT   = ...            # p.ej. <root>\<target>\LIGHT\<archivo>.fits
LIGHT_NEWEST    = <ruta> (<fecha>, <MB> MB)
LOG_PATH_MATCHES= <True/False>   # el path del light que figura en el .log existe en disco (Test-Path)
LOG_HAS_HFR     = <True/False>   # el .log tiene lineas "Average HFR" / "Detected Stars" por light
FITS_HEADER     = NAXIS1=.. NAXIS2=.. BITPIX=.. BAYERPAT=.. FILTER=.. EXPOSURE=..
PHD2_DIR        = ...
PHD2_NEWEST     = <ruta> (<fecha>)
SESSION_SCOPING = <estrategia recomendada>
SCRIPT_LOCATION = <carpeta sugerida para el script>
NOTES           = <cualquier cosa rara: multi-target por noche, discos de red, permisos, etc.>
```

No hace falta ningún secreto ni credencial para esto. Cuando tengas el bloque,
pegámelo de vuelta.
