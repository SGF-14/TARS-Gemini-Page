// Glue: boot, settings modal, chat with Gemini (incl. function-calling loop),
// devtools, robot reactions.
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initWallpaper();

  const tars = createTars(document.getElementById("tars-root"));
  tars.idle();
  window.tars = tars; // console access - and the FUNCTIONS editor drives this too

  // ---------------- ambient music (20% volume, toggleable) ----------------
  const bgm = document.getElementById("bgm");
  const bgmToggle = document.getElementById("bgm-toggle");
  bgm.volume = 0.05;
  let musicOn = Store.get("music") !== "off";

  function applyMusic() {
    bgmToggle.classList.toggle("muted", !musicOn);
    if (musicOn) bgm.play().catch(() => {}); // needs a user gesture first - retried below
    else bgm.pause();
  }
  bgmToggle.addEventListener("click", () => {
    musicOn = !musicOn;
    Store.set("music", musicOn ? "on" : "off");
    applyMusic();
  });
  bgm.addEventListener("error", () => (bgmToggle.hidden = true));
  applyMusic();

  // one-time autoplay retry for browsers that defer media until a gesture
  document.addEventListener("pointerdown", () => {
    document.querySelectorAll("video").forEach((v) => v.paused && v.play().catch(() => {}));
    if (musicOn) bgm.play().catch(() => {});
  }, { once: true });

  const statusEl = document.getElementById("status");
  const chatPanel = document.getElementById("chat-panel");
  const messagesEl = document.getElementById("messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = chatForm.querySelector("button");

  // ---------------- status pill ----------------
  function setStatus(text, cls = "") {
    statusEl.textContent = text;
    statusEl.className = cls;
  }
  function refreshStatus() {
    if (!Store.get("apiKey")) return setStatus("NO API KEY", "offline");
    const model = Store.get("model");
    setStatus(model ? `READY · ${model.replace(/^models\//, "")}` : "READY", "");
  }

  // ---------------- chat panel ----------------
  document.getElementById("chat-toggle").addEventListener("click", () => {
    chatPanel.classList.toggle("open");
    if (chatPanel.classList.contains("open")) chatInput.focus();
  });

  function addMsg(role, text, extraClass = "") {
    const div = document.createElement("div");
    div.className = `msg ${role} ${extraClass}`.trim();
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  /** Markdown-lite for assistant replies: ```code blocks```, `inline code`, **bold**. */
  function renderRich(el, text) {
    let h = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    h = h.replace(/```\w*\n?([\s\S]*?)```/g, (_, code) => `<pre class="chat-code">${code.replace(/\n$/, "")}</pre>`);
    h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
    el.innerHTML = h;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  let history = []; // Gemini `contents` array, including tool round-trips

  document.getElementById("chat-clear").addEventListener("click", () => {
    history = [];
    messagesEl.innerHTML = "";
  });

  // ---------------- settings modal ----------------
  const settingsModal = document.getElementById("settings-modal");
  const smKey = document.getElementById("sm-key");
  const smShow = document.getElementById("sm-show");
  const smModelRow = document.getElementById("sm-model-row");
  const smModel = document.getElementById("sm-model");
  const smError = document.getElementById("sm-error");
  const smSave = document.getElementById("sm-save");

  function openSettings() {
    smKey.value = Store.get("apiKey");
    smError.hidden = true;
    smModelRow.hidden = true;
    settingsModal.hidden = false;
    if (smKey.value) populateModels(smKey.value).catch(() => {});
    smKey.focus();
  }
  function closeSettings() { settingsModal.hidden = true; }

  async function populateModels(key) {
    const models = await GeminiAPI.listModels(key);
    if (!models.length) throw new GeminiError("No usable models on this key.", "EMPTY", 0);
    smModel.innerHTML = "";
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = m.name.replace(/^models\//, "");
      smModel.appendChild(opt);
    }
    const stored = Store.get("model");
    smModel.value = models.some((m) => m.name === stored) ? stored : GeminiAPI.pickDefaultModel(models);
    smModelRow.hidden = false;
    return models;
  }

  smShow.addEventListener("click", () => {
    smKey.type = smKey.type === "password" ? "text" : "password";
  });

  smSave.addEventListener("click", async () => {
    const key = smKey.value.trim();
    if (!key) {
      smError.textContent = "Enter an API key first.";
      smError.hidden = false;
      return;
    }
    smSave.disabled = true;
    smSave.textContent = "CHECKING…";
    try {
      await populateModels(key); // doubles as key validation
      Store.set("apiKey", key);
      Store.set("model", smModel.value);
      refreshStatus();
      closeSettings();
    } catch (err) {
      smError.textContent = err.status === "NETWORK"
        ? err.message
        : `Key rejected: ${err.message}`;
      smError.hidden = false;
    } finally {
      smSave.disabled = false;
      smSave.textContent = "SAVE";
    }
  });

  document.getElementById("sm-cancel").addEventListener("click", closeSettings);
  settingsModal.addEventListener("pointerdown", (e) => { if (e.target === settingsModal) closeSettings(); });
  statusEl.addEventListener("click", openSettings);
  document.getElementById("btn-settings").addEventListener("click", openSettings);

  // ---------------- dev tools ----------------
  const dtMenu = document.getElementById("devtools-menu");
  document.getElementById("devtools-toggle").addEventListener("click", () => {
    dtMenu.hidden = !dtMenu.hidden;
  });
  document.getElementById("btn-demo").addEventListener("click", () => tars.demo());

  function setBar(id, v) {
    document.getElementById(id).value = v;
    document.getElementById(`${id}-num`).value = v;
  }
  function resetBars() {
    for (let i = 0; i < 4; i++) setBar(`spin-${i}`, 0);
    setBar("lift-0", 0);
    setBar("lift-3", 0);
  }
  document.getElementById("btn-reset").addEventListener("click", () => {
    tars.stop();
    resetBars();
  });

  function bindBar(id, apply) {
    const bar = document.getElementById(id);
    const num = document.getElementById(`${id}-num`);
    const clamp = (v) => Math.max(+bar.min, Math.min(+bar.max, v || 0));
    bar.addEventListener("input", () => { num.value = bar.value; apply(+bar.value); });
    num.addEventListener("change", () => {
      const v = clamp(+num.value);
      num.value = v; bar.value = v;
      apply(v);
    });
  }
  for (let i = 0; i < 4; i++) bindBar(`spin-${i}`, (v) => tars.rotateColumn(i, v));
  for (const i of [0, 3]) bindBar(`lift-${i}`, (v) => tars.liftColumn(i, v));

  // free look: drag anywhere on the stage to orbit the robot
  const optFreelook = document.getElementById("opt-freelook");
  let viewAngle = 0, dragging = false, dragX = 0;
  optFreelook.addEventListener("change", () => {
    document.body.classList.toggle("freelook", optFreelook.checked);
    if (!optFreelook.checked) { viewAngle = 0; tars.setViewAngle(0); }
  });
  document.addEventListener("pointerdown", (e) => {
    if (!optFreelook.checked) return;
    if (e.target.closest("#controls, #chat-panel, #devtools, #status, #settings-modal, #editor-modal, #header")) return;
    dragging = true;
    dragX = e.clientX;
  });
  document.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    viewAngle += (e.clientX - dragX) * 0.4;
    dragX = e.clientX;
    tars.setViewAngle(viewAngle);
  });
  document.addEventListener("pointerup", () => (dragging = false));

  // robot UI feedback used by the function-call executor
  const robotUi = {
    onToolRun: () => {},                       // chips are rendered in the tool loop itself
    onColumnSpin: (col, deg) => setBar(`spin-${col}`, deg),
    onColumnLift: (col, px) => setBar(`lift-${col}`, px),
    onRobotReset: () => resetBars(),
  };

  // ---------------- chat turn with Gemini ----------------
  const MAX_TOOL_ROUNDS = 5;
  let inFlight = false;

  function mapError(err) {
    // A stored model can go stale ("no longer available to new users", renamed,
    // retired): drop it and reopen settings so a fresh one gets picked.
    if (err.status === "NOT_FOUND" || /no longer available|is not found/i.test(err.message)) {
      Store.remove("model");
      refreshStatus();
      setTimeout(openSettings, 400);
      return "That model is no longer available — opening settings so you can pick a new one (a good default is preselected).";
    }
    switch (err.status) {
      case "API_KEY_INVALID":
      case "PERMISSION_DENIED":
        setStatus("KEY INVALID", "offline");
        return "API key rejected — click the status pill to update it.";
      case "RESOURCE_EXHAUSTED":
        return "Rate limit / quota exhausted — wait a minute or switch to a flash model (status pill → model).";
      case "NETWORK":
        return "Network error — check your connection.";
      default:
        return `Gemini error: ${err.message}`;
    }
  }

  async function sendTurn(text) {
    if (inFlight) return;
    if (!Store.get("apiKey")) { openSettings(); return; }
    inFlight = true;
    sendBtn.disabled = true;
    addMsg("user", text);
    const pending = addMsg("assistant", "…", "pending");
    tars.talk(true);
    setStatus("THINKING…", "loading");

    const key = Store.get("apiKey");
    const model = Store.get("model");
    if (!model) {
      pending.remove();
      tars.talk(false);
      sendBtn.disabled = false;
      inFlight = false;
      refreshStatus();
      openSettings();
      return;
    }
    const persona = Store.get("personalize");
    const rag = Store.get("rag");
    const activeDecls = FunctionStore.activeDecls(); // only switched-ON functions reach the model
    const toolDecls = activeDecls.length ? activeDecls : null;

    const contents = [...history, { role: "user", parts: [{ text }] }];

    try {
      let finalText = null;
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const body = GeminiAPI.buildRequest({ contents, persona, rag, toolDecls });
        const resp = await GeminiAPI.generateContent(key, model, body);
        const out = GeminiAPI.extractParts(resp);

        if (out.blockReason) throw new GeminiError(`Request blocked (${out.blockReason}) — rephrase.`, "BLOCKED", 0);
        if (out.finishReason === "SAFETY") throw new GeminiError("Response withheld by the safety filter.", "SAFETY", 0);
        if (out.finishReason === "MALFORMED_FUNCTION_CALL") {
          throw new GeminiError("The model produced a malformed function call — try simpler declarations or another model.", "MALFORMED", 0);
        }

        if (!out.functionCalls.length) {
          finalText = out.text || "(empty response)";
          if (out.finishReason === "MAX_TOKENS") finalText += "\n…truncated";
          contents.push(out.modelContent || { role: "model", parts: [{ text: finalText }] });
          break;
        }

        if (round === MAX_TOOL_ROUNDS) {
          throw new GeminiError(`Tool loop exceeded ${MAX_TOOL_ROUNDS} rounds — aborted.`, "TOOL_LOOP", 0);
        }

        // Execute every functionCall in this candidate, then answer them all
        // in ONE follow-up content (parallel calls arrive in one response).
        contents.push(out.modelContent);
        const responseParts = [];
        for (const call of out.functionCalls) {
          const chip = addMsg("tool", `» ${call.name}(${JSON.stringify(call.args || {})})`);
          const result = await executeFunctionCall(tars, call, robotUi);
          if (!result.ok) chip.classList.add("failed");
          responseParts.push({ functionResponse: { name: call.name, response: { result } } });
        }
        contents.push({ role: "user", parts: responseParts });
      }

      pending.remove();
      renderRich(addMsg("assistant", ""), finalText);
      history = contents; // commit the whole turn, tool rounds included
    } catch (err) {
      pending.remove();
      addMsg("assistant", `⚠ ${err instanceof GeminiError ? mapError(err) : err.message}`, "error");
    } finally {
      tars.talk(false);
      sendBtn.disabled = false;
      inFlight = false;
      if (statusEl.textContent === "THINKING…") refreshStatus();
    }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    chatPanel.classList.add("open");
    sendTurn(text);
  });

  // ---------------- boot ----------------
  Editors.refreshButtons();
  refreshStatus();
  if (!Store.get("apiKey")) openSettings();
});
