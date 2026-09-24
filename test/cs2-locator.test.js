'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseVdf, librariesFromRoot, cs2CfgInLibrary, resolveCfgDir } = require('../electron/cs2-locator');

const LIBRARY_VDF = `"libraryfolders"
{
	"0"
	{
		"path"		"C:\\\\Program Files (x86)\\\\Steam"
		"apps"
		{
			"228980"		"123"
		}
	}
	"1"
	{
		"path"		"D:\\\\SteamLibrary"
		"apps"
		{
			"730"		"35000000000"
		}
	}
}`;

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cs2test-'));
}

test('parseVdf odczytuje biblioteki i unescape ścieżek', () => {
  const v = parseVdf(LIBRARY_VDF);
  assert.strictEqual(v.libraryfolders['1'].path, 'D:\\SteamLibrary');
  assert.ok('730' in v.libraryfolders['1'].apps);
});

test('librariesFromRoot oznacza bibliotekę z CS2', () => {
  const root = tmpdir();
  fs.mkdirSync(path.join(root, 'steamapps'));
  fs.writeFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), LIBRARY_VDF);
  const libs = librariesFromRoot(root);
  const d = libs.find(l => l.path === 'D:\\SteamLibrary');
  assert.ok(d && d.hasCs2);
});

test('cs2CfgInLibrary znajduje game/csgo/cfg (z appmanifest)', () => {
  const lib = tmpdir();
  const csgo = path.join(lib, 'steamapps', 'common', 'Counter-Strike Global Offensive', 'game', 'csgo');
  fs.mkdirSync(csgo, { recursive: true });
  fs.writeFileSync(path.join(lib, 'steamapps', 'appmanifest_730.acf'),
    '"AppState"\n{\n\t"appid"\t\t"730"\n\t"installdir"\t\t"Counter-Strike Global Offensive"\n}\n');
  assert.strictEqual(cs2CfgInLibrary(lib), path.join(csgo, 'cfg'));
  assert.strictEqual(cs2CfgInLibrary(tmpdir()), null);
});

test('resolveCfgDir akceptuje różne poziomy folderów', () => {
  const lib = tmpdir();
  const game = path.join(lib, 'steamapps', 'common', 'Counter-Strike Global Offensive');
  const cfg = path.join(game, 'game', 'csgo', 'cfg');
  fs.mkdirSync(cfg, { recursive: true });
  for (const p of [cfg, path.dirname(cfg), path.join(game, 'game'), game, path.join(lib, 'steamapps'), lib]) {
    assert.strictEqual(resolveCfgDir(p), cfg, p);
  }
  assert.strictEqual(resolveCfgDir(tmpdir()), null);
});
