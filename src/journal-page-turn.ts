type Point = { x: number; y: number };
const visiblePages = ":scope > .journal-photo-card:not([hidden])";

function sheetCopy(page: HTMLElement | undefined, className: string) {
  const sheet = document.createElement("div");
  sheet.className = className;
  if (page) {
    const copy = page.cloneNode(true) as HTMLElement;
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

  const width = first.offsetWidth;
  const height = first.offsetHeight;
  if (!width || !height) return;
  const right = spread && forward;
  const front = sheetCopy(source, "journal-turn-face");
  const underneath = spread
    ? sheetCopy(leaves[right ? 0 : 1], "journal-turn-still")
    : undefined;
  return { width, height, right, front, underneath, forward, spread };
}

export function playPageTurn(book: HTMLElement, turn: NonNullable<ReturnType<typeof capturePageTurn>>) {
  const { width, height, right, front, underneath, forward, spread } = turn;
  const next = book.querySelectorAll<HTMLElement>(visiblePages);
  if (next[0]?.offsetWidth !== width || next[0]?.offsetHeight !== height) return;
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
  if (underneath) {
    underneath.style.left = right ? "0" : `${width}px`;
    layer.append(underneath);
  }
  layer.append(front, cast);
  book.append(layer);

  const corners = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const outer = forward ? width : 0;
  const direction = forward ? -1 : 1;
  const foldDepth = Math.min(height * .30, width * .45);
  const duration = 520;
  let frame = 0;
  const started = performance.now();

  function draw(progress: number) {
    const t = progress < .5 ? 2 * progress ** 2 : 1 - 2 * (1 - progress) ** 2;
    const corner = { x: outer + direction * (1 + (2 * width - 1) * t), y: height - foldDepth * Math.sin(Math.PI * t) };
    const length = Math.hypot(corner.x - outer, corner.y - height);
    const nx = (corner.x - outer) / length;
    const ny = (corner.y - height) / length;
    const offset = nx * (outer + corner.x) / 2 + ny * (height + corner.y) / 2;
    const distance = ({ x, y }: Point) => nx * x + ny * y - offset;
    front.style.clipPath = clipSheet(corners, distance, 1);
    fold.style.clipPath = clipSheet(corners, distance, -1);
    fold.style.transform = `matrix(${1 - 2 * nx * nx}, ${-2 * nx * ny}, ${-2 * nx * ny}, ${1 - 2 * ny * ny}, ${2 * offset * nx}, ${2 * offset * ny})`;
    const peak = Math.sin(Math.PI * t);
    cast.style.filter = `drop-shadow(${direction * 6 * peak}px 3px ${8 * peak}px rgb(29 24 15 / ${.27 * peak}))`;
    shade.style.opacity = String(.8 * peak);
  }
  shade.style.background = `linear-gradient(${forward ? 100 : 260}deg, #30281c44, transparent 36%, #fff9 72%, #342e242c)`;

  function animate(now: number) {
    const progress = Math.min(1, (now - started) / duration);
    if (progress === 1) layer.remove();
    else {
      draw(progress);
      frame = requestAnimationFrame(animate);
    }
  }
  draw(0);
  frame = requestAnimationFrame(animate);
  return () => { cancelAnimationFrame(frame); layer.remove(); };
}
