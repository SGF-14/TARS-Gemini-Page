// The three extension editors (RAG / FUNCTIONS / PERSONALIZE) share one modal.
// Whatever the user saves here is injected into every Gemini call - but ONLY
// while it is non-empty. Empty = the model never sees it.
"use strict";

const EXTENSIONS = {
  rag: {
    key: "rag",
    button: "btn-rag",
    title: "RAG — KNOWLEDGE",
    hint: "Paste documents, notes or facts. While non-empty, they are injected as reference context for every answer — ask about them and TARS will know.",
    placeholder: "MISSION BRIEF:\nThe station's docking code is CASE-3-3-1.\nDr. Brand's favourite equation is the gravity equation.\n\n(paste anything - manuals, lore, your own docs)",
    example:
      "MISSION BRIEF\n=============\nShip: Endurance. Crew: Cooper, Brand, Doyle, Romilly.\n" +
      "Docking code: CASE-3-3-1.\nWormhole located near Saturn, 14 months out.\n" +
      "Plan A: gravity equation. Plan B: population bomb.",
    maxWarn: 200_000,
  },
  functions: {
    key: "functions",
    button: "btn-functions",
    title: "FUNCTIONS — ROBOT TOOLS",
    hint: "Gemini function declarations (JSON). While non-empty and valid, the model can call these to drive the robot — try “walk two steps then introduce yourself”. Press LOAD EXAMPLE for the full robot API.",
    placeholder: '[\n  { "name": "walk", "description": "…", "parameters": { … } }\n]\n\n(press LOAD EXAMPLE)',
    example: ROBOT_TOOL_EXAMPLE,
    validate: parseToolsJson,
  },
  personalize: {
    key: "personalize",
    button: "btn-personalize",
    title: "PERSONALIZE — PERSONA",
    hint: "A system prompt. While non-empty it is sent as the model's systemInstruction — personality, rules, style, anything.",
    placeholder: "You are TARS from Interstellar.\nHumor setting: 75%. Honesty setting: 90%.\nAnswer concisely and deadpan.",
    example:
      "You are TARS, the tactical robot from Interstellar.\n" +
      "Humor setting: 75%. Honesty setting: 90%.\n" +
      "You are dry-witted, precise and mission-focused.\n" +
      "Keep replies short and conversational.",
  },
};

const Editors = (() => {
  const modal = document.getElementById("editor-modal");
  const elTitle = document.getElementById("em-title");
  const elHint = document.getElementById("em-hint");
  const elText = document.getElementById("em-text");
  const elCount = document.getElementById("em-count");
  const elSaved = document.getElementById("em-saved");
  const elError = document.getElementById("em-error");
  const btnSave = document.getElementById("em-save");
  const btnExample = document.getElementById("em-example");
  const btnClear = document.getElementById("em-clear");
  const btnCancel = document.getElementById("em-cancel");

  let current = null;
  let clearArmed = false;

  function refreshButtons() {
    for (const ext of Object.values(EXTENSIONS)) {
      document.getElementById(ext.button).classList.toggle("active", !!Store.get(ext.key));
    }
  }

  function updateCount() {
    const n = elText.value.length;
    let label = `${n.toLocaleString()} chars`;
    if (current?.maxWarn && n > current.maxWarn) label += " — large; answers may slow down";
    elCount.textContent = label;
  }

  function open(id) {
    current = EXTENSIONS[id];
    clearArmed = false;
    elTitle.textContent = current.title;
    elHint.textContent = current.hint;
    elText.value = Store.get(current.key);
    elText.placeholder = current.placeholder;
    elError.hidden = true;
    elSaved.hidden = true;
    btnClear.textContent = "CLEAR";
    updateCount();
    modal.hidden = false;
    elText.focus();
  }

  function close() {
    modal.hidden = true;
    current = null;
  }

  btnSave.addEventListener("click", () => {
    const value = elText.value.trim();
    if (value && current.validate) {
      const result = current.validate(value);
      if (result.error) {
        elError.textContent = result.error;
        elError.hidden = false;
        return;
      }
    }
    const res = value ? Store.set(current.key, value) : (Store.remove(current.key), { ok: true });
    if (!res.ok) {
      elError.textContent = res.error;
      elError.hidden = false;
      return;
    }
    refreshButtons();
    elError.hidden = true;
    elSaved.hidden = false;
    setTimeout(close, 700);
  });

  btnExample.addEventListener("click", () => {
    elText.value = current.example || "";
    elError.hidden = true;
    updateCount();
    elText.focus();
  });

  btnClear.addEventListener("click", () => {
    if (!clearArmed) {
      clearArmed = true;
      btnClear.textContent = "SURE?";
      return;
    }
    elText.value = "";
    Store.remove(current.key);
    refreshButtons();
    clearArmed = false;
    btnClear.textContent = "CLEAR";
    updateCount();
  });

  btnCancel.addEventListener("click", close);
  modal.addEventListener("pointerdown", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
  elText.addEventListener("input", updateCount);

  for (const [id, ext] of Object.entries(EXTENSIONS)) {
    document.getElementById(ext.button).addEventListener("click", () => open(id));
  }

  return { refreshButtons };
})();
