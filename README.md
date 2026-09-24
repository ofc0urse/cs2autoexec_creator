# CS2 Autoexec Creator

Build an **`autoexec.cfg` for Counter-Strike 2** – with live crosshair, radar and HUD previews, a visual bind builder and a Steam launch options generator. Only commands that work in the current CS2 build are written to the file.

**▶ Open the web app: https://ofc0urse.github.io/cs2autoexec_creator/**

It runs two ways from the same code:

- **Website** – static HTML/CSS/JS, nothing to install. Hosted on GitHub Pages; also works when you open `index.html` straight from disk.
- **Windows desktop app** (Electron) – the same interface plus **Save to CS2**, which finds your game folder and writes the file there (with a backup).

*Polska wersja opisu jest [na dole](#-po-polsku).*

## Features

- **English / Polish** – switch in the header; the choice is remembered. All text lives in [`assets/i18n.js`](assets/i18n.js).
- **Sidebar with categories** (Start, Mouse, Crosshair, Viewmodel, Binds, Audio, HUD & radar, Performance, Myths, Install) and a **file preview panel** that is always visible on the right (on phones it opens from the button at the bottom).
- **Simple / Advanced mode** – Simple shows the important settings; Advanced shows everything. Advanced options are written to the file only when you change them from the default, so the file stays short.
- **Search** across settings, commands, bind actions, launch options and myths (press <kbd>/</kbd>).
- **Presets**: Competitive, Max FPS, Beginner – plus your own presets saved locally.
- **Import** an existing `autoexec.cfg` / `config.cfg` (paste or choose a file). Known commands fill in the form; every skipped line is listed with the reason (old crosshair command, myth, blocked bind, unknown).
- **Share link** – your settings are encoded in the URL (`#cfg=…`); nothing is stored on a server.
- **Clear labels on every option**: *Works in CS2*, *sv_cheats 1 only*, *Own server only*, *New · Sept 2026*, and **✓ console** for commands checked against the in-game console.
- **Crosshair for the Rush Hour update** (22–23 Sept 2026) with a live preview: pixel values, all 9 styles, dynamic spread simulation (standing / walking / running / jumping / firing), recoil follow, full and half outline.
- **Radar and HUD preview** on a schematic map drawn for this tool (no Valve graphics): radar size, zoom, rotation, always-centred, square radar with scoreboard, HUD scale and colour.
- **Bind builder**: a visual keyboard, numpad and mouse. Bound keys and keys CS2 uses by default are marked; click a key to choose from an action library (weapons & grenades, buy, movement, communication, volume & toggles, practice with sv_cheats, utility) or type your own command. It warns when a key is taken or overrides a CS2 default, and **refuses multi-action binds** (jump-throw, snap-tap) because CS2 blocks them.
- **Performance**: `fps_max` plus a **Steam launch options builder**, and a **Myths** section explaining why popular "FPS boost" commands are not in your file.
- **Install guide**: where the file goes and how to make CS2 run it.

## Installing the file in CS2

1. Put `autoexec.cfg` in
   `C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg`
   (game on another drive: Steam → right-click **Counter-Strike 2** → **Manage** → **Browse local files** → `game\csgo\cfg`).
2. Steam → right-click **Counter-Strike 2** → **Properties** → **Launch options** → add `+exec autoexec`.
3. In the console you should see `autoexec.cfg loaded` after the game starts. `exec autoexec` reloads it any time.

## How commands were checked

| Status | Meaning | Written to the file? |
|---|---|---|
| Works in CS2 | Works in the current build | Yes |
| sv_cheats 1 only | Needs `sv_cheats 1` (own/offline server) – only used for practice binds | Only as a bind |
| Own server only | Works on a server you host (e.g. `mp_restartgame`, `bot_kick`) | Only as a bind |
| Myth | Placebo, removed, renamed or blocked in CS2 | **Never** – listed under *Myths* |

- **Crosshair (Rush Hour, Sept 2026)**: names, defaults and ranges come **only from the in-game `find crosshair` output** after the update (marked **✓ console** in the app). The tests check the catalog against that list.
- **Other commands** (mouse, viewmodel, audio, HUD/radar, `fps_max`, bind actions, launch options) are long-standing CS2 commands. They were **not re-checked in a live console for this release**. To check one yourself, type `find <name>` in the CS2 console.
- If something was uncertain, it was left out (see below) rather than guessed.

### Notes on the new crosshair system

- Length, thickness and gap are **real pixels** at your resolution (thickness 1, length 8, gap 4 = exactly those pixels); the game rescales them when the resolution changes. Gap 0 is now respected.
- New commands: `cl_crosshair_length`, `cl_crosshair_thickness`, `cl_crosshair_gap`, `cl_crosshaircolor_a`; `cl_crosshair_drawoutline` has a new value `2` (half outline: only the top-left part).
- Old commands (`cl_crosshairsize`, `cl_crosshairthickness`, `cl_crosshairgap`, `cl_crosshairalpha`, `cl_crosshairusealpha`, `cl_crosshaircolor`, `cl_crosshair_outlinethickness`, `cl_crosshairgap_useweaponvalue`) no longer show up in the console. The importer skips them and points to the new name. **Values are not converted**, because the old scale was not in pixels.
- **Ranges**: the console only states ranges for a few commands (style 0–8, outline 0–2, colours 0–255, split ratio 0–1, inner alpha 0–1, outer alpha 0.3–1, thickness minimum 1). For length, gap, spread limit, split distance, sniper width and grenade delays **no range is published** – the slider limits (marked ⓘ) are only the editor's.
- **Conflicting detail**: the patch notes say the baseline spread distance is **64 px**, but the in-game help for `cl_crosshair_dynamic_spread_limit` says **128 px**. The app follows the console text; the preview spread is illustrative anyway.
- The help text of `cl_crosshair_dynamic_maxdist_splitratio` still mentions `cl_crosshairsize`; the app uses `cl_crosshair_length`, the name in the console.
- **Dynamic Quad (7) and Static Square (8)**: their exact look is not described in the patch notes, so the preview shape is an approximation (the app says so).
- **Crosshair share codes**: the new share code format is **not publicly documented**, so the app does **not** decode or create codes. Apply a code in game (Settings → Crosshair/Scopes → Import) and copy the values into the app.

### Left out on purpose

| Command / feature | Why |
|---|---|
| Jump-throw bind, snap-tap / null binds | Blocked by Valve (multi-action binds). Listed under Myths; the bind builder refuses them. |
| `vprof_off`, `iv_off`, `r_dynamic`, `mat_queue_mode`, `cl_forcepreload`, `func_break_max_pieces`, `r_drawparticles`, `snd_mixahead`, `net_graph` | Placebo, not a CS2 command, or CS:GO-only – see Myths. |
| `cl_interp`, `cl_interp_ratio`, `cl_updaterate`, `cl_cmdrate`, `m_rawinput`, mouse acceleration | Removed in CS2 (sub-tick networking, always raw input). |
| `-novid`, `-tickrate`, `-threads`, `-d3d9ex`, `-limitvsconst`, `-softparticlesdefaultoff`, `-forcenovsync` | Launch options with no effect in CS2 – see Myths. |
| `viewmodel_presetpos`, `cl_bob*`, left-hand settings, `snd_voipvolume`, `snd_headphone_eq`, `cl_radar_icon_scale_min`, `cl_showloadout`, `cl_teammate_colors_show`, `fps_max_ui`, `cl_showfps`, `-refresh` | Not certain enough about their name or behaviour in the current build. |

## Desktop app (Windows)

### Download

1. Open **[Releases](https://github.com/ofc0urse/cs2autoexec_creator/releases)** and download the newest `CS2-Autoexec-Creator-Setup-x.y.z.exe`.
2. Run the installer. SmartScreen may warn about an unknown publisher (the installer is not code-signed): click **More info → Run anyway**.

### Save to CS2

- Finds Steam (Windows registry and default paths), reads `steamapps\libraryfolders.vdf` and checks **every Steam library, including other drives** (the one that lists CS2, app 730, first). It also reads `appmanifest_730.acf` and looks for common `SteamLibrary` folders on each drive.
- Writes `…\Counter-Strike Global Offensive\game\csgo\cfg\autoexec.cfg`.
- If the folder isn't found, you can choose it yourself (game folder, `game`, `csgo`, `cfg` or a Steam library); the choice is remembered.
- An existing `autoexec.cfg` is first copied to `autoexec.cfg.backup-YYYY-MM-DD_HH-MM-SS`. If nothing changed, the file is left alone.

## Development

```bash
npm install
npm test         # catalog, generator, importer, share links, translations, Steam library finder
npm start        # run the Electron app
npm run dist     # build the Windows installer locally (on Windows) into dist/
```

```
index.html              page shell (web + Electron)
assets/data.js          command catalog: settings, statuses, bind actions, presets, launch options, myths
assets/i18n.js          all texts, English + Polish
assets/core.js          pure logic: state, file generation, import parser, share links (also used by tests)
assets/previews.js      crosshair and radar/HUD canvas previews
assets/app.js           user interface
assets/styles.css       styles
electron/               desktop app: window, Save to CS2, Steam library finder
test/                   node --test suites
.github/workflows/      pages.yml (website), release.yml (Windows installer)
```

### Website (GitHub Pages)

`.github/workflows/pages.yml` runs the tests and publishes the site on every push to `main`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Releasing a new version

```bash
git checkout main && git pull
git tag v1.1.0
git push origin v1.1.0
```

`.github/workflows/release.yml` then (on `windows-latest`) runs the tests, sets the app version from the tag (`v1.1.0` → `1.1.0`), builds the NSIS installer and publishes a **GitHub Release** with the `.exe` attached. It can also be started by hand (Actions → *Build & Release (Windows)* → *Run workflow*); then the installer is only uploaded as a run artifact.

---

## 🇵🇱 Po polsku

**CS2 Autoexec Creator** to generator pliku `autoexec.cfg` dla Counter-Strike 2. Działa w przeglądarce: **https://ofc0urse.github.io/cs2autoexec_creator/**. Jest też aplikacja na Windows, która sama zapisuje plik w folderze gry. Do pliku trafiają tylko komendy działające w aktualnym CS2.

### Najważniejsze funkcje

- Przełącznik języka **EN/PL** w nagłówku (wybór jest zapamiętywany).
- Boczne menu z kategoriami i stały podgląd pliku po prawej. Na telefonie podgląd otwiera przycisk na dole.
- Tryb **Prosty / Zaawansowany**, wyszukiwarka ustawień i komend (klawisz <kbd>/</kbd>).
- Presety **Competitive, Max FPS, Beginner** oraz własne presety zapisywane lokalnie.
- **Import** istniejącego `autoexec.cfg` / `config.cfg` (wklejony tekst albo plik) z listą pominiętych linii i powodem pominięcia.
- **Link do udostępniania**: ustawienia są zakodowane w adresie.
- Oznaczenia przy każdej opcji: *działa w CS2*, *tylko sv_cheats 1*, *tylko własny serwer*, *nowość – wrzesień 2026*, **✓ console**.
- **Celownik po aktualizacji Rush Hour** (22–23.09.2026) z podglądem na żywo, w tym stylów dynamicznych i półobrysu.
- Podgląd **radaru i HUD** na schematycznej mapie (bez grafik Valve).
- **Kreator bindów** z klawiaturą i myszą, biblioteką akcji i ostrzeżeniami o konfliktach. Nie pozwala dodać bindów wieloakcyjnych, bo CS2 je blokuje.
- **Wydajność** z generatorem opcji uruchamiania Steam oraz sekcja **Mity** (np. `vprof_off`, `iv_off`, `-novid`) z wyjaśnieniem, dlaczego ich nie ma w pliku.

### Celownik – ważne uwagi

- Nazwy, domyślne wartości i zakresy komend celownika pochodzą **wyłącznie z wyniku `find crosshair`** z konsoli gry po aktualizacji.
- Dla długości, odstępu, limitu rozrzutu itp. gra nie podaje zakresu. Limity suwaków (ⓘ) ustala edytor.
- Stare komendy (`cl_crosshairsize` itd.) są przy imporcie pomijane, a ich wartości nie są przeliczane.
- **Format nowych kodów celownika nie jest publicznie opisany**, więc aplikacja ich nie odczytuje ani nie tworzy.
- Wygląd stylów 7 i 8 w podglądzie jest przybliżony.
- Patch notes podają bazową odległość rozrzutu 64 px, a opis w konsoli 128 px. Aplikacja trzyma się konsoli.

### Jak pobrać aplikację na Windows

1. Wejdź w **[Releases](https://github.com/ofc0urse/cs2autoexec_creator/releases)** i pobierz najnowszy `CS2-Autoexec-Creator-Setup-x.y.z.exe`.
2. Uruchom instalator. Jeśli SmartScreen ostrzeże o nieznanym wydawcy (instalator nie jest podpisany), kliknij **Więcej informacji → Uruchom mimo to**.
3. **Zapisz do CS2** szuka gry we wszystkich bibliotekach Steama (także na innych dyskach, przez `libraryfolders.vdf`). Gdy jej nie znajdzie, pozwala wskazać folder ręcznie. Przed nadpisaniem robi kopię zapasową `autoexec.cfg.backup-…`.

### Jak wydać nową wersję

```bash
git checkout main && git pull
git tag v1.1.0
git push origin v1.1.0
```

GitHub Actions (`release.yml`) zbuduje instalator `.exe` na Windows i opublikuje go w **Releases**. Wersja aplikacji jest brana z tagu.

### Strona na GitHub Pages

Workflow `pages.yml` publikuje stronę przy każdym pushu na `main`. Jednorazowo trzeba ustawić: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## License

MIT. Not affiliated with Valve Corporation. Counter-Strike is a trademark of Valve Corporation.
