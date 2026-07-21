(() => {
  "use strict";

  if (window.__SCPR_API_BRIDGE__) return;
  window.__SCPR_API_BRIDGE__ = true;

  const WATCH_URL_RE = /\/api\/(?:v3\/companies\/auth-data|v2\/companies\/me\/administration-overhead|v3\/companies\/me\/executives|v4\/\d+\/resources-retail-info|v2\/weather\/\d+|v3\/encyclopedia\/events\/\d+|v3\/companies-by-company\/\d+\/|v3\/market-ticker\/\d+|v2\/market-ticker\/|v2\/market\/|v3\/market\/)/i;
  const MAX_CAPTURED = 60;
  const captured = new Map();
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  let enabled = true;

  function normalizeKey(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ""), window.location.origin);
      return url.pathname.replace(/\/+$/, "") || "/";
    } catch {
      return String(rawUrl || "").split("?")[0].replace(/\/+$/, "");
    }
  }

  function isWatched(rawUrl) {
    return WATCH_URL_RE.test(String(rawUrl || ""));
  }

  function remember(url, payload, status = 200) {
    if (!enabled || !isWatched(url)) return;
    const entry = {
      url: String(url),
      key: normalizeKey(url),
      payload,
      status: Number(status) || 0,
      capturedAt: Date.now(),
    };
    captured.delete(entry.key);
    captured.set(entry.key, entry);
    while (captured.size > MAX_CAPTURED) captured.delete(captured.keys().next().value);
    return entry;
  }

  function postEntry(entry) {
    if (!entry || !enabled) return;
    try {
      window.postMessage(
        {
          source: "simco-profit-radar-page",
          type: "api-response",
          entry,
        },
        window.location.origin,
      );
    } catch {
    }
  }

  function capture(url, payload, status = 200) {
    const entry = remember(url, payload, status);
    postEntry(entry);
  }

  const patchedFetch = async function patchedFetch(...args) {
    const response = await originalFetch.apply(this, args);
    const input = args[0];
    const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input?.url;
    const method = String(args[1]?.method || input?.method || "GET").toUpperCase();
    if (enabled && method === "GET" && isWatched(requestUrl)) {
      response
        .clone()
        .json()
        .then((payload) => capture(requestUrl, payload, response.status))
        .catch(() => {});
    }
    return response;
  };
  window.fetch = patchedFetch;

  const patchedOpen = function patchedOpen(method, url, ...rest) {
    this.__scprUrl = String(url || "");
    this.__scprMethod = String(method || "GET").toUpperCase();
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.open = patchedOpen;

  const patchedSend = function patchedSend(...args) {
    if (enabled && this.__scprMethod === "GET" && isWatched(this.__scprUrl || "")) {
      this.addEventListener(
        "load",
        () => {
          try {
            const payload =
              typeof this.response === "object" && this.response !== null
                ? this.response
                : JSON.parse(this.responseText);
            capture(this.__scprUrl, payload, this.status);
          } catch {
          }
        },
        { once: true },
      );
    }
    return originalSend.apply(this, args);
  };
  XMLHttpRequest.prototype.send = patchedSend;

  function handleControlMessage(event) {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.source !== "simco-profit-radar-content") return;

    if (event.data.type === "bridge-dump") {
      try {
        window.postMessage(
          {
            source: "simco-profit-radar-page",
            type: "api-response-dump",
            entries: [...captured.values()],
          },
          window.location.origin,
        );
      } catch {
      }
      return;
    }

    if (event.data.type !== "bridge-disable") return;
    enabled = false;
    if (window.fetch === patchedFetch) window.fetch = originalFetch;
    if (XMLHttpRequest.prototype.open === patchedOpen) XMLHttpRequest.prototype.open = originalOpen;
    if (XMLHttpRequest.prototype.send === patchedSend) XMLHttpRequest.prototype.send = originalSend;
    window.__SCPR_API_BRIDGE__ = false;
    window.__SCPR_MARKET_BRIDGE__ = false;
    window.removeEventListener("message", handleControlMessage);
  }

  window.__SCPR_MARKET_BRIDGE__ = true;
  window.addEventListener("message", handleControlMessage);
})();
