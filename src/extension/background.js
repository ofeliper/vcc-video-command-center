// Script de fundo do VCC: só abre a página de configurações quando o painel
// da página pede (content scripts não podem abri-la diretamente).
const api = globalThis.browser || globalThis.chrome;

api.runtime.onMessage.addListener(message => {
  if (message?.type === 'VCC_OPEN_OPTIONS') {
    const r = api.runtime.openOptionsPage();
    if (r?.catch) r.catch(() => {});
  }
  return false;
});
