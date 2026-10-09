export async function request(type, settings) {
  const response = await chrome.runtime.sendMessage({ type, settings });
  if (!response?.ok) throw new Error(response?.error ?? 'HeyRoute did not respond. Reload the extension and try again.');
  return response.status;
}

export function renderStatus(status) {
  const label = document.querySelector('#state');
  label.textContent = status.active ? 'Routing enabled' : status.problem ? 'Routing needs attention' : 'Routing off';
  label.dataset.active = String(status.active);
  const detail = document.querySelector('#detail');
  detail.textContent = status.problem ?? (status.active ?
    `${status.settings.domains.length} hostname rules → 127.0.0.1:${status.settings.port}. SSH availability is not checked.` :
    'HeyRoute is not routing requests. Your usual proxy settings apply.');
  const recent = document.querySelector('#recent-error');
  recent.textContent = status.recentError ? 'Chrome reported a proxy error. Check the SSH connection, then reload the affected page.' : '';
}
