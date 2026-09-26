# VCC - Video Command Center

VCC is a local control panel for HTML5 video elements already loaded in the browser.
It is intended for personal use and does not download media, extract streams, remove ads,
bypass paywalls, or attempt to defeat DRM/content protection.

## Repository Layout

```text
userscript/
  tampermonkey-vcc.user.js      # Tampermonkey source

extension/
  assets/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
  manifests/
    chrome.json                 # Chrome extension manifest source
    firefox.json                # Firefox extension manifest source
  src/
    gm-compat.js                # GM_* storage shim for extension builds
    popup.html / popup.js / popup.css  # Toolbar menu: site access, open panel, per-site toggle

tools/
  build-extension.js            # Copies shared sources into dist/
  package-extension.js          # Creates release zip files

dist/
  chrome/                       # Generated Chrome extension
  firefox/                      # Generated Firefox extension

releases/
  vcc-chrome.zip                # Generated Chrome Web Store package
  vcc-firefox.zip               # Generated Firefox Add-ons package
```

## Tampermonkey

Install or update `userscript/tampermonkey-vcc.user.js` in Tampermonkey.

## Browser Extensions

Build both extension folders:

```bash
npm run build:extension
```

The generated extension folders are:

```text
dist/chrome
dist/firefox
```

Package both extensions for store upload:

```bash
npm run package:extension
```

The generated zip files are:

```text
releases/vcc-chrome.zip
releases/vcc-firefox.zip
```

### Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select `dist/chrome`.
5. Open a web page and press `H`, or click the VCC toolbar button and choose "Abrir painel". Activate the
   domain in the panel (or with the toggle in the toolbar menu) before using video controls.

### Firefox

For a quick test (removed when Firefox restarts):

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `dist/firefox/manifest.json`.

For a permanent install, submit `releases/vcc-firefox.zip` to addons.mozilla.org (see Store Submission).

On Manifest V3, Firefox lets users withhold site access. The VCC toolbar menu shows whether VCC can
access the current site and offers "Permitir neste site" / "Permitir em todos os sites"; if the request is
declined it explains how to grant access later (Extensions button, or Manage Extension → Permissions).
After access is granted the tab is reloaded so VCC starts on that page.

### Toolbar menu

Clicking the VCC toolbar button opens a small menu that:

- shows whether VCC has access to the current site and requests it when missing;
- opens the VCC control panel on the page (same as pressing `H`);
- turns video controls on or off for the current site.

Settings (shortcuts, opacity, active sites, etc.) are kept in the extension's local storage and survive
browser restarts and updates. They are tied to the extension ID, so keep
`vcc-video-command-center@ofeliper` unchanged in `extension/manifests/firefox.json`. Settings saved by the
Tampermonkey userscript live in Tampermonkey's own storage and are not shared with the extension.

## Development

Run a syntax check:

```bash
npm run check
```

The userscript is the source of the VCC runtime. The extension build copies that file and
adds `extension/src/gm-compat.js` before it, so Chrome and Firefox can provide the same
`GM_getValue`, `GM_setValue`, `GM_deleteValue`, and `GM_listValues` calls used by Tampermonkey.

The browser extension loads the local VCC interface on ordinary web pages so `H` can always open the
panel. Video discovery and control only start after the user explicitly activates the current
domain. All preferences remain in local extension storage.

## Store Submission

Draft listing copy is available in `store-listing/`. The privacy policy is in `PRIVACY.md`.

Before submitting a new version, bump `version` in `package.json`, both manifests and the userscript header,
then run:

```bash
npm run check
npm run package:extension
npx web-ext lint -s dist/firefox
```

Upload `releases/vcc-firefox.zip` at https://addons.mozilla.org/developers/ (the source is not minified or
bundled, so no separate source upload is needed).
