# N.I.N.A. -> ScopeBnB session upload

`upload-session.ps1` runs on the imaging PC (mini PC) at the end of a sequence
and ships the night's report to ScopeBnB. No plugin required. One report per
night. Verified against N.I.N.A. 3.2.0.9001 on Windows 11 / PowerShell 5.1.

## What it does

1. Finds the newest N.I.N.A. `.log` that actually **saved lights** (contains
   `Saved image to ...\LIGHT\...`). The plain newest log is unreliable -
   N.I.N.A. left open writes a newer, empty log.
2. Derives the session window from the LIGHT save timestamps, and picks the
   PHD2 `PHD2_GuideLog_*.txt` whose guiding **overlaps that window** (not the
   newest by date - PHD2 left open can span nights).
3. POSTs both logs to `POST /api/sessions/ingest`. The server parses them
   (deterministic, no plugin), has Mike narrate it (Gemini), stores the report,
   links it to that night's booking, and returns:
   - a signed `uploadUrl` (PUT straight to Storage, bypasses body-size limits),
   - `lightPath`: the absolute path of the **sharpest sub of the night**
     (lowest HFR, healthy star count), read from the log.
4. Reads that exact light FITS off disk and PUTs it to `uploadUrl`.
5. Calls `POST /api/sessions/ingest/image` to auto-stretch it (mono + color)
   into the report's preview image.

If no PHD2 log overlaps, the report ships without guiding. If no light is found,
it keeps the DSS2 field preview.

## Setup on the mini PC

1. Create `C:\ScopeBnB\` and copy into it:
   - `upload-session.ps1`
   - `config.json` (copy `config.example.json` and fill in):
     ```json
     { "endpoint": "https://<your-host>/api/sessions/ingest",
       "secret":   "<same as server SESSION_INGEST_SECRET>" }
     ```
   Keep `config.json` private - it holds the secret. The script writes its own
   logs to `C:\ScopeBnB\logs\`.

2. **Server:** set `SESSION_INGEST_SECRET` (long random string). For the signed
   uploads, the runtime service account needs **Service Account Token Creator**
   (`iam.serviceAccounts.signBlob`) on App Hosting / Cloud Run; locally a
   `serviceAccountKey.json` (`GOOGLE_APPLICATION_CREDENTIALS`) already signs.

3. **N.I.N.A. trigger** (there is none today - it must be added). In the
   Advanced Sequencer, add an end-of-sequence **Run External Script** / trigger
   as the last action, with:
   ```
   powershell.exe -ExecutionPolicy Bypass -File "C:\ScopeBnB\upload-session.ps1"
   ```

## Confirmed paths (mini PC, user Ezequiel)

| What | Path |
| --- | --- |
| N.I.N.A. logs | `C:\Users\Ezequiel\AppData\Local\NINA\Logs` (default) |
| Lights root | `C:\Users\Ezequiel\Documents\N.I.N.A\<YYYY-MM-DD>\LIGHT\` |
| PHD2 logs | `C:\Users\Ezequiel\Documents\PHD2` (default) |

The script uses the N.I.N.A. logs and PHD2 defaults automatically; it never needs
the lights root itself (the server hands back the exact light path from the log,
and that path is confirmed to exist on disk).

## Test it by hand

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\ScopeBnB\upload-session.ps1"
```
It prints (and logs to `C:\ScopeBnB\logs\`) the session window it found, the
report id/URL, and the preview image URL. Override config for a dry run:
```powershell
... upload-session.ps1 -Endpoint "https://<host>/api/sessions/ingest" -Secret "<secret>"
```
