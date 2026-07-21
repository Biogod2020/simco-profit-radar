const ALLOWED_HOSTS = new Set([
  "www.simcompanies.com",
  "api.simcotools.com",
  "simcotools.app",
  "www.simcotools.app",
]);

const CACHE_PREFIX = "scpr:http:";
const RATE_PREFIX = "scpr:rate:";
const SIMCOMPANIES_TAB_PATTERNS = ["https://www.simcompanies.com/*"];
const IS_TEST = Boolean(globalThis.__SCPR_TEST__);

const BASE_HOST_POLICIES = {
  "www.simcompanies.com": {
    minGapMs: 900,
    maxRetries: 2,
    retryBaseMs: 1800,
    maxInlineWaitMs: 15_000,
  },
  "api.simcotools.com": {
    minGapMs: 1000,
    maxRetries: 2,
    retryBaseMs: 1800,
    maxInlineWaitMs: 15_000,
  },
  "simcotools.app": {
    minGapMs: 1000,
    maxRetries: 2,
    retryBaseMs: 1800,
    maxInlineWaitMs: 15_000,
  },
  "www.simcotools.app": {
    minGapMs: 1000,
    maxRetries: 2,
    retryBaseMs: 1800,
    maxInlineWaitMs: 15_000,
  },
};

const hostStates = new Map();
const inFlightByCacheKey = new Map();

