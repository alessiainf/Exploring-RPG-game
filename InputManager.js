// InputManager.js
export const keys = { fPressed: false };

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') keys.fPressed = true;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyF') keys.fPressed = false;
});
