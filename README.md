# CS2 Autoexec Creator

Generator pliku **`autoexec.cfg` dla Counter-Strike 2**. Działa na dwa sposoby, ze wspólnym kodem interfejsu:

- **Strona internetowa** – jeden plik [`index.html`](index.html) (HTML + CSS + JavaScript). Nic nie trzeba instalować – wystarczy otworzyć plik w przeglądarce.
- **Aplikacja desktopowa na Windows** (Electron) – ten sam interfejs plus przycisk **„Zapisz do CS2”**, który sam znajduje folder gry i zapisuje tam plik.

## Funkcje

| Sekcja | Co można ustawić |
|---|---|
| Mysz | `sensitivity`, `zoom_sensitivity_ratio` + kalkulator eDPI i cm/360° (tylko pomocniczo) |
| Celownik | styl, rozmiar, grubość, odstęp, kształt T, kropka, dowolny kolor (RGB), przezroczystość, obrys, odstęp zależny od broni, podążanie za odrzutem – z **podglądem na żywo** (różne tła, powiększenie) |
| Viewmodel | `viewmodel_fov`, `viewmodel_offset_x/y/z` + gotowe presety |
| Bindy | czyszczenie decali (`r_cleardecals`), noclip, powtórzenie ostatniego granatu, skok na kółku myszy – klawisz można „nagrać” klawiaturą/myszą |
| Dźwięk | głośność główna, głośność muzyki (menu, start/koniec rundy, MVP, 10 sekund, kamera śmierci), wyciszanie w tle |
| HUD i radar | skala i kolor HUD, rozmiar/przybliżenie/obracanie/centrowanie radaru, kwadratowy radar przy tabeli wyników |
| Wydajność | `fps_max` |

- Przy każdym ustawieniu jest krótki opis po polsku.
- Każdą sekcję można wyłączyć przełącznikiem „w pliku” – wtedy nie trafia do autoexec, a gra zachowuje ustawienia z menu.
- Na dole: podgląd pliku z kolorowaniem składni, **„Pobierz autoexec.cfg”**, kopiowanie do schowka oraz instrukcja instalacji.
- Ustawienia zapamiętywane są w przeglądarce (localStorage).
- Ciemny motyw w klimacie CS2, układ dopasowany do telefonów.

## Wersja przeglądarkowa

1. Pobierz `index.html` (albo całe repozytorium) i otwórz plik w przeglądarce.
2. Ustaw wszystko po swojemu i kliknij **„Pobierz autoexec.cfg”**.

Stronę można też opublikować np. przez GitHub Pages (Settings → Pages → branch `main`, folder `/`) – to zwykły statyczny plik.

## Jak zainstalować autoexec w CS2

1. Skopiuj `autoexec.cfg` do folderu:
   ```
   C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg
   ```
   Gra na innym dysku? Steam → prawy klik na **Counter-Strike 2** → **Zarządzaj** → **Przeglądaj pliki lokalne** → `game\csgo\cfg`.
   Uwaga: w CS2 to folder `game\csgo\cfg`, a nie stary `csgo\cfg` z CS:GO.
2. Steam → prawy klik na **Counter-Strike 2** → **Właściwości** → **Opcje uruchamiania** → wpisz `+exec autoexec`.
3. Po uruchomieniu gry w konsoli pojawi się `autoexec.cfg wczytany`. Plik można też wczytać ręcznie komendą `exec autoexec`.

## Aplikacja desktopowa (Windows)

### Jak pobrać

1. Wejdź w zakładkę **[Releases](../../releases)** tego repozytorium.
2. Pobierz najnowszy plik `CS2-Autoexec-Creator-Setup-x.y.z.exe` i uruchom instalator.
3. Windows SmartScreen może pokazać ostrzeżenie „Nieznany wydawca”, bo instalator nie jest podpisany certyfikatem – kliknij **Więcej informacji → Uruchom mimo to**.

### „Zapisz do CS2”

- Aplikacja szuka instalacji Steama (rejestr Windows + domyślne ścieżki), czyta `steamapps\libraryfolders.vdf` i sprawdza **wszystkie biblioteki Steama, także na innych dyskach** (najpierw tę, która według Steama zawiera CS2, appid 730). Uwzględnia też `appmanifest_730.acf` oraz typowe foldery `SteamLibrary` na każdym dysku.
- Plik trafia do `...\Counter-Strike Global Offensive\game\csgo\cfg\autoexec.cfg`.
- Jeśli folder nie zostanie znaleziony, aplikacja poprosi o wskazanie go ręcznie (można wskazać folder gry, `game`, `csgo`, `cfg` albo bibliotekę Steama). Wybór jest zapamiętywany; zmienisz go przyciskiem **„Wskaż folder CS2…”**.
- Jeśli `autoexec.cfg` już istnieje, najpierw tworzona jest kopia zapasowa `autoexec.cfg.backup-RRRR-MM-DD_GG-MM-SS` w tym samym folderze. Gdy zawartość się nie zmieniła, nic nie jest nadpisywane.

