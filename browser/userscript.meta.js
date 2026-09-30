// ==UserScript==
// @name            Nightcord
// @description     Nightcord in the browser: the Discord mod with Russian UI and privacy tools
// @version         %version%
// @author          Nightcord
// @namespace       https://github.com/1223321313333/Nightcord
// @homepageURL     https://github.com/1223321313333/Nightcord
// @supportURL      https://github.com/1223321313333/Nightcord/issues
// @icon            https://raw.githubusercontent.com/1223321313333/Nightcord/main/browser/icon.png
// @updateURL       https://github.com/1223321313333/Nightcord/releases/latest/download/Nightcord.meta.js
// @downloadURL     https://github.com/1223321313333/Nightcord/releases/latest/download/Nightcord.user.js
// @license         GPL-3.0
// @match           *://*.discord.com/*
// @grant           GM_xmlhttpRequest
// @grant           unsafeWindow
// @run-at          document-start
// @compatible      chrome Chrome + Tampermonkey or Violentmonkey
// @compatible      firefox Firefox Tampermonkey
// @compatible      opera Opera + Tampermonkey or Violentmonkey
// @compatible      edge Edge + Tampermonkey or Violentmonkey
// @compatible      safari Safari + Tampermonkey or Violentmonkey
// ==/UserScript==


// this UserScript DOES NOT work on Firefox with Violentmonkey or Greasemonkey due to a bug that makes it impossible
// to overwrite stuff on the window on sites that use CSP. Use Tampermonkey or use a chromium based browser
// https://github.com/violentmonkey/violentmonkey/issues/997

// this is a compiled and minified version of Nightcord. For the source code, visit the GitHub repo
