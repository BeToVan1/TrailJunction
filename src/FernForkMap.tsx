import { useLayoutEffect, useRef } from "react";
import type { SignArrow } from "./sign-reading.ts";

const legs = [
  { d: "M180 196C169 219 185 230 177 245Q174 251 173 257", start: 16, end: 5, branch: undefined },
  { d: "M180 196C157 175 138 179 118 162S105 147 97 136", start: 16, end: 10, branch: "left" },
  { d: "M97 136C100 116 119 103 109 86S74 74 75 48", start: 10, end: 10, branch: "left" },
  { d: "M180 196C202 174 225 178 244 158S253 145 263 136", start: 16, end: 10, branch: "right" },
  { d: "M263 136C258 115 239 105 252 88S283 76 285 48", start: 10, end: 10, branch: "right" },
];

const contours = [
  { id: "fern-contour-top", d: "M99 -16C126 -3 138 12 152 31C168 54 186 71 207 65C230 58 244 22 276 9C293 2 317 1 332 -12", offsets: [0, -12, -24, -36] },
  { id: "fern-contour-west", d: "M-16 124C38 113 55 136 87 161C114 182 149 182 177 205C197 222 210 245 239 270", offsets: [0, 12, 24, 36, 48] },
  { id: "fern-contour-east", d: "M374 112C340 117 324 143 309 168C294 192 268 219 260 262", offsets: [0, 12, 24, 36] },
];

const points = [
  { name: "Rocky Point", x: 75, y: 48, branch: "left", kind: "end" },
  { name: "Sloan Lake", x: 285, y: 48, branch: "right", kind: "end" },
  { name: "Trailhead", x: 97, y: 136, branch: "left", kind: "stop" },
  { name: "Cedar Spur", x: 263, y: 136, branch: "right", kind: "stop" },
];

function fitDashes(path: SVGPathElement, start: number, end: number) {
  const length = path.getTotalLength();
  const available = length - start - end;
  const dash = 3;
  const preferredGap = 7;
  const count = Math.max(2, Math.round((available + preferredGap) / (dash + preferredGap)));
  const gap = (available - count * dash) / (count - 1);
  // The final gap spans the rest of the path so no partial dash can wrap around.
  const pattern = Array.from({ length: count }, (_, index) => dash + " " + (index === count - 1 ? length : gap));
  path.setAttribute("stroke-dasharray", pattern.join(" "));
  path.setAttribute("stroke-dashoffset", String(-start));
}

export function FernForkMap({ branch, description }: { branch?: SignArrow["direction"]; description: string }) {
  const paths = useRef<(SVGPathElement | null)[]>([]);

  useLayoutEffect(() => {
    legs.forEach(({ start, end }, index) => {
      const path = paths.current[index];
      if (path) fitDashes(path, start, end);
    });
  }, []);

  return (
    <figure className="fern-visual fern-map" role="img" aria-label={description}>
      <svg viewBox="0 0 360 260" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="fern-map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="var(--fern-contour)" strokeOpacity=".5" />
          </pattern>
          {contours.map(({ id, d }) => <path id={id} d={d} key={id} />)}
        </defs>
        <rect width="360" height="260" fill="url(#fern-map-grid)" />
        <g fill="none" stroke="var(--fern-contour)" strokeWidth="1.3">
          {contours.flatMap(({ id, offsets }) => offsets.map((y) => <use href={`#${id}`} y={y} key={`${id}-${y}`} />))}
        </g>
        {legs.map((leg, index) => (
          <path
            key={leg.d}
            ref={(path) => { paths.current[index] = path; }}
            className="fern-leg"
            data-highlighted={Boolean(branch && leg.branch === branch)}
            d={leg.d}
          />
        ))}
        {points.map((point) => (
          <circle key={point.name} className="fern-point" cx={point.x} cy={point.y}
            r={point.branch === branch ? 7 : 5} data-highlighted={point.branch === branch} />
        ))}
        <circle cx="180" cy="196" r="10" fill="var(--sheet)" stroke="var(--fern-route)" strokeWidth="2" />
        <circle cx="180" cy="196" r="4" fill="var(--fern-route)" />
      </svg>
      {points.map((point) => (
        <span key={point.name} className={`fern-label fern-${point.branch}-${point.kind}`}
          data-highlighted={point.branch === branch}>{point.name}</span>
      ))}
      <span className="fern-label fern-here">You are here</span>
      <figcaption className="fern-caption">Illustrated trail map</figcaption>
    </figure>
  );
}
