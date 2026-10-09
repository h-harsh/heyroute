import { createController } from './controller.js';

const controller = createController(chrome);

async function badge(status) {
  const text = status.active ? (status.recentError ? '!' : 'ON') : (status.problem ? '!' : 'OFF');
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: text === 'ON' ? '#13695c' : text === 'OFF' ? '#596172' : '#9b430e' });
  await chrome.action.setTitle({ title: status.active ? 'HeyRoute: rules enabled; SSH availability is not checked' : 'HeyRoute: routing off or blocked' });
}

const ownPages = ['popup.html', 'options.html'].map((page) => chrome.runtime.getURL(page));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !ownPages.includes(sender.url)) return false;
  controller.dispatch(message).then(async (status) => {
    await badge(status);
    respond({ ok: true, status });
  }).catch((error) => respond({ ok: false, error: error.message }));
  return true;
});

const refresh = () => controller.dispatch({ type: 'status' }).then(badge).catch(() => chrome.action.setBadgeText({ text: '!' }));
const reconcile = () => controller.reconcile().then(badge).catch(() => chrome.action.setBadgeText({ text: '!' }));
chrome.runtime.onInstalled.addListener(reconcile);
chrome.runtime.onStartup.addListener(reconcile);
chrome.proxy.settings.onChange.addListener(refresh);
chrome.proxy.onProxyError.addListener(async ({ error }) => {
  // Deliberately discard Chrome's detail string, which can contain private URLs.
  await chrome.storage.session.set({ proxyError: { code: error, at: Date.now() } });
  await refresh();
});

// A developer reload does not always emit onStartup. Reconcile on worker load too.
void reconcile();
