# VCC - Video Command Center

VCC is a local control panel for HTML5 video elements already loaded in the browser.
It is intended for personal use and does not download media, extract streams, remove ads,
bypass paywalls, or attempt to defeat DRM/content protection.

## Repository Layout

```text
userscript/
  tampermonkey-vcc.user.js      # Tampermonkey source

extension/
  manifests/
    chrome.json                 # Chrome extension manifest source
    firefox.json                # Firefox extension manifest source
  src/
    gm-compat.js                # GM_* storage shim for extension builds

tools/
  build-extension.js            # Copies shared sources into dist/

dist/
  chrome/                       # Generated Chrome extension
  firefox/                      # Generated Firefox extension
```

## Tampermonkey

Install or update `userscript/tampermonkey-vcc.user.js` in Tampermonkey.

## Browser Extensions

Build both extension packages:

```bash
npm run build:extension
```

The generated extension folders are:

```text
dist/chrome
dist/firefox
```

### Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select `dist/chrome`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `dist/firefox/manifest.json`.

## Development

Run a syntax check:

```bash
npm run check
```

The userscript is the source of the VCC runtime. The extension build copies that file and
adds `extension/src/gm-compat.js` before it, so Chrome and Firefox can provide the same
`GM_getValue`, `GM_setValue`, `GM_deleteValue`, and `GM_listValues` calls used by Tampermonkey.
