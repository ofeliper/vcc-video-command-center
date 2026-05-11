const runtime = globalThis.browser || globalThis.chrome;

function getActiveTab() {
  return new Promise(resolve => {
    runtime.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs?.[0]));
  });
}

function executeScript(details) {
  const result = runtime.scripting.executeScript(details);
  if (result && typeof result.then === 'function') return result;
  return new Promise((resolve, reject) => {
    const err = runtime.runtime.lastError;
    if (err) reject(err);
    else resolve(result);
  });
}

runtime.action.onClicked.addListener(async () => {
  const tab = await getActiveTab();
  if (!tab?.id || !/^https?:/.test(tab.url || '')) return;

  const target = { tabId: tab.id };
  const injected = await executeScript({
    target,
    func: () => Boolean(globalThis.VCC_EXTENSION_INJECTED),
  });

  if (injected?.[0]?.result) return;

  await executeScript({
    target,
    files: ['src/gm-compat.js'],
  });

  await executeScript({
    target,
    func: () => {
      globalThis.VCC_EXTENSION_INJECTED = true;
      globalThis.VCC_FORCE_ENABLE = true;
    },
  });

  await executeScript({
    target,
    files: ['src/tampermonkey-vcc.user.js'],
  });
});
