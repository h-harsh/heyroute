export const DEFAULTS = Object.freeze({
  version: 1, enabled: false, port: 1080, domains: [], directAcknowledged: false,
});

export function normalizeDomains(input) {
  const text = Array.isArray(input) ? input.join('\n') : input;
  if (typeof text !== 'string' || text.length > 8192) {
    throw new Error('Enter up to 100 hostnames, within 8 KiB.');
  }
  const entries = text.split(/\r?\n/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (entries.length > 100) throw new Error('Use at most 100 hostname rules.');
  const domains = [];
  for (const entry of entries) {
    const domain = entry.startsWith('*.') ? entry.slice(2) : entry;
    const labels = domain.split('.');
    if (domain.length > 253 || labels.length < 2 ||
        labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
        !/[a-z]/.test(labels.at(-1)) ||
        /(^|\.)(localhost|local)$/.test(domain)) {
      throw new Error('Use bare hostnames such as app.example.com or *.example.com; no URLs, IPs, or local names.');
    }
    if (!domains.includes(entry)) domains.push(entry);
  }
  return domains;
}

export function normalizeSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Settings must be an object.');
  }
  if (input.version !== undefined && input.version !== 1) throw new Error('Unsupported settings version.');
  const port = input.port ?? DEFAULTS.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a whole-number port from 1 to 65535.');
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new Error('Invalid routing state.');
  if (input.directAcknowledged !== undefined && typeof input.directAcknowledged !== 'boolean') {
    throw new Error('Invalid direct-routing acknowledgement.');
  }
  const settings = {
    version: 1,
    enabled: input.enabled ?? false,
    port,
    domains: normalizeDomains(input.domains ?? []),
    directAcknowledged: input.directAcknowledged ?? false,
  };
  if (settings.enabled && !settings.domains.length) throw new Error('Add at least one hostname in settings before enabling.');
  if (settings.enabled && !settings.directAcknowledged) {
    throw new Error('Confirm direct routing in settings before enabling.');
  }
  return settings;
}

export function buildProxyConfig(input) {
  const settings = normalizeSettings(input);
  const data = `function FindProxyForURL(url, host) {
  host = host.toLowerCase().replace(/\\.$/, "");
  var rules = ${JSON.stringify(settings.domains)};
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (rule.slice(0, 2) === "*.") {
      var suffix = rule.slice(1);
      if (host.length > suffix.length && host.slice(-suffix.length) === suffix) {
        return "SOCKS5 127.0.0.1:${settings.port}";
      }
    } else if (host === rule) {
      return "SOCKS5 127.0.0.1:${settings.port}";
    }
  }
  return "DIRECT";
}`;
  return { mode: 'pac_script', pacScript: { data, mandatory: true } };
}

export function isOurConfig(value, settings) {
  const expected = buildProxyConfig(settings);
  return value?.mode === expected.mode && value.pacScript?.mandatory === true &&
    value.pacScript?.data === expected.pacScript.data;
}

export function controlProblem(setting) {
  if (setting.levelOfControl === 'not_controllable') return 'A managed policy controls this profile’s proxy. HeyRoute cannot enable.';
  if (setting.levelOfControl === 'controlled_by_other_extensions') return 'Another extension controls this profile’s proxy. Resolve that conflict before enabling.';
  if (setting.levelOfControl !== 'controlled_by_this_extension' &&
      !['direct', 'system'].includes(setting.value?.mode)) {
    return 'This profile already uses a proxy. HeyRoute cannot preserve that configuration for other sites.';
  }
  return null;
}
