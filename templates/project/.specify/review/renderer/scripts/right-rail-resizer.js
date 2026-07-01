/* Display-only right rail width preference. It is not review authorization data. */
(function initializeRightRailResizer() {
  const STORAGE_KEY = "speccompass-review:right-rail-width";
  const MIN_WIDTH = 320;
  const MAX_WIDTH = 560;
  const KEYBOARD_STEP = 16;

  const workspace = document.querySelector(".review-workspace");
  const handle = document.getElementById("right-rail-resizer");
  if (!workspace || !handle) return;

  function clampWidth(width) {
    const numericWidth = Number.parseFloat(width);
    if (!Number.isFinite(numericWidth)) return null;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(numericWidth)));
  }

  function widthFromPointer(clientX) {
    const workspaceRect = workspace.getBoundingClientRect();
    return clampWidth(workspaceRect.right - clientX);
  }

  function applyWidth(width) {
    const nextWidth = clampWidth(width);
    if (nextWidth === null) return null;
    workspace.style.setProperty("--right-rail-width", `${nextWidth}px`);
    handle.setAttribute("aria-valuenow", String(nextWidth));
    return nextWidth;
  }

  function saveWidth(width) {
    const nextWidth = clampWidth(width);
    if (nextWidth === null) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(nextWidth));
    } catch {
      // Width is only a display preference; failing to store it must not block review.
    }
  }

  function loadWidthPreference() {
    try {
      const savedWidth = clampWidth(localStorage.getItem(STORAGE_KEY));
      if (savedWidth !== null) applyWidth(savedWidth);
    } catch {
      // Ignore display-preference storage failures.
    }
  }

  function endResize(pointerId, finalWidth) {
    document.body.classList.remove("is-resizing-right-rail");
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }
    saveWidth(finalWidth);
  }

  handle.setAttribute("aria-valuemin", String(MIN_WIDTH));
  handle.setAttribute("aria-valuemax", String(MAX_WIDTH));
  loadWidthPreference();

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-right-rail");
    let currentWidth = widthFromPointer(event.clientX) || MIN_WIDTH;
    applyWidth(currentWidth);

    const onPointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      currentWidth = widthFromPointer(moveEvent.clientX) || currentWidth;
      applyWidth(currentWidth);
    };

    const onPointerUp = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      endResize(event.pointerId, currentWidth);
    };

    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
  });

  handle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentWidth = clampWidth(getComputedStyle(workspace).getPropertyValue("--right-rail-width")) || MIN_WIDTH;
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    const nextWidth = applyWidth(currentWidth + direction * KEYBOARD_STEP);
    saveWidth(nextWidth);
  });
})();
