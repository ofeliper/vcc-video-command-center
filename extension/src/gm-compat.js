// Minimal Greasemonkey storage compatibility layer for extension builds.
// The VCC userscript keeps using GM_* calls; this shim backs them with the
// extension's storage API and exposes a ready promise before VCC starts.
(function () {
  'use strict';

  const root = globalThis;
  const ext = root.browser || root.chrome;
  const storage = ext?.storage?.local;
  const cache = Object.create(null);

  function fallbackLoad() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('vcc_')) continue;
      try { cache[key] = JSON.parse(localStorage.getItem(key)); }
      catch { cache[key] = localStorage.getItem(key); }
    }
  }

  function storageGetAll() {
    if (!storage) {
      fallbackLoad();
      return Promise.resolve();
    }

    if (root.browser?.storage?.local) {
      return storage.get(null).then(items => Object.assign(cache, items || {}));
    }

    return new Promise(resolve => {
      storage.get(null, items => {
        Object.assign(cache, items || {});
        resolve();
      });
    });
  }

  function storageSet(key, value) {
    cache[key] = value;
    if (!storage) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    storage.set({ [key]: value });
  }

  function storageDelete(key) {
    delete cache[key];
    if (!storage) {
      localStorage.removeItem(key);
      return;
    }
    storage.remove(key);
  }

  root.VCC_STORAGE_READY = storageGetAll();
  root.GM_getValue = function (key, fallback) {
    return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : fallback;
  };
  root.GM_setValue = storageSet;
  root.GM_deleteValue = storageDelete;
  root.GM_listValues = function () {
    return Object.keys(cache);
  };
})();