### Uruchamianie ze źródeł (dla deweloperów)

```bash
npm install
npm start        # uruchamia aplikację Electron
npm test         # testy wyszukiwania folderu CS2
npm run dist     # buduje instalator .exe lokalnie (na Windows) do folderu dist/
```

### Jak wydać nową wersję

Instalator buduje i publikuje GitHub Actions ([`.github/workflows/release.yml`](.github/workflows/release.yml)) na `windows-latest`, gdy wypchniesz tag zaczynający się od `v`:

```bash
git checkout main
git pull
git tag v1.0.1
git push origin v1.0.1
```

Workflow:
1. instaluje zależności (`npm ci`) i uruchamia testy,
2. ustawia wersję aplikacji na podstawie tagu (`v1.0.1` → `1.0.1`), więc nie trzeba ręcznie zmieniać `package.json`,
3. buduje instalator NSIS `.exe`,
4. tworzy **GitHub Release** o nazwie tagu z automatycznymi notatkami i dołącza plik `.exe`.

Postęp widać w zakładce **Actions**. Workflow można też uruchomić ręcznie (Actions → „Build & Release (Windows)” → Run workflow) – wtedy instalator trafia tylko do artefaktów przebiegu, bez tworzenia wydania.

## Struktura projektu

```
index.html                  – cała strona (UI + generator), używana też przez Electron
electron/main.js            – proces główny Electron: okno, zapis pliku, kopia zapasowa
electron/preload.js         – bezpieczny most (window.cs2desktop) między stroną a aplikacją
electron/cs2-locator.js     – wyszukiwanie folderu CS2 (rejestr, libraryfolders.vdf)
test/                       – testy lokalizatora (node --test)
.github/workflows/release.yml – budowanie i publikacja instalatora
```

Strona sprawdza, czy istnieje `window.cs2desktop`. W przeglądarce go nie ma, więc przycisk „Zapisz do CS2” jest ukryty, a strona działa samodzielnie.

## Komendy pominięte celowo

Zgodnie z założeniem generator używa tylko komend, co do których jest pewność, że działają w CS2. Pominięte zostały:

| Komenda / funkcja | Dlaczego pominięta |
|---|---|
| Bind jump-throw (`alias "+jumpthrow" "+jump;-attack"…`) | Valve zablokowało w CS2 bindy wykonujące kilka akcji gracza jednym klawiszem, a rzut w skoku stał się spójny bez binda. |
| `m_rawinput`, `m_customaccel`, `m_mouseaccel*` | Usunięte w CS2 – raw input jest zawsze włączony, akceleracji nie ma. |
| `zoom_sensitivity_ratio_mouse` | Nazwa z CS:GO; w CS2 używany jest `zoom_sensitivity_ratio`. |
| `cl_interp`, `cl_interp_ratio`, `cl_updaterate`, `cl_cmdrate`, `rate` | Ustawienia sieci z CS:GO – w CS2 (subtick) usunięte lub bez znaczenia. |
| `net_graph` | Nie istnieje w CS2; zastąpiony innymi narzędziami diagnostycznymi, których składnia się zmieniała. |
| `viewmodel_presetpos`, `cl_bob*`, `cl_righthand` / leworęczność | Nie mam pewności co do ich zachowania w CS2. |
| `snd_voipvolume`, `snd_headphone_eq`, `snd_mapobjective_volume` i inne nowsze ustawienia audio | Niepewna nazwa lub zachowanie w aktualnej wersji CS2. |
| `cl_radar_icon_scale_min`, `cl_showloadout`, `cl_teammate_colors_show`, `cl_hud_playercount_*` | Niepewne działanie w CS2 – pominięte. |
| `fps_max_ui`, `cl_showfps` | Niepewne działanie w CS2 – pominięte. |
| Import kodu celownika (`CSGO-xxxxx-…`) | Niewymagane na start – do dodania w przyszłości. |

## Licencja

MIT. Projekt nie jest powiązany z Valve Corporation. Counter-Strike jest znakiem towarowym Valve Corporation.
