import { useId, useLayoutEffect, useRef } from "react";
import { demoMapPoints, demoMapWidth, fernForkBranches, fernForkLegs } from "./demo-route.ts";
import type { SignArrow } from "./sign-reading.ts";

const illustratedHeight = 260;

const contours = [
  { id: "fern-contour-top", d: "M99 -16C126 -3 138 12 152 31C168 54 186 71 207 65C230 58 244 22 276 9C293 2 317 1 332 -12", offsets: [0, -12, -24, -36] },
  { id: "fern-contour-west", d: "M-16 124C38 113 55 136 87 161C114 182 149 182 177 205C197 222 210 245 239 270", offsets: [0, 12, 24, 36, 48] },
  { id: "fern-contour-east", d: "M374 112C340 117 324 143 309 168C294 192 268 219 260 262", offsets: [0, 12, 24, 36] },
];

const points = fernForkBranches.flatMap(({ direction, stop, destination }) => [
  { ...demoMapPoints[destination], branch: direction, kind: "end" },
  { ...demoMapPoints[stop], branch: direction, kind: "stop" },
]);

export function FernMapTerrain({ height }: { height: number }) {
  const prefix = useId();
  return (
    <>
      <defs>
        <pattern id={`${prefix}-grid`} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="var(--fern-contour)" strokeOpacity=".5" />
        </pattern>
        {contours.map(({ id, d }) => <path id={`${prefix}-${id}`} d={d} key={id} />)}
      </defs>
      <rect width={demoMapWidth} height={height} fill="var(--fern-terrain)" />
      <rect width={demoMapWidth} height={height} fill={`url(#${prefix}-grid)`} />
      <g fill="none" stroke="var(--fern-contour)" strokeWidth="1.3">
        {contours.flatMap(({ id, offsets }) => offsets.map((y) => <use href={`#${prefix}-${id}`} y={y} key={`${id}-${y}`} />))}
      </g>
    </>
  );
}

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
    fernForkLegs.forEach(({ start, end }, index) => {
      const path = paths.current[index];
      if (path) fitDashes(path, start, end);
    });
  }, []);

  return (
    <figure className="fern-visual fern-map" role="img" aria-label={description}>
      <svg viewBox={`0 0 ${demoMapWidth} ${illustratedHeight}`} preserveAspectRatio="none" aria-hidden="true">
        <FernMapTerrain height={illustratedHeight} />
        {fernForkLegs.map((leg, index) => (
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
        <g transform={`translate(${demoMapPoints["fern-fork"].x} ${demoMapPoints["fern-fork"].y})`}>
          <circle r="10" fill="var(--sheet)" stroke="var(--fern-route)" strokeWidth="2" />
          <circle r="4" fill="var(--fern-route)" />
        </g>
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
