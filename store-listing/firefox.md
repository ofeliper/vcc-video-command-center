# Firefox Add-ons Listing Draft

## Name

VCC - Video Command Center

## Summary

Personal browser controls for HTML5 video playback.

## Description

VCC adds a local control panel for HTML5 video elements already loaded in your browser.

It supports playback speed controls, forward/backward seeking, configurable shortcuts,
Picture-in-Picture, multi-video selection, visual adjustments, and local preference storage.

VCC is designed for personal browser use. It does not download media, extract streams, remove ads,
bypass paywalls, or attempt to defeat DRM/content protection.

Press `H` on any ordinary web page, or click the extension button and choose "Abrir painel", to open VCC. The toolbar menu also shows whether VCC can access the current site, requests access when needed, and turns video controls on or off for that site. The settings panel is
available everywhere, while video detection and controls remain disabled until the user explicitly
activates the current domain.

## Permissions

`<all_urls>`: Loads the local VCC interface on ordinary web pages so the `H` shortcut is always
available. VCC only scans for and controls videos on domains explicitly activated by the user.

`storage`: Stores local preferences in the browser.

`activeTab`: Lets the toolbar menu read the address of the current tab when the user clicks the VCC
button, to show the site name and whether VCC has access to it.

## Data Collection

VCC does not collect, transmit, sell, or share user data. The manifest declares
`data_collection_permissions: { required: ["none"] }`.
