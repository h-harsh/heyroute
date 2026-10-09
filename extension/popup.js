import { request, renderStatus } from './ui.js';
let current;
const toggle = document.querySelector('#toggle');
const feedback = document.querySelector('#feedback');
function render(status) {
  current = status;
  renderStatus(status);
  toggle.textContent = status.settings.enabled || status.owns ? 'Disable routing' : 'Enable routing';
  toggle.disabled = false;
}
document.querySelector('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  feedback.textContent = '';
  try { render(await request(current.settings.enabled || current.owns ? 'disable' : 'enable')); }
  catch (error) { feedback.textContent = error.message; }
  finally { toggle.disabled = false; }
});
request('status').then(render).catch((error) => { feedback.textContent = error.message; });
