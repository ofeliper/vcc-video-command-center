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
    service-worker.js           # Injects VCC after the user clicks the extension

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
5. Open a page with an HTML5 video and click the VCC toolbar button.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `dist/firefox/manifest.json`.
4. Open a page with an HTML5 video and click the VCC toolbar button.

## Development

Run a syntax check:

```bash
npm run check
```

The userscript is the source of the VCC runtime. The extension build copies that file and
adds `extension/src/gm-compat.js` before it, so Chrome and Firefox can provide the same
`GM_getValue`, `GM_setValue`, `GM_deleteValue`, and `GM_listValues` calls used by Tampermonkey.

The browser extension uses `activeTab` and `scripting` instead of broad host permissions. VCC is
injected into the current tab only after the user clicks the extension button.

## Store Submission

Draft listing copy is available in `store-listing/`. The privacy policy is in `PRIVACY.md`.
