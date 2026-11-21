// input.js — keyboard + mouse handling for Shadow Courier.
// No dependencies. The game loop polls this object once per tick and then
// calls endFrame() so edge-triggered presses (pause, crouch, click) fire once.
const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const HANDLED_CODES = new Set([
  ...Object.keys(MOVE_KEYS),
  'ShiftLeft',
  'ShiftRight',
  'KeyC',
  'KeyP',
  'KeyR',
  'KeyM',
  'Escape',
  'Space',
  'Enter',
]);

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, down: false };

  function onKeyDown(event) {
    if (!HANDLED_CODES.has(event.code)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    mouse.x = (event.clientX - rect.left) * scaleX;
    mouse.y = (event.clientY - rect.top) * scaleY;
  }

  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  function attach() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  }

  attach();

  return {
    keys,
    mouse,
    attach,
    detach,
    down(code) {
      return keys.has(code);
    },
    // True once for the tick in which the key went down.
    wasPressed(code) {
      return pressed.has(code);
    },
    crouchPressed() {
      return pressed.has('ShiftLeft') || pressed.has('ShiftRight') || pressed.has('KeyC');
    },
    // Held-to-sneak: either Shift key is down (the page's control scheme).
    sneakHeld() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    // Normalised WASD / arrow movement vector.
    axis() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was;
    },
    // Call once at the end of each tick so edges do not repeat.
    endFrame() {
      pressed.clear();
    },
  };
}
