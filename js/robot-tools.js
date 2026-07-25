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
    name: "spinColumns",
    description:
      "Tumble one or MORE body columns end-over-end like wheels, all at once. " +
      "Columns are numbered 0-3 left to right (C1-C4). Example: columns [1,2] spins the middle pair together.",
    parameters: {
      type: "OBJECT",
      properties: {
        columns: {
          type: "ARRAY",
          items: { type: "INTEGER" },
          description: "One or more column indexes, 0-3. e.g. [2] or [1,2] or [0,1,2,3]",
        },
        degrees: { type: "NUMBER", description: "Rotation angle applied to every listed column, -360 to 360" },
      },
      required: ["columns", "degrees"],
    },
  },
  {
    name: "liftOuterColumns",
    description:
      "Press the OUTER columns straight down and back. Accepts one side or both at once: " +
      "\"L\" is the left outer column, \"R\" the right. px 0 returns them to rest.",
    parameters: {
      type: "OBJECT",
      properties: {
        sides: {
          type: "ARRAY",
          items: { type: "STRING", enum: ["L", "R"] },
          description: "Which outer columns to move: [\"L\"], [\"R\"] or [\"L\",\"R\"]",
        },
        px: { type: "NUMBER", description: "Downward travel in pixels, 0-80 (0 = back to rest)" },
      },
      required: ["sides", "px"],
    },
  },
  // No-argument functions omit `parameters` entirely (the API rejects empty OBJECT schemas).
  { name: "demo", description: "Show-off routine: body rises, all columns spin 360, settle." },
  { name: "stop", description: "Cancel all motion and return to the neutral pose." },
];

/* Python-style reference of the built-in implementations, shown (syntax-colored)
   in the FUNCTIONS modal so users can see exactly what exists and copy the
   pattern when declaring their own tools. */
const BUILTIN_PYTHON_DOCS = [
  {
    name: "walk",
    code:
`def walk(steps=1):
    """Perform TARS's walking motion, in place.
    steps: 1-5 (each step takes ~1.2s)"""
    for _ in range(steps):
        robot.press_outer_columns_down()   # body rises
        robot.swing_middle_columns()       # the "step"
        robot.settle()`,
  },
  {
    name: "spinColumns",
    code:
`def spinColumns(columns, degrees):
    """Tumble columns end-over-end like wheels - several at once.
    columns: list of 0-3, e.g. [1, 2] spins C2 and C3 together
    degrees: -360 to 360 (same angle for every listed column)"""
    for c in columns:
        robot.spin_column(c, degrees)`,
  },
  {
    name: "liftOuterColumns",
    code:
`def liftOuterColumns(sides, px):
    """Press the outer columns down and back.
    sides: ["L"], ["R"] or ["L", "R"]  (left / right outer column)
    px: 0-80 downward travel, 0 returns to rest"""
    for side in sides:
        column = 0 if side == "L" else 3
        robot.lift_column(column, px)`,
  },
  {
    name: "demo",
    code:
`def demo():
    """Show-off routine: body rises, every column spins a full 360, settle."""
    robot.rise()
    robot.spin_all_columns(360)
    robot.settle()`,
  },
  {
    name: "stop",
    code:
`def stop():
    """Cancel all motion and return to the neutral pose."""
    robot.reset()`,
  },
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
        return { ok: true, detail: `walked ${steps} step(s) in place` };
      }
      case "spinColumns": {
        const cols = [...new Set((Array.isArray(args.columns) ? args.columns : [args.columns])
          .map((c) => clamp(c, 0, 3)))];
        if (!cols.length) return { ok: false, error: "columns must list at least one index 0-3." };
        const deg = clamp(args.degrees, -360, 360);
        for (const c of cols) {
          tars.rotateColumn(c, deg);
          ui?.onColumnSpin?.(c, deg);
        }
        return { ok: true, detail: `column(s) ${cols.join(", ")} rotated to ${deg} degrees` };
      }
      case "liftOuterColumns": {
        const sides = (Array.isArray(args.sides) ? args.sides : [args.sides])
          .map((s) => String(s).toUpperCase());
        const cols = [...new Set(sides.map((s) => (s === "L" || s === "0" ? 0 : s === "R" || s === "3" ? 3 : -1)))];
        if (cols.includes(-1) || !cols.length) {
          return { ok: false, error: 'sides must be one or both of "L" and "R".' };
        }
        const px = clamp(args.px, 0, 80);
        for (const c of cols) {
          tars.liftColumn(c, px);
          ui?.onColumnLift?.(c, px);
        }
        return { ok: true, detail: `outer column(s) ${cols.map((c) => (c === 0 ? "L" : "R")).join(", ")} shifted down ${px}px` };
      }
      // aliases: older saved declarations keep working
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
