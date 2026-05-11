# Chrome Web Store Listing Draft

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

To use it, open a page with an HTML5 video and click the VCC extension button. The extension only
injects its controls into the active tab after that click.

## Single Purpose

VCC provides personal playback controls for HTML5 video elements in the active browser tab.

## Permission Justifications

`activeTab`: Lets VCC run only in the current tab after the user clicks the extension button.

`scripting`: Injects the local VCC control scripts into the active tab after user action.

`storage`: Saves local preferences such as playback speed, shortcuts, panel opacity, and site
settings.

## Privacy Disclosure

VCC stores preferences locally in the browser and does not collect, transmit, sell, or share user
data.
