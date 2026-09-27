# Chrome Web Store Listing Draft

- **Package:** `releases/vcc-chrome-<version>.zip` (built by `npm run package`)
- **Screenshots:** 1280×800 — [`screenshots/en-US/`](screenshots/en-US/) (English) and [`screenshots/pt-BR/`](screenshots/pt-BR/) (Portuguese)
- **Languages:** the extension ships in English and Portuguese (Brazil); add both listing languages in the dashboard
- **Store icon:** `assets/icons/icon-128.png`
- **Small promo tile (440×280):** not created yet
- Descriptions in Portuguese: reuse the texts in [`firefox.md`](firefox.md)

## Name

VCC - Video Command Center

## Short Description

Personal browser controls for HTML5 video playback.

## Detailed Description

VCC adds a local control panel for HTML5 video elements already loaded in your browser.

Use it to adjust playback speed, jump forward or backward, configure keyboard shortcuts, use
Picture-in-Picture, select videos on pages with multiple players, and tune the on-screen control
panel for your own viewing workflow.

VCC is designed for personal browser use. It does not download media, extract streams, remove ads,
bypass paywalls, or attempt to defeat DRM/content protection.

Press `H` on any ordinary web page, or click the extension button and choose "Abrir painel", to open VCC. On a domain that has
not been activated, the panel shows general settings and a clear activation prompt; VCC does not
scan for or control videos until the user activates that domain.

## Single Purpose

VCC provides personal playback controls for HTML5 video elements in the active browser tab.

## Permission Justifications

`<all_urls>`: Loads the local VCC interface so the `H` shortcut and settings panel are available on
ordinary web pages. Video detection and control remain disabled until the user explicitly activates
the current domain.

`storage`: Saves local preferences such as playback speed, shortcuts, panel opacity, and site
settings and the list of domains activated by the user.

`activeTab`: Lets the toolbar menu read the current tab's address when the user clicks the VCC button,
to show the site name and whether VCC has access to it.

## Privacy Disclosure

VCC stores preferences locally in the browser and does not collect, transmit, sell, or share user
data.
