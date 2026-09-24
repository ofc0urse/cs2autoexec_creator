'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { findCs2CfgDir, resolveCfgDir } = require('./cs2-locator');

const INDEX_HTML = path.join(__dirname, '..', 'index.html');
const MAX_CFG_SIZE = 256 * 1024;

let win = null;

/* ---------------- Ustawienia aplikacji (ręcznie wybrany folder) ---------------- */

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) || {}; } catch (_) { return {}; }
}

function writeSettings(data) {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(data, null, 2));
  } catch (_) { /* brak zapisu ustawień nie blokuje działania */ }
}

function isCs2Dir(cfgDir) {
  try { return fs.statSync(path.dirname(cfgDir)).isDirectory(); } catch (_) { return false; }
}

/** Zwraca aktualny folder cfg: najpierw ręcznie wskazany, potem wykryty automatycznie. */
async function currentCfgDir() {
  const saved = readSettings().cfgDir;
  if (saved && isCs2Dir(saved)) return { cfgDir: saved, source: 'manual' };
  const found = await findCs2CfgDir();
  if (found) return { cfgDir: found, source: 'steam' };
  return null;
}

function timestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/* ---------------- IPC ---------------- */

ipcMain.handle('cs2:detect', async () => {
  const res = await currentCfgDir();
  return res ? { ok: true, ...res } : { ok: false };
});

ipcMain.handle('cs2:choose-folder', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Wskaż folder Counter-Strike 2 (lub game\\csgo\\cfg)',
    properties: ['openDirectory'],
  });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  const cfgDir = resolveCfgDir(r.filePaths[0]);
  if (!cfgDir) {
    return {
      ok: false,
      error: 'Ten folder nie wygląda na instalację CS2. Wskaż folder „Counter-Strike Global Offensive” albo bezpośrednio „game\\csgo\\cfg”.',
    };
  }
  writeSettings({ ...readSettings(), cfgDir });
  return { ok: true, cfgDir, source: 'manual' };
});

ipcMain.handle('cs2:save', async (_e, content) => {
  if (typeof content !== 'string' || content.length > MAX_CFG_SIZE) {
    return { ok: false, error: 'Nieprawidłowa zawartość pliku.' };
  }
  const target = await currentCfgDir();
  if (!target) return { ok: false, needFolder: true };

  const { cfgDir } = target;
  const file = path.join(cfgDir, 'autoexec.cfg');
  try {
    fs.mkdirSync(cfgDir, { recursive: true });
    let backup = null;
    if (fs.existsSync(file)) {
      const old = fs.readFileSync(file, 'utf8');
      if (old === content) return { ok: true, path: file, unchanged: true };
      backup = path.join(cfgDir, `autoexec.cfg.backup-${timestamp()}`);
      fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
    }
    // Zapis przez plik tymczasowy, żeby nie zostawić uszkodzonego autoexec.cfg.
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, file);
    return { ok: true, path: file, backup };
  } catch (err) {
    const hint = err && (err.code === 'EPERM' || err.code === 'EACCES')
      ? ' Brak uprawnień – zamknij CS2 lub uruchom aplikację jako administrator.' : '';
    return { ok: false, error: `Nie udało się zapisać pliku (${err.code || err.message}).${hint}` };
  }
});

ipcMain.handle('cs2:open-folder', async () => {
  const target = await currentCfgDir();
  if (!target) return { ok: false };
  fs.mkdirSync(target.cfgDir, { recursive: true });
  const err = await shell.openPath(target.cfgDir);
  return { ok: !err, error: err || undefined };
});

/* ---------------- Okno ---------------- */

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 380,
    minHeight: 500,
    backgroundColor: '#0b0e13',
    title: 'CS2 Autoexec Creator',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Linki zewnętrzne otwieramy w przeglądarce, nie w oknie aplikacji.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') || !url.split('#')[0].endsWith('index.html')) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  win.loadFile(INDEX_HTML);
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
