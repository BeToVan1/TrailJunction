type Point = { x: number; y: number };
const visiblePages = ":scope > .journal-photo-card:not([hidden])";
export type PageCorner = "top" | "bottom";

function sheetCopy(page: HTMLElement | undefined, className: string) {
  const sheet = document.createElement("div");
  sheet.className = className;
  if (page) {
    const copy = page.cloneNode(true) as HTMLElement;
    copy.hidden = false;
    copy.removeAttribute("aria-label");
    copy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    sheet.append(copy);
  }
  return sheet;
}

// The fold lies halfway between the original corner and the pulled corner.
// Clip the paper on either side of that line and reflect the folded half.
function clipSheet(corners: Point[], distance: (point: Point) => number, side: number) {
  const polygon: Point[] = [];
  for (let index = 0; index < corners.length; index++) {
    const a = corners[index];
    const b = corners[(index + 1) % corners.length];
    const da = side * distance(a);
    const db = side * distance(b);
    if (da >= 0) polygon.push(a);
    if ((da < 0) !== (db < 0)) {
      const ratio = da / (da - db);
      polygon.push({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
    }
  }
  return polygon.length > 2
    ? `polygon(${polygon.map(({ x, y }) => `${x}px ${y}px`).join(", ")})`
    : "polygon(0 0, 0 0, 0 0)";
}

export function capturePageTurn(book: HTMLElement, forward: boolean, spread: boolean) {
  const leaves = book.querySelectorAll<HTMLElement>(visiblePages);
  const source = leaves[spread && forward ? 1 : 0];
  const first = leaves[0];
  if (!first) return;

  const { width, height } = first.getBoundingClientRect();
  if (!width || !height) return;
  const right = spread && forward;
  const front = sheetCopy(source, "journal-turn-face");
  const underneath = spread
    ? sheetCopy(leaves[right ? 0 : 1], "journal-turn-still")
    : undefined;
  return { width, height, right, front, underneath, forward, spread };
}

function mountPageTurn(
  book: HTMLElement,
  turn: NonNullable<ReturnType<typeof capturePageTurn>>,
  next: readonly HTMLElement[],
  corner: PageCorner,
  previewTarget: boolean,
) {
  const { width, height, right, front, underneath, forward, spread } = turn;
  const reverse = sheetCopy(spread ? next[right ? 0 : 1] : undefined, "journal-turn-reverse");
  const fold = document.createElement("div");
  fold.className = "journal-turn-fold";
  const shade = document.createElement("span");
  shade.className = "journal-turn-shade";
  fold.append(reverse, shade);
  const cast = document.createElement("div");
  cast.className = "journal-turn-cast";
  cast.append(fold);

  const layer = document.createElement("div");
  layer.className = "journal-turn-layer";
  layer.inert = true;
  layer.setAttribute("aria-hidden", "true");
  layer.style.setProperty("--leaf-width", `${width}px`);
  layer.style.setProperty("--leaf-height", `${height}px`);
  front.style.left = fold.style.left = right ? `${width}px` : "0";
  if (previewTarget) {
    const revealed = sheetCopy(next[right ? 1 : 0], "journal-turn-still");
    revealed.style.left = front.style.left;
    layer.append(revealed);
  }
  if (underneath) {
    underneath.style.left = right ? "0" : `${width}px`;
    layer.append(underneath);
  }
  layer.append(front, cast);
  book.append(layer);

  const corners = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const origin = { x: forward ? width : 0, y: corner === "bottom" ? height : 0 };
  const direction = forward ? -1 : 1;
  const foldDepth = Math.min(height * .30, width * .45);
  let frame = 0;
  let pulled = origin;

  function draw(point: Point) {
    pulled = point;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const length = Math.hypot(dx, dy);
    const nx = dx / length;
    const ny = dy / length;
    const offset = nx * (origin.x + point.x) / 2 + ny * (origin.y + point.y) / 2;
    const distance = ({ x, y }: Point) => nx * x + ny * y - offset;
    front.style.clipPath = clipSheet(corners, distance, 1);
    fold.style.clipPath = clipSheet(corners, distance, -1);
    fold.style.transform = `matrix(${1 - 2 * nx * nx}, ${-2 * nx * ny}, ${-2 * nx * ny}, ${1 - 2 * ny * ny}, ${2 * offset * nx}, ${2 * offset * ny})`;
    const peak = Math.sin(Math.PI * Math.min(1, length / (2 * width)));
    cast.style.filter = peak > .001
      ? `drop-shadow(${direction * 6 * peak}px 3px ${8 * peak}px rgb(29 24 15 / ${.27 * peak}))`
      : "none";
    shade.style.opacity = String(.8 * peak);
  }
  shade.style.background = `linear-gradient(${forward ? 100 : 260}deg, #30281c44, transparent 36%, #fff9 72%, #342e242c)`;

  function move(dx: number, dy: number) {
    const distance = Math.max(1, Math.min(2 * width, direction * dx));
    const lift = Math.min(height * .75, Math.max(-height * .35, (corner === "bottom" ? -1 : 1) * dy));
    draw({ x: origin.x + direction * distance, y: origin.y + (corner === "bottom" ? -lift : lift) });
  }

  function animate(duration: number, drawFrame: (progress: number) => void, done: () => void) {
    cancelAnimationFrame(frame);
    const started = performance.now();
    function step(now: number) {
      const progress = Math.min(1, (now - started) / duration);
      drawFrame(progress);
      if (progress < 1) frame = requestAnimationFrame(step);
      else done();
    }
    frame = requestAnimationFrame(step);
  }

  function dispose() {
    cancelAnimationFrame(frame);
    layer.remove();
  }

  move(0, 0);
  return {
    move,
    dispose,
    shouldTurn: () => direction * (pulled.x - origin.x) >= width * .55,
    settle(complete: boolean, done: () => void) {
      const from = pulled;
      const target = origin.x + direction * (complete ? 2 * width : 1);
      animate(complete ? 280 : 230, (progress) => {
        const t = 1 - (1 - progress) ** 3;
        draw({ x: from.x + (target - from.x) * t, y: from.y + (origin.y - from.y) * t });
      }, done);
    },
    autoTurn() {
      animate(520, (progress) => {
        const t = progress < .5 ? 2 * progress ** 2 : 1 - 2 * (1 - progress) ** 2;
        move(direction * (1 + (2 * width - 1) * t), progress === 1 ? 0 : -foldDepth * Math.sin(Math.PI * t));
      }, dispose);
    },
  };
}

export function startPageDrag(book: HTMLElement, forward: boolean, spread: boolean, target: number, corner: PageCorner) {
  const turn = capturePageTurn(book, forward, spread);
  if (!turn) return;
  const pages = [...book.querySelectorAll<HTMLElement>(":scope > .journal-photo-card")];
  const next = pages.slice(target, target + (spread ? 2 : 1));
  return mountPageTurn(book, turn, next, corner, true);
}

export function playPageTurn(book: HTMLElement, turn: NonNullable<ReturnType<typeof capturePageTurn>>) {
  const next = [...book.querySelectorAll<HTMLElement>(visiblePages)];
  const bounds = next[0]?.getBoundingClientRect();
  if (bounds?.width !== turn.width || bounds.height !== turn.height) return;
  const layer = mountPageTurn(book, turn, next, "bottom", false);
  layer.autoTurn();
  return layer.dispose;
}