function bgText(language, en, zh) {
  return language === "zh" ? zh : en;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function policyForUrl(url) {
  const host = url.hostname;
  let policy = BASE_HOST_POLICIES[host] || {
    minGapMs: 1000,
    maxRetries: 1,
    retryBaseMs: 2000,
    maxInlineWaitMs: 15_000,
  };
  if (host === "www.simcompanies.com" && url.pathname.startsWith("/api/")) {
    policy = {
      ...policy,
      minGapMs: 5 * 60 * 1000,
      maxRetries: 0,
      maxInlineWaitMs: 1000,
    };
  }
  if (!IS_TEST) return policy;
  return {
    ...policy,
    minGapMs: 0,
    retryBaseMs: 1,
    maxInlineWaitMs: 20,
  };
}

function queueKeyForUrl(url) {
  if (url.hostname === "www.simcompanies.com" && url.pathname.startsWith("/api/")) {
    return `${url.hostname}:api`;
  }
  if (url.hostname === "www.simcompanies.com") return `${url.hostname}:static`;
  return url.hostname;
}

function createNetworkError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

function serializeError(error) {
  return {
    message: String(error?.message || error || "Fetch failed"),
    code: error?.code || "HTTP_ERROR",
    status: Number.isFinite(error?.status) ? error.status : null,
    url: error?.url || "",
    host: error?.host || "",
    retryAfterMs: Number.isFinite(error?.retryAfterMs) ? Math.max(0, error.retryAfterMs) : null,
  };
}

function parseRetryAfterMs(response) {
  const raw = response?.headers?.get?.("Retry-After");
  if (!raw) return NaN;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : NaN;
}

function isRetriableStatus(status) {
  return status === 429 || status === 408 || status === 425 || status === 502 || status === 503 || status === 504;
}

function cacheStorageKey(cacheKey) {
  return `${CACHE_PREFIX}${cacheKey}`;
}

function rateStorageKey(host) {
  return `${RATE_PREFIX}${host}`;
}

async function readCache(cacheKey) {
  const key = cacheStorageKey(cacheKey);
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

async function writeCache(cacheKey, entry) {
  const key = cacheStorageKey(cacheKey);
  await chrome.storage.local.set({ [key]: entry });
}

async function readPersistentCooldown(host) {
  const key = rateStorageKey(host);
  const result = await chrome.storage.local.get(key);
  const value = Number(result[key]?.until || 0);
  return Number.isFinite(value) ? value : 0;
}

async function writePersistentCooldown(host, until) {
  const key = rateStorageKey(host);
  await chrome.storage.local.set({
    [key]: {
      until: Math.max(0, Number(until) || 0),
      updatedAt: Date.now(),
    },
  });
}

function getHostState(key, host) {
  let state = hostStates.get(key);
  if (!state) {
    state = {
      key,
      host,
      tail: Promise.resolve(),
      nextAllowedAt: 0,
      cooldownUntil: 0,
      loaded: false,
      loadPromise: null,
    };
    hostStates.set(key, state);
  }
  return state;
}

async function ensureHostStateLoaded(state) {
  if (state.loaded) return;
  if (!state.loadPromise) {
    state.loadPromise = readPersistentCooldown(state.key)
      .then((until) => {
        state.cooldownUntil = Math.max(state.cooldownUntil, until);
        state.loaded = true;
      })
      .catch(() => {
        state.loaded = true;
      });
  }
  await state.loadPromise;
}

async function setHostCooldown(state, until) {
  state.cooldownUntil = Math.max(state.cooldownUntil, until);
  try {
    await writePersistentCooldown(state.key, state.cooldownUntil);
  } catch {
  }
}

async function clearHostCooldown(state) {
  if (state.cooldownUntil <= 0) return;
  state.cooldownUntil = 0;
  try {
    await writePersistentCooldown(state.key, 0);
  } catch {
  }
}

function isAllowedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

async function refreshOpenSimCompaniesTabs(details) {
  if (!details || !["install", "update"].includes(details.reason)) return;
  try {
    const tabs = await chrome.tabs.query({ url: SIMCOMPANIES_TAB_PATTERNS });
    await Promise.allSettled(
      tabs
        .filter((tab) => Number.isInteger(tab.id) && tab.status === "complete")
        .map((tab) => chrome.tabs.reload(tab.id)),
    );
  } catch (error) {
    console.debug("[SimCo Profit Radar] tab refresh after extension lifecycle event skipped", error);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  void refreshOpenSimCompaniesTabs(details);
});

async function scheduleForHost(rawUrl, task, language = "en") {
  const url = new URL(rawUrl);
  const queueKey = queueKeyForUrl(url);
  const state = getHostState(queueKey, url.hostname);
  const policy = policyForUrl(url);

  const run = state.tail
    .catch(() => undefined)
    .then(async () => {
      await ensureHostStateLoaded(state);
      const now = Date.now();
      const gateUntil = Math.max(state.nextAllowedAt, state.cooldownUntil);
      const waitMs = Math.max(0, gateUntil - now);
      if (waitMs > policy.maxInlineWaitMs) {
        throw createNetworkError(
          bgText(language, `${url.hostname} is rate limited; retry in about ${Math.ceil(waitMs / 1000)} seconds`, `${url.hostname} 正在限流，约 ${Math.ceil(waitMs / 1000)} 秒后可重试`),
          {
            code: "RATE_LIMITED",
            status: 429,
            url: rawUrl,
            host: url.hostname,
            retryAfterMs: waitMs,
          },
        );
      }
      if (waitMs > 0) await sleep(waitMs);
      state.nextAllowedAt = Date.now() + policy.minGapMs;
      return task({ state, policy, url });
    });

  state.tail = run.catch(() => undefined);
  return run;
}

async function readResponseBodySnippet(response) {
  try {
    return String(await response.clone().text()).replace(/\s+/g, " ").slice(0, 240);
  } catch {
    return "";
  }
}

async function performNetworkFetch({ url, responseType, maxRetries, language = "en" }, cached) {
  return scheduleForHost(url, async ({ state, policy, url: parsedUrl }) => {
    const requestedRetries = clamp(
      Number.isFinite(maxRetries) ? Math.trunc(maxRetries) : policy.maxRetries,
      0,
      3,
    );
    const retries = Math.min(requestedRetries, policy.maxRetries);

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let response;
      try {
        response = await fetch(url, {
          method: "GET",
          credentials: url.startsWith("https://www.simcompanies.com/") ? "include" : "omit",
          headers: { Accept: responseType === "json" ? "application/json" : "text/plain,*/*" },
          cache: "no-store",
        });
      } catch (cause) {
        if (attempt < retries) {
          await sleep(policy.retryBaseMs * 2 ** attempt);
          continue;
        }
        throw createNetworkError(bgText(language, `${parsedUrl.hostname}: network request failed`, `${parsedUrl.hostname}: 网络请求失败`), {
          code: "NETWORK_ERROR",
          url,
          host: parsedUrl.hostname,
          cause,
        });
      }

      if (response.ok) {
        const payload = responseType === "json" ? await response.json() : await response.text();
        await clearHostCooldown(state);
        return payload;
      }

      const status = response.status;
      const body = await readResponseBodySnippet(response);
      if (!isRetriableStatus(status)) {
        throw createNetworkError(
          `${parsedUrl.hostname}${parsedUrl.pathname}: HTTP ${status}${body ? ` — ${body}` : ""}`,
          {
            code: "HTTP_ERROR",
            status,
            url,
            host: parsedUrl.hostname,
          },
        );
      }

      const headerWait = parseRetryAfterMs(response);
      const fallbackWait = status === 429
        ? 5 * 60 * 1000
        : policy.retryBaseMs * 2 ** attempt;
      const retryAfterMs = Math.max(0, Number.isFinite(headerWait) ? headerWait : fallbackWait);
      if (status === 429) await setHostCooldown(state, Date.now() + retryAfterMs);

      const error = createNetworkError(
        `${parsedUrl.hostname}${parsedUrl.pathname}: HTTP ${status}${status === 429 ? bgText(language, ` (rate limited; retry in about ${Math.ceil(retryAfterMs / 1000)} seconds)`, `（限流，约 ${Math.ceil(retryAfterMs / 1000)} 秒后可重试）`) : ""}${body ? ` — ${body}` : ""}`,
        {
          code: status === 429 ? "RATE_LIMITED" : "HTTP_RETRYABLE",
          status,
          url,
          host: parsedUrl.hostname,
          retryAfterMs,
        },
      );

      if (cached) throw error;
      if (attempt >= retries || retryAfterMs > policy.maxInlineWaitMs) throw error;

      const jitter = IS_TEST ? 0 : Math.floor(Math.random() * 250);
      await sleep(retryAfterMs + jitter);
      state.nextAllowedAt = Date.now() + policy.minGapMs;
    }

    throw createNetworkError("Fetch failed", { code: "NETWORK_ERROR", url, host: parsedUrl.hostname });
  }, language);
}

async function fetchWithCache({
  url,
  cacheKey,
  ttlMs = 0,
  force = false,
  responseType = "json",
  maxRetries,
  staleIfError = true,
  cacheResponse = true,
  language = "en",
}) {
  if (!isAllowedUrl(url)) throw new Error("Blocked URL");
  if (!cacheKey || typeof cacheKey !== "string") throw new Error("cacheKey is required");
  if (!Number.isFinite(ttlMs) || ttlMs < 0) throw new Error("Invalid ttlMs");
  if (!["json", "text"].includes(responseType)) throw new Error("Unsupported responseType");

  const inFlightKey = `${cacheKey}:${responseType}`;
  if (inFlightByCacheKey.has(inFlightKey)) return inFlightByCacheKey.get(inFlightKey);

  const operation = (async () => {
    const cached = cacheResponse === false ? null : await readCache(cacheKey);
    const ageMs = cached?.fetchedAt ? Date.now() - cached.fetchedAt : Infinity;
    if (!force && cached && ageMs < ttlMs) return { ...cached, cache: "fresh", ageMs };

    try {
      const payload = await performNetworkFetch({ url, responseType, maxRetries, language }, cached);
      const entry = {
        payload,
        fetchedAt: Date.now(),
        url,
        responseType,
      };
      if (cacheResponse !== false) await writeCache(cacheKey, entry);
      return { ...entry, cache: cacheResponse === false ? "network-no-store" : "network", ageMs: 0 };
    } catch (error) {
      if (cached && staleIfError !== false) {
        return {
          ...cached,
          cache: "stale",
          ageMs,
          warning: String(error?.message || error),
          rateLimited: error?.code === "RATE_LIMITED" || error?.status === 429,
          retryAfterMs: Number.isFinite(error?.retryAfterMs) ? error.retryAfterMs : null,
        };
      }
      throw error;
    }
  })();

  inFlightByCacheKey.set(inFlightKey, operation);
  try {
    return await operation;
  } finally {
    if (inFlightByCacheKey.get(inFlightKey) === operation) inFlightByCacheKey.delete(inFlightKey);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SCPR_FETCH") return false;

  fetchWithCache(message.request || {})
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));

  return true;
});
