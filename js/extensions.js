// Extension editors. RAG and PERSONALIZE share one plain-text modal; FUNCTIONS
// has its own manager: a list of declarations, each with an on/off switch and
// a delete button, edited one at a time in a code-colored JSON editor.
// Whatever is saved here reaches the model ONLY while non-empty / switched on.
"use strict";

/* ---------------- tiny JSON syntax highlighter ---------------- */
function highlightJson(src) {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/g,
    (m, str, colon, kw) => {
      if (str) {
        return colon
          ? `<span class="tok-key">${str}</span>${colon}`
          : `<span class="tok-str">${str}</span>`;
      }
      if (kw) return `<span class="tok-kw">${kw}</span>`;
      return `<span class="tok-num">${m}</span>`;
    }
  );
}

/* Python-ish highlighter for the built-in function reference. */
function highlightPython(src) {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("""[\s\S]*?"""|"(?:\\.|[^"\\])*")|(#.*)|\b(def|for|in|if|else|return|range|not|and|or|None|True|False)\b|(?<=def\s)(\w+)|-?\b\d+\.?\d*\b/g,
    (m, str, com, kw, fname) => {
      if (str) return `<span class="tok-str">${str}</span>`;
      if (com) return `<span class="tok-com">${com}</span>`;
      if (kw) return `<span class="tok-kw">${kw}</span>`;
      if (fname) return `<span class="tok-def">${fname}</span>`;
      return `<span class="tok-num">${m}</span>`;
    }
  );
}

function initCodeEditor(textarea, pre) {
  const code = pre.querySelector("code");
  function render() {
    // trailing newline keeps the overlay height in sync while typing at the end
    code.innerHTML = highlightJson(textarea.value) + "\n";
  }
  textarea.addEventListener("input", render);
  textarea.addEventListener("scroll", () => {
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
  });
  return { render };
}

