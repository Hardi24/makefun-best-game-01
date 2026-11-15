// Keyboard + mouse state, kept apart from the game logic so the game can
// be driven by a real player, by tests, or by the screenshot autopilot
// through the same fields.
export function makeInput() {
  return {
    keys: new Set(),
    mouseX: 640,
    mouseY: 300,
    mouseDown: false,
    // Edge-triggered presses, consumed by the loop once per frame.
    pressed: new Set(),
    clicked: false,
  };
}

export function attachInput(input, canvas) {
  const keyName = (e) => e.key.toLowerCase();

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!e.repeat) input.pressed.add(k);
    input.keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouseDown = true;
      input.clicked = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function isDown(input, ...names) {
  return names.some((n) => input.keys.has(n));
}

// Read and clear the edge-triggered presses for this frame.
export function takePresses(input) {
  const out = input.pressed;
  input.pressed = new Set();
  return out;
}

export function takeClick(input) {
  const c = input.clicked;
  input.clicked = false;
  return c;
}
