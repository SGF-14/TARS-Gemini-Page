// Persistence — every localStorage key lives here.
"use strict";

const Store = (() => {
  const KEYS = {
    apiKey: "tars.gemini.apiKey",
    model: "tars.gemini.model",
    rag: "tars.ext.rag",
    functions: "tars.ext.functions",
    personalize: "tars.ext.personalize",
    music: "tars.ui.music",
    lang: "tars.ui.lang",
  };

  function get(key) {
    try { return localStorage.getItem(KEYS[key]) || ""; } catch { return ""; }
  }

  function set(key, value) {
    try {
      localStorage.setItem(KEYS[key], value);
      return { ok: true };
    } catch (e) {
      // QuotaExceededError on very large saves (huge RAG pastes)
      return { ok: false, error: "Could not save - browser storage is full." };
    }
  }

  function remove(key) {
    try { localStorage.removeItem(KEYS[key]); } catch { /* ignore */ }
  }

  return { get, set, remove };
})();