/* ---------------- generic text editors: RAG + PERSONALIZE ---------------- */
const EXTENSIONS = {
  rag: {
    key: "rag",
    button: "btn-rag",
    titleKey: "rag_title",
    hintKey: "rag_hint",
    placeholder: "MISSION BRIEF:\nThe station's docking code is CASE-3-3-1.\nDr. Brand's favourite equation is the gravity equation.\n\n(paste anything - manuals, lore, your own docs)",
    example:
      "MISSION BRIEF\n=============\nShip: Endurance. Crew: Cooper, Brand, Doyle, Romilly.\n" +
      "Docking code: CASE-3-3-1.\nWormhole located near Saturn, 14 months out.\n" +
      "Plan A: gravity equation. Plan B: population bomb.",
    maxWarn: 200_000,
  },
  personalize: {
    key: "personalize",
    button: "btn-personalize",
    titleKey: "persona_title",
    hintKey: "persona_hint",
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
    const fnBtn = document.getElementById("btn-functions");
    const n = FunctionStore.activeDecls().length;
    fnBtn.classList.toggle("active", n > 0);
    fnBtn.dataset.count = n; // shown as a little counter badge
  }

  function updateCount() {
    const n = elText.value.length;
    let label = `${n.toLocaleString()} ${t("em_chars")}`;
    if (current?.maxWarn && n > current.maxWarn) label += " " + t("em_large");
    elCount.textContent = label;
  }

  function open(id) {
    current = EXTENSIONS[id];
    clearArmed = false;
    elTitle.textContent = t(current.titleKey);
    elHint.textContent = t(current.hintKey);
    elText.value = Store.get(current.key);
    elText.placeholder = current.placeholder;
    elError.hidden = true;
    elSaved.hidden = true;
    btnClear.textContent = t("em_clear");
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
      btnClear.textContent = t("em_sure");
      return;
    }
    elText.value = "";
    Store.remove(current.key);
    refreshButtons();
    clearArmed = false;
    btnClear.textContent = t("em_clear");
    updateCount();
  });

  btnCancel.addEventListener("click", close);
  modal.addEventListener("pointerdown", (e) => { if (e.target === modal) close(); });
  elText.addEventListener("input", updateCount);

  for (const [id, ext] of Object.entries(EXTENSIONS)) {
    document.getElementById(ext.button).addEventListener("click", () => open(id));
  }

  /* ---------------- FUNCTIONS manager ---------------- */
  const fnModal = document.getElementById("fn-modal");
  const fnListView = document.getElementById("fn-list-view");
  const fnEditView = document.getElementById("fn-edit-view");
  const fnRefView = document.getElementById("fn-ref-view");
  const fnList = document.getElementById("fn-list");
  const fnEmpty = document.getElementById("fn-empty");
  const fnText = document.getElementById("fn-text");
  const fnHl = document.getElementById("fn-hl");
  const fnError = document.getElementById("fn-error");
  const fnEditor = initCodeEditor(fnText, fnHl);
  let editIndex = -1; // -1 = adding a new function

  // the built-in implementations, shown Python-style as a learning reference:
  // one markdown-like page (single scroll), heading + copy button per block
  const builtins = document.getElementById("fn-builtins-list");
  for (const doc of BUILTIN_PYTHON_DOCS) {
    const section = document.createElement("section");
    section.className = "fn-doc";

    const head = document.createElement("div");
    head.className = "fn-doc-head";
    const title = document.createElement("h3");
    title.textContent = doc.name;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-btn";
    copy.textContent = t("fn_copy");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(doc.code);
        copy.textContent = t("fn_copied");
      } catch {
        copy.textContent = "✗";
      }
      setTimeout(() => (copy.textContent = t("fn_copy")), 1200);
    });
    head.append(title, copy);

    const pre = document.createElement("pre");
    pre.className = "py-code";
    pre.innerHTML = highlightPython(doc.code);

    section.append(head, pre);
    builtins.appendChild(section);
  }

  function renderList() {
    const list = FunctionStore.load();
    fnList.innerHTML = "";
    fnEmpty.hidden = list.length > 0;
    list.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "fn-row" + (item.enabled ? "" : " off");

      const toggle = document.createElement("label");
      toggle.className = "fn-switch";
      toggle.title = item.enabled ? t("fn_active_tip") : t("fn_inactive_tip");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.enabled;
      cb.addEventListener("change", () => {
        list[i].enabled = cb.checked;
        FunctionStore.save(list);
        renderList();
        refreshButtons();
      });
      toggle.appendChild(cb);
      toggle.appendChild(document.createElement("i"));

      const info = document.createElement("button");
      info.type = "button";
      info.className = "fn-info";
      info.title = "Edit";
      info.innerHTML = `<b>${item.decl.name}</b><span>${item.decl.description || ""}</span>`;
      info.addEventListener("click", () => openEdit(i));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "fn-del";
      del.textContent = "✕";
      del.title = "Remove";
      del.addEventListener("click", () => {
        list.splice(i, 1);
        FunctionStore.save(list);
        renderList();
        refreshButtons();
      });

      row.append(toggle, info, del);
      fnList.appendChild(row);
    });
  }

  function showView(view) {
    fnListView.hidden = view !== "list";
    fnEditView.hidden = view !== "edit";
    fnRefView.hidden = view !== "ref";
  }

  function openEdit(index) {
    editIndex = index;
    const list = FunctionStore.load();
    fnText.value = index >= 0 ? JSON.stringify(list[index].decl, null, 2) : FUNCTION_TEMPLATE;
    fnEditor.render();
    fnError.hidden = true;
    showView("edit");
    fnText.focus();
  }

  function backToList() {
    showView("list");
    renderList();
  }

  document.getElementById("btn-functions").addEventListener("click", () => {
    renderList();
    showView("list");
    fnModal.hidden = false;
  });
  document.getElementById("fn-view-builtins").addEventListener("click", () => showView("ref"));
  document.getElementById("fn-ref-back").addEventListener("click", backToList);
  document.getElementById("fn-add").addEventListener("click", () => openEdit(-1));
  document.getElementById("fn-example").addEventListener("click", () => {
    const list = FunctionStore.load();
    const have = new Set(list.map((it) => it.decl.name));
    for (const decl of ROBOT_TOOL_DECLS) {
      if (!have.has(decl.name)) list.push({ enabled: true, decl });
    }
    FunctionStore.save(list);
    renderList();
    refreshButtons();
  });
  document.getElementById("fn-save").addEventListener("click", () => {
    const result = parseSingleFunction(fnText.value.trim());
    if (result.error) {
      fnError.textContent = result.error;
      fnError.hidden = false;
      return;
    }
    const list = FunctionStore.load();
    if (editIndex >= 0) list[editIndex] = { enabled: list[editIndex].enabled, decl: result.decl };
    else list.push({ enabled: true, decl: result.decl });
    FunctionStore.save(list);
    refreshButtons();
    backToList();
  });
  document.getElementById("fn-back").addEventListener("click", backToList);
  document.getElementById("fn-close").addEventListener("click", () => (fnModal.hidden = true));
  fnModal.addEventListener("pointerdown", (e) => { if (e.target === fnModal) fnModal.hidden = true; });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal.hidden) close();
    else if (!fnModal.hidden) {
      if (!fnEditView.hidden || !fnRefView.hidden) backToList();
      else fnModal.hidden = true;
    }
  });

  return { refreshButtons };
})();
