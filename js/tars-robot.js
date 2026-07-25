// TARS robot: builds the 4-column rig and exposes a movement API.
//
//   const tars = createTars(rootEl);
//   tars.walk(2); tars.rotateColumn(1, 180); tars.talk(true); tars.stop();
//
// ← function-calling hook: expose these methods as LLM tools later.
//   (backend tools_service returns a robot command → app.js routes it to this API)

"use strict";

function createTars(root) {
  const NUM_COLS = 4;
  const OUTER = [0, 3];
  const MIDDLE = [1, 2];
  const STEP_PX = 46;      // ground covered per step
  const LIFT_PX = 16;      // outer-column press / body raise
  const SWING_DEG = -22;   // middle-column forward swing

  // ---------- build DOM ----------
  root.innerHTML = "";
  const shadow = el("div", "tars-shadow");
  const bob = el("div", "tars-bob");
  const view = el("div", "tars-view"); // free-look orbit (drag to rotate)
  const body = el("div", "tars-body");
  const slots = [];
  const rotors = [];

  const spins = [];
  for (let i = 0; i < NUM_COLS; i++) {
    const slot = el("div", "col-slot");
    const rotor = el("div", "col-rotor"); // walk swing (pivot at top)
    const spin = el("div", "col-spin");   // wheel spin (pivot at center)
    for (const f of ["front", "back", "side-l", "side-r", "top", "bottom"]) {
      spin.appendChild(el("div", `face ${f}`));
    }
    decorate(spin.querySelector(".face.front"), i);
    rotor.appendChild(spin);
    slot.appendChild(rotor);
    body.appendChild(slot);
    slots.push(slot);
    rotors.push(rotor);
    spins.push(spin);
  }
  view.appendChild(body);
  bob.appendChild(view);
  root.appendChild(shadow);
  root.appendChild(bob);

  // ---------- state ----------
  const spinZ = [0, 0, 0, 0];   // per-column wheel spin (end-over-end, like rolling)
  const swingX = [0, 0, 0, 0];  // per-column walk swing
  const liftY = [0, 0, 0, 0];   // outer-column downward shift (0..SEG_PX)
  const SEG_PX = 80;            // one panel segment - max downward travel
  let bodyX = 0;
  let bodyY = 0;
  let walking = false;

  function applyRotor(i) {
    rotors[i].style.transform = `rotateX(${swingX[i]}deg)`;
    // Wheel tumble: each column flips FORWARD/BACKWARD around its center
    // (top tips toward the viewer for positive angles). It stays in its own
    // lane, so it never sweeps into the neighboring columns.
    spins[i].style.transform = `rotateX(${-spinZ[i]}deg)`;
  }
  function applyBody(durMs) {
    if (durMs != null) body.style.transitionDuration = `${durMs}ms`;
    body.style.transform = `translateX(${bodyX}px) translateY(${bodyY}px)`;
    shadow.style.transform = `translateX(calc(-50% + ${bodyX}px))`;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- public API ----------
  const api = {
    /** Default resting state (subtle bob is CSS-driven and always on). */
    idle() {
      bob.classList.remove("talking");
    },

    /** Faster bob + livelier screens while TTS audio is playing. */
    talk(on) {
      bob.classList.toggle("talking", !!on);
    },

    /** Tumble one column like a wheel: forward/backward around its center,
     *  end-over-end. i: 0..3, deg: absolute angle, full 360° capable. */
    rotateColumn(i, deg) {
      if (i < 0 || i >= NUM_COLS) return;
      spinZ[i] = deg;
      applyRotor(i);
    },

    /** Shift an OUTER column straight down by px (0..80 - one panel segment)
     *  and back to its rest position. Never above rest. */
    liftColumn(i, px) {
      if (!OUTER.includes(i)) return;
      liftY[i] = Math.max(0, Math.min(SEG_PX, px));
      slots[i].style.transform = `translateY(${liftY[i]}px)`;
    },

    /** The movie walk: outer columns press down (raising the body), the middle
     *  pair swings forward, then the outer pair returns. One call = one step. */
    async walk(steps = 1) {
      if (walking) return;
      walking = true;
      for (let s = 0; s < steps; s++) {
        // 1 — outer columns press down, body rises
        OUTER.forEach((i) => (slots[i].style.transform = `translateY(${LIFT_PX}px)`));
        bodyY = -LIFT_PX;
        applyBody(220);
        await wait(230);

        // 2 — middle columns swing forward, body advances
        MIDDLE.forEach((i) => { swingX[i] = SWING_DEG; applyRotor(i); });
        bodyX += STEP_PX;
        applyBody(550);
        await wait(560);

        // 3 — everything settles back
        OUTER.forEach((i) => (slots[i].style.transform = "translateY(0)"));
        MIDDLE.forEach((i) => { swingX[i] = 0; applyRotor(i); });
        bodyY = 0;
        applyBody(320);
        await wait(340);
      }
      walking = false;
    },

    /** Orbit the whole robot (free-look camera). deg: absolute view angle. */
    setViewAngle(deg) {
      view.style.transform = `rotateY(${deg}deg)`;
    },

    /** Manual demo: body rises a little, every column spins a full 360°, settle. */
    async demo() {
      if (walking) return;
      walking = true;
      bodyY = -16;
      applyBody(300);
      await wait(320);

      for (let i = 0; i < NUM_COLS; i++) {
        spinZ[i] += 360;
        spins[i].style.transitionDuration = "1400ms";
        applyRotor(i);
      }
      await wait(1500);
      spins.forEach((s) => (s.style.transitionDuration = ""));

      bodyY = 8;               // dip down a little...
      applyBody(250);
      await wait(270);
      bodyY = 0;               // ...and settle
      applyBody(300);
      await wait(320);
      walking = false;
    },

    /** Cancel motion and return to neutral. */
    stop() {
      walking = false;
      OUTER.forEach((i) => (slots[i].style.transform = "translateY(0)"));
      for (let i = 0; i < NUM_COLS; i++) { swingX[i] = 0; spinZ[i] = 0; liftY[i] = 0; applyRotor(i); }
      bodyX = 0; bodyY = 0;
      applyBody(400);
      api.idle();
    },
  };

  startScreenTicker(root);
  return api;

  // ---------- helpers ----------
  function el(tag, cls) {
    const e = document.createElement(tag);
    e.className = cls;
    return e;
  }

  function decorate(front, i) {
    // Outer columns (0 and 3) are plain brushed metal - no screens/insets.
    if (i === 0) {
      const label = el("div", "detail tars-label");
      label.textContent = "TARS";
      front.appendChild(label);
    } else if (i === 1 || i === 2) {
      const scr = el("div", "detail screen");
      front.appendChild(scr);
      front.appendChild(el("div", "detail screen secondary"));
      front.appendChild(insetAt("58%", "22%"));
    }
  }

  function insetAt(top, height) {
    const d = el("div", "detail inset");
    d.style.top = top;
    d.style.height = height;
    return d;
  }
}

/* Fake live telemetry on the green screens. */
function startScreenTicker(root) {
  const LINES = [
    "SYS  NOMINAL", "O2   20.9 %", "PWR  98.2 %", "CPU  31 %",
    "NAV  LOCKED", "COM  ONLINE", "HUM  75 %", "HON  90 %",
    "TRQ  0.42 Nm", "TMP  21.4 C", "LAT  38.91 N", "LNG  77.04 W",
  ];
  const rnd = () => LINES[Math.floor(Math.random() * LINES.length)];
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0").toUpperCase();

  function fill() {
    for (const scr of root.querySelectorAll(".screen:not(.secondary)")) {
      scr.textContent = Array.from({ length: 9 }, () => ` ${rnd()}`).join("\n");
    }
    for (const scr of root.querySelectorAll(".screen.secondary")) {
      scr.textContent = ` 0x${hex()} 0x${hex()}\n 0x${hex()} 0x${hex()}\n 0x${hex()} 0x${hex()}`;
    }
  }
  fill();
  setInterval(fill, 1600);
}
