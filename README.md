# TARS — Gemini Sandbox

A pure static page (HTML + CSS + JS, no build step) featuring an animated TARS
robot from *Interstellar* and a chat powered by the **Google Gemini API** —
called directly from your browser with your own API key.

**Live site:** enable GitHub Pages on this branch (Settings → Pages → Deploy
from a branch → `static-site` / root) → `https://sgf-14.github.io/TARS-Gemini-Page/`

## Using it

1. Open the page — it asks for a Gemini API key
   (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
   The key is stored only in your browser and sent only to Google's API.
2. Pick a model (the list is fetched live from the API), then chat away.
3. The three buttons at the bottom are live extension points — whatever you
   write is saved in your browser and the AI sees it **only while non-empty**:

| button | what it does |
|---|---|
| **RAG** | paste documents/facts — injected as reference context, the AI answers from them |
| **FUNCTIONS** | Gemini function declarations (JSON) — the AI can call them to **drive the robot** (walk, tumble columns like wheels, press outer columns down). LOAD EXAMPLE gives the full robot API |
| **PERSONA** | a system prompt — personality, rules, style (try the TARS example) |

Try: save the FUNCTIONS example, then ask *“take two steps forward and
introduce yourself.”*

**DEV TOOLS** (top-left) has manual robot controls: per-column spin sliders
(±360°, wheel direction), outer-column lifts, free-look drag, a demo routine.

## Run locally

Any static server works:

```
python -m http.server 8080
```

then open http://localhost:8080. (Opening `index.html` directly mostly works
too, but a server is more faithful to GitHub Pages.)

## Structure

```
index.html      page + modals
css/app.css     UI design      css/tars.css    robot 3D geometry
js/tars-robot.js  robot module (walk / rotateColumn / liftColumn / demo / stop)
js/gemini.js      Gemini REST client (models list, generateContent, errors)
js/robot-tools.js function-calling: example declarations, validation, executor
js/extensions.js  the three editor modals (localStorage-backed)
js/storage.js     localStorage keys      js/wallpaper.js  looping background
```
