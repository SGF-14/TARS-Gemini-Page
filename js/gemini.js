// Gemini REST client — talks to generativelanguage.googleapis.com from the browser.
"use strict";

class GeminiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status; // e.g. "API_KEY_INVALID", "RESOURCE_EXHAUSTED"
    this.code = code;     // HTTP-ish numeric code from the error body
  }
}

const GeminiAPI = (() => {
  const BASE = "https://generativelanguage.googleapis.com/v1beta";

  async function request(url, options = {}) {
    let res;
    try {
      res = await fetch(url, options);
    } catch {
      throw new GeminiError("Network error - check your connection.", "NETWORK", 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.error || {};
      // API_KEY_INVALID hides inside error.details[].reason on 400s
      const reason = (err.details || []).map((d) => d.reason).find(Boolean);
      throw new GeminiError(err.message || `HTTP ${res.status}`, reason || err.status || `HTTP_${res.status}`, err.code || res.status);
    }
    return data;
  }

  /** List models that support generateContent. Follows pagination. Also validates the key. */
  async function listModels(key) {
    const models = [];
    let pageToken = "";
    do {
      const url = `${BASE}/models?key=${encodeURIComponent(key)}&pageSize=1000` +
                  (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
      const data = await request(url);
      for (const m of data.models || []) {
        if ((m.supportedGenerationMethods || []).includes("generateContent")) {
          models.push({ name: m.name, displayName: m.displayName || m.name.replace(/^models\//, "") });
        }
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken);
    return models;
  }

  function pickDefaultModel(models) {
    // Prefer the rolling "latest" alias, then the newest numbered flash model.
    // (Fixed names go stale: e.g. gemini-2.5-flash became unavailable to new users.)
    const exact = models.find((m) => m.name === "models/gemini-flash-latest");
    if (exact) return exact.name;

    const flash = models
      .map((m) => ({ name: m.name, v: /gemini-(\d+(?:\.\d+)?)-flash$/.exec(m.name)?.[1] }))
      .filter((m) => m.v)
      .sort((a, b) => parseFloat(b.v) - parseFloat(a.v));
    if (flash.length) return flash[0].name;

    const anyFlash = models.find((m) => /flash/.test(m.name) && !/preview|exp|8b|lite/.test(m.name));
    return anyFlash?.name || models[0]?.name || "";
  }

  /** Assemble a generateContent body. Extensions are included ONLY when non-empty. */
  function buildRequest({ contents, persona, rag, toolDecls }) {
    const body = { contents };

    const sysParts = [];
    if (persona) sysParts.push({ text: persona });
    if (rag) sysParts.push({ text: "REFERENCE KNOWLEDGE (use when relevant):\n" + rag });
    if (sysParts.length) body.systemInstruction = { parts: sysParts };

    if (toolDecls && toolDecls.length) {
      body.tools = [{ functionDeclarations: toolDecls }];
    }
    return body;
  }

  async function generateContent(key, model, body) {
    const url = `${BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`;
    return request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /** Normalize a generateContent response. */
  function extractParts(resp) {
    const blockReason = resp.promptFeedback?.blockReason || null;
    const cand = resp.candidates?.[0];
    const parts = cand?.content?.parts || [];
    let text = "";
    const functionCalls = [];
    for (const p of parts) {
      if (p.text) text += p.text;
      if (p.functionCall) functionCalls.push(p.functionCall);
    }
    return {
      text: text.trim(),
      functionCalls,
      modelContent: cand?.content || null, // replayed into history for the tool loop
      finishReason: cand?.finishReason || null,
      blockReason,
    };
  }

  return { listModels, pickDefaultModel, buildRequest, generateContent, extractParts };
})();
