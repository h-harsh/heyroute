import { DEFAULTS, normalizeSettings, buildProxyConfig, isOurConfig, controlProblem } from './core.js';

export function createController(api) {
  let queue = Promise.resolve();
  const run = (work) => {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  };
  const read = async () => normalizeSettings((await api.storage.local.get('settings')).settings ?? DEFAULTS);
  const effective = () => api.proxy.settings.get({ incognito: false });

  async function status() {
    let settings;
    let configError = null;
    try { settings = await read(); }
    catch (error) { settings = { ...DEFAULTS, domains: [] }; configError = error.message; }
    const proxy = await effective();
    const owns = proxy.levelOfControl === 'controlled_by_this_extension';
    const active = settings.enabled && owns && isOurConfig(proxy.value, settings);
    const problem = configError ?? (settings.enabled && !active ?
      controlProblem(proxy) ?? 'The effective proxy differs from the saved rules. Disable routing, then enable again.' : null);
    const { proxyError } = await api.storage.session.get('proxyError');
    return { settings, active, owns, problem, control: proxy.levelOfControl,
      recentError: active ? proxyError ?? null : null };
  }

  async function apply(next) {
    await read();
    const before = await effective();
    if (next.enabled) {
      const problem = controlProblem(before);
      if (problem) throw new Error(problem);
      await api.proxy.settings.set({ value: buildProxyConfig(next), scope: 'regular_only' });
      const after = await effective();
      if (after.levelOfControl !== 'controlled_by_this_extension' || !isOurConfig(after.value, next)) {
        await restore(before);
        throw new Error('Chrome did not apply HeyRoute’s rules. Check managed policy or another proxy extension.');
      }
    } else {
      await api.proxy.settings.clear({ scope: 'regular_only' });
    }
    try { await api.storage.local.set({ settings: next }); }
    catch (error) {
      await restore(before);
      throw new Error(`Settings could not be saved; previous routing restored. ${error.message}`);
    }
    await api.storage.session.remove('proxyError');
    return status();
  }

  async function restore(before) {
    if (before.levelOfControl === 'controlled_by_this_extension') {
      await api.proxy.settings.set({ value: before.value, scope: 'regular_only' });
    } else {
      await api.proxy.settings.clear({ scope: 'regular_only' });
    }
  }

  async function dispatch(message) {
    if (!message || typeof message.type !== 'string') throw new Error('Invalid request.');
    if (message.type === 'status') return status();
    // OFF/reset must remain usable even when saved settings are corrupt.
    if (message.type === 'disable' || message.type === 'reset') {
      await api.proxy.settings.clear({ scope: 'regular_only' });
      if (message.type === 'reset') await api.storage.local.remove('settings');
      else {
        let current;
        try { current = await read(); } catch { current = { ...DEFAULTS, domains: [] }; }
        await api.storage.local.set({ settings: { ...current, enabled: false } });
      }
      await api.storage.session.remove('proxyError');
      return status();
    }
    const current = await read();
    if (message.type === 'enable') return apply(normalizeSettings({ ...current, enabled: true }));
    if (message.type === 'save') {
      const payload = message.settings;
      if (!payload || typeof payload !== 'object') throw new Error('Invalid settings.');
      return apply(normalizeSettings({ ...current,
        port: payload.port, domains: payload.domains, directAcknowledged: payload.directAcknowledged }));
    }
    throw new Error('Unknown request.');
  }

  async function reconcile() {
    const saved = await read();
    const proxy = await effective();
    if (!saved.enabled) {
      if (proxy.levelOfControl === 'controlled_by_this_extension') await api.proxy.settings.clear({ scope: 'regular_only' });
    } else if (proxy.levelOfControl === 'controlled_by_this_extension') {
      if (!isOurConfig(proxy.value, saved)) {
        await api.proxy.settings.set({ value: buildProxyConfig(saved), scope: 'regular_only' });
      }
    } else if (proxy.levelOfControl === 'controllable_by_this_extension' && !controlProblem(proxy)) {
      // Chrome may clear a developer extension's override across reload/restart.
      // Restore explicitly enabled rules only over an unclaimed direct/system base.
      return apply(saved);
    } else {
      // Do not reclaim a proxy from another extension or policy during startup.
      return status();
    }
    return status();
  }

  return { dispatch: (message) => run(() => dispatch(message)), reconcile: () => run(reconcile) };
}
