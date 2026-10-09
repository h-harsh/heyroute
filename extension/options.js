import { request, renderStatus } from './ui.js';

let current;
let busy = false;
const feedback = document.querySelector('#feedback');
const toggle = document.querySelector('#toggle');
function render(status, fill = false) {
  current = status;
  renderStatus(status);
  toggle.textContent = status.settings.enabled || status.owns ? 'Disable routing' : 'Enable routing';
  if (fill) {
    document.querySelector('#port').value = status.settings.port;
    document.querySelector('#domains').value = status.settings.domains.join('\n');
    document.querySelector('#acknowledge').checked = status.settings.directAcknowledged;
  }
}
async function perform(work) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  feedback.textContent = '';
  feedback.dataset.error = 'false';
  try { await work(); }
  catch (error) { feedback.textContent = error.message; feedback.dataset.error = 'true'; }
  finally { busy = false; document.querySelectorAll('button').forEach((button) => { button.disabled = false; }); }
}
const formSettings = () => ({
  port: Number(document.querySelector('#port').value),
  domains: document.querySelector('#domains').value,
  directAcknowledged: document.querySelector('#acknowledge').checked,
});
document.querySelector('#settings-form').addEventListener('submit', (event) => {
  event.preventDefault();
  perform(async () => { render(await request('save', formSettings()), true); feedback.textContent = 'Settings saved in this profile.'; });
});
toggle.addEventListener('click', () => perform(async () => {
  if (!current) throw new Error('Wait for settings to load.');
  if (current.settings.enabled || current.owns) render(await request('disable'));
  else {
    render(await request('save', formSettings()), true);
    render(await request('enable'));
  }
}));
document.querySelector('#reset').addEventListener('click', () => {
  if (confirm('Disable HeyRoute and remove its saved hostname rules from this profile?')) {
    perform(async () => { render(await request('reset'), true); feedback.textContent = 'Local settings removed.'; });
  }
});
perform(async () => render(await request('status'), true));
