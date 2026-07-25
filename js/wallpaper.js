// Seamless looping wallpaper: two stacked <video> elements playing the same
// 15 s clip; ~1 s before the end the standby video starts from 0 and the two
// crossfade (opacity transition in css), so the loop never dips to black.
"use strict";

function initWallpaper() {
  const vids = [document.getElementById("wp-a"), document.getElementById("wp-b")];
  let active = 0;
  let fading = false;

  vids[0].play().catch(() => {});

  setInterval(() => {
    const v = vids[active];
    if (fading || !v.duration) return;
    if (v.duration - v.currentTime < 1.0) {
      fading = true;
      const next = vids[1 - active];
      next.currentTime = 0;
      next.play().catch(() => {});
      next.classList.add("visible");
      v.classList.remove("visible");
      setTimeout(() => {
        v.pause();
        active = 1 - active;
        fading = false;
      }, 1100); // slightly longer than the 1 s css opacity transition
    }
  }, 200);
}
