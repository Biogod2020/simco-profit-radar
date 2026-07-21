(() => {
  "use strict";

  function inject() {
    try {
      const root = document.documentElement;
      const parent = root || document.head;
      if (!parent) return false;
      if (root?.dataset?.scprBridgeInjected === "1") return true;
      if (root) root.dataset.scprBridgeInjected = "1";
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("page-bridge.js");
      script.async = false;
      script.dataset.scprBridgeLoader = "1";
      script.onload = () => script.remove();
      script.onerror = () => {
        script.remove();
        if (root?.dataset?.scprBridgeInjected === "1") delete root.dataset.scprBridgeInjected;
      };
      parent.appendChild(script);
      return true;
    } catch {
      return false;
    }
  }

  if (!inject()) {
    const retry = () => {
      if (inject()) document.removeEventListener("readystatechange", retry);
    };
    document.addEventListener("readystatechange", retry);
  }
})();
