import CDP from 'chrome-remote-interface';

const COOKIE_FIELDS = [
  'url',
  'domain',
  'path',
  'secure',
  'httpOnly',
  'sameSite',
  'expires',
  'priority',
  'sameParty',
  'sourceScheme',
  'sourcePort',
  'partitionKey'
];

function parseCookieString(cookieString, url) {
  const separatorIndex = cookieString.indexOf('=');
  if (separatorIndex <= 0) {
    throw new Error('Cookie entries must use the name=value format');
  }

  return {
    name: cookieString.slice(0, separatorIndex).trim(),
    value: cookieString.slice(separatorIndex + 1).trim(),
    url,
    secure: new URL(url).protocol === 'https:'
  };
}

function parseCookieHeader(cookieHeader, url) {
  return cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .map(cookie => parseCookieString(cookie, url));
}

function normalizeCookie(cookie, url) {
  if (typeof cookie === 'string') return parseCookieString(cookie, url);
  if (!cookie || typeof cookie !== 'object' || !cookie.name) {
    throw new Error('Cookies must be name=value strings or cookie objects');
  }

  const normalized = {
    name: String(cookie.name),
    value: String(cookie.value ?? '')
  };
  for (const field of COOKIE_FIELDS) {
    if (cookie[field] !== undefined) normalized[field] = cookie[field];
  }

  if (!normalized.url && !normalized.domain) normalized.url = url;
  if (normalized.domain && !normalized.path) normalized.path = '/';
  if (normalized.expires !== undefined && normalized.expires <= 0) {
    delete normalized.expires;
  }
  return normalized;
}

export function parseCookies(url, flags = {}) {
  const lighthouseFlags = { ...flags };
  const configuredCookies = lighthouseFlags.cookies;
  delete lighthouseFlags.cookies;

  const extraHeaders = lighthouseFlags.extraHeaders
    ? { ...lighthouseFlags.extraHeaders }
    : undefined;
  const cookieHeaderName = extraHeaders
    ? Object.keys(extraHeaders).find(name => name.toLowerCase() === 'cookie')
    : undefined;
  const cookieHeader = cookieHeaderName
    ? String(extraHeaders[cookieHeaderName])
    : undefined;

  if (cookieHeaderName) delete extraHeaders[cookieHeaderName];
  if (extraHeaders && Object.keys(extraHeaders).length > 0) {
    lighthouseFlags.extraHeaders = extraHeaders;
  } else {
    delete lighthouseFlags.extraHeaders;
  }

  if (configuredCookies !== undefined && !Array.isArray(configuredCookies)) {
    throw new Error('The Lighthouse cookies option must be an array');
  }

  const cookies = [
    ...(cookieHeader ? parseCookieHeader(cookieHeader, url) : []),
    ...(configuredCookies || []).map(cookie => normalizeCookie(cookie, url))
  ];

  return { cookies, lighthouseFlags };
}

export async function installCookies(port, cookies) {
  const client = await CDP({ port });
  try {
    await client.Network.enable();
    await client.Network.setCookies({ cookies });
  } finally {
    await client.close();
  }
}
