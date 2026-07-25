// Robot function-calling: the example declarations users load into the
// FUNCTIONS editor, JSON validation, and the functionCall → robot executor.
"use strict";

const ROBOT_TOOL_DECLS = [
  {
    name: "walk",
    description: "Perform TARS's walking motion (in place). One call runs the full step cycle.",
    parameters: {
      type: "OBJECT",
      properties: {
        steps: { type: "INTEGER", description: "Number of steps to take, 1-5" },
      },
    },
  },
  {
    name: "rotateColumn",
    description: "Tumble one of the four body columns end-over-end like a wheel.",
    parameters: {
      type: "OBJECT",
      properties: {
        column: { type: "INTEGER", description: "Column index, 0-3 (left to right)" },
        degrees: { type: "NUMBER", description: "Rotation angle, -360 to 360" },
      },
      required: ["column", "degrees"],
    },
  },
  {
    name: "liftColumn",
    description: "Push an OUTER column (0 or 3) straight down and back. 0 returns it to rest.",
    parameters: {
      type: "OBJECT",
      properties: {
        column: { type: "INTEGER", description: "0 (left) or 3 (right)" },
        px: { type: "NUMBER", description: "Downward travel in pixels, 0-80" },
      },
      required: ["column", "px"],
    },
  },
  // No-argument functions omit `parameters` entirely (the API rejects empty OBJECT schemas).
  { name: "demo", description: "Show-off routine: body rises, all columns spin 360, settle." },
  { name: "stop", description: "Cancel all motion and return to the neutral pose." },
];

const FUNCTION_TEMPLATE = JSON.stringify({
  name: "myFunction",
  description: "What this function does - the model reads this to decide when to call it.",
  parameters: {
    type: "OBJECT",
    properties: {
      arg: { type: "STRING", description: "What this argument means" },
    },
  },
}, null, 2);

/** Validate ONE function declaration (the fn-editor's unit of editing). */
function parseSingleFunction(text) {
  let decl;
  try {
    decl = JSON.parse(text);
  } catch (e) {
    return { error: `Not valid JSON: ${e.message}` };
  }
  if (Array.isArray(decl) || typeof decl !== "object" || decl === null) {
    return { error: "Expected ONE function declaration object: { \"name\": ..., \"description\": ... }" };
  }
  if (typeof decl.name !== "string" || !decl.name.trim()) {
    return { error: "The declaration needs a string \"name\"." };
  }
  return { decl };
}

/** The saved FUNCTIONS list: [{enabled: bool, decl: {...}}, ...] */
const FunctionStore = (() => {
  function load() {
    const raw = Store.get("functions");
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && (!data.length || "enabled" in (data[0] || {}))) {
        return data.filter((it) => it && it.decl && typeof it.decl.name === "string");
      }
      // migrate the old format (a raw declarations array / tools object)
      const parsed = parseToolsJson(raw);
      if (parsed.decls) {
        const list = parsed.decls.map((decl) => ({ enabled: true, decl }));
        save(list);
        return list;
      }
    } catch { /* fall through */ }
    return [];
  }

  function save(list) {
    if (!list.length) Store.remove("functions");
    else Store.set("functions", JSON.stringify(list));
  }

  function activeDecls() {
    return load().filter((it) => it.enabled).map((it) => it.decl);
  }

  return { load, save, activeDecls };
})();

/** Parse + normalize the FUNCTIONS editor content into a declarations array.
 *  Accepts: a bare array, {"functionDeclarations":[...]}, or [{"functionDeclarations":[...]}]. */
function parseToolsJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { error: `Not valid JSON: ${e.message}` };
  }
  let decls;
  if (Array.isArray(data) && data.length && data[0].functionDeclarations) {
    decls = data.flatMap((t) => t.functionDeclarations || []);
  } else if (Array.isArray(data)) {
    decls = data;
  } else if (data && Array.isArray(data.functionDeclarations)) {
    decls = data.functionDeclarations;
  } else {
    return { error: "Expected an array of function declarations (or {\"functionDeclarations\": [...]})." };
  }
  if (!decls.length) return { error: "No function declarations found." };
  for (const d of decls) {
    if (!d || typeof d.name !== "string" || !d.name.trim()) {
      return { error: "Every declaration needs a string \"name\"." };
    }
  }
  return { decls };
}

/** Execute one Gemini functionCall against the robot. Never throws — unknown or
 *  failing calls return {ok:false} so the model can explain itself. */
async function executeFunctionCall(tars, call, ui) {
  const { name } = call;
  const args = call.args || {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
  ui?.onToolRun?.(name, args);
  try {
    switch (name) {
      case "walk": {
        const steps = clamp(args.steps ?? 1, 1, 5); // clamp: each step takes ~1.2s
        await tars.walk(steps);
        return { ok: true, detail: `walked ${steps} step(s)` };
      }
      case "rotateColumn": {
        const col = clamp(args.column, 0, 3);
        const deg = clamp(args.degrees, -360, 360);
        tars.rotateColumn(col, deg);
        ui?.onColumnSpin?.(col, deg);
        return { ok: true, detail: `column ${col} rotated to ${deg} degrees` };
      }
      case "liftColumn": {
        const col = Number(args.column);
        if (col !== 0 && col !== 3) {
          return { ok: false, error: "Only the outer columns (0 or 3) can be lifted." };
        }
        const px = clamp(args.px, 0, 80);
        tars.liftColumn(col, px);
        ui?.onColumnLift?.(col, px);
        return { ok: true, detail: `column ${col} shifted down ${px}px` };
      }
      case "demo":
        await tars.demo();
        return { ok: true, detail: "demo routine performed" };
      case "stop":
        tars.stop();
        ui?.onRobotReset?.();
        return { ok: true, detail: "robot reset to neutral" };
      default:
        return { ok: false, error: `Unknown function: ${name}` };
    }
  } catch (e) {
    return { ok: false, error: `Execution failed: ${e.message}` };
  }
}
