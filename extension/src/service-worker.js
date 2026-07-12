const runtime = globalThis.browser || globalThis.chrome;

runtime.action.onClicked.addListener(tab => {
  if (!tab?.id) return;
  const result = runtime.tabs.sendMessage(tab.id, { type: 'VCC_TOGGLE_PANEL' });
  if (result?.catch) result.catch(() => {});
});
