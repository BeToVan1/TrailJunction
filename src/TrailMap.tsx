import { useId, useLayoutEffect, useRef } from "react";
import { demoMapHeight, demoMapWidth, demoRoute, fernForkBranches, fernForkLegs } from "./demo-route.ts";
import type { TrailSegment } from "./route.ts";

const contours = [
  { id: "top", d: "M99 -16C126 -3 138 12 152 31C168 54 186 71 207 65C230 58 244 22 276 9C293 2 317 1 332 -12", offsets: [0, -12, -24, -36] },
  { id: "west", d: "M-16 124C38 113 55 136 87 161C114 182 149 182 177 205C197 222 210 245 239 270", offsets: [0, 12, 24, 36, 48] },
  { id: "east", d: "M374 112C340 117 324 143 309 168C294 192 268 219 260 262", offsets: [0, 12, 24, 36] },
];

function segmentKey(segment: Pick<TrailSegment, "from" | "to">) {
  return [segment.from, segment.to].sort().join("/");
}

const { junctions, name } = demoRoute;
const labels: Record<string, { dx: number; dy: number; anchor?: "middle" | "end" }> = {
  "rocky-point": { dx: 0, dy: -12, anchor: "middle" },
  "sloan-lake": { dx: 0, dy: -12, anchor: "middle" },
  trailhead: { dx: -9, dy: 4, anchor: "end" },
  "cedar-spur": { dx: 9, dy: 4 },
  "fern-fork": { dx: 11, dy: 18 },
};

export function TrailMap({
  confirmedId, recovery = [], branch, description,
}: {
  confirmedId: string | null;
  recovery?: readonly TrailSegment[];
  branch?: "left" | "right" | "straight";
  description?: string;
}) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const recoveryKeys = new Set(recovery.map(segmentKey));
  const selectedBranch = fernForkBranches.find(({ direction }) => direction === branch);
  const selectedKeys = selectedBranch ? new Set([
    segmentKey({ from: "fern-fork", to: selectedBranch.stop }),
    segmentKey({ from: selectedBranch.stop, to: selectedBranch.destination }),
  ]) : undefined;

  useLayoutEffect(() => {
    for (const path of svg.current?.querySelectorAll<SVGPathElement>("[data-trail-leg]") ?? []) {
      const length = path.getTotalLength();
      const clearance = 10;
      const dash = 3;
      const available = length - 2 * clearance;
      const count = Math.max(2, Math.round((available + 7) / (dash + 7)));
      const gap = (available - count * dash) / (count - 1);
      // Keep whole dashes away from the markers at both ends.
      path.setAttribute("stroke-dasharray", [...Array(count - 1).fill(`${dash} ${gap}`), `${dash} ${length}`].join(" "));
      path.setAttribute("stroke-dashoffset", String(-clearance));
    }
  }, []);

  return (
    <figure className="map-frame fern-terrain">
      <svg ref={svg} className="trail-map" viewBox={`0 0 ${demoMapWidth} ${demoMapHeight}`} role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-detail`}>
        <title id={`${id}-title`}>{name} schematic</title>
        <desc id={`${id}-detail`}>
          From Fern Fork, the left branch passes through Trailhead to Rocky Point. The right branch passes through Cedar Spur to Sloan Lake.{" "}
          {description ?? (confirmedId ? `Last confirmed at ${junctions.find(({ id }) => id === confirmedId)?.name}.` : "Choose a checkpoint to mark your position.")}
          {recovery.length > 0 && ` Return via the branch marked ${recovery[0].branch}.`}
        </desc>
        <defs>
          <pattern id={`${id}-grid`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="var(--fern-contour)" strokeOpacity=".5" />
          </pattern>
          {contours.map(({ id: contour, d }) => <path id={`${id}-${contour}`} d={d} key={contour} />)}
        </defs>
        <rect width={demoMapWidth} height={demoMapHeight} fill="var(--fern-terrain)" />
        <rect width={demoMapWidth} height={demoMapHeight} fill={`url(#${id}-grid)`} />
        <g fill="none" stroke="var(--fern-contour)" strokeWidth="1.3">
          {contours.flatMap(({ id: contour, offsets }) => offsets.map((y) => <use href={`#${id}-${contour}`} y={y} key={`${contour}-${y}`} />))}
        </g>
        {fernForkLegs.map((leg) => {
          const key = segmentKey(leg);
          const active = recoveryKeys.has(key);
          const selected = selectedKeys?.has(key);
          return (
            <g key={key}>
              {(active || selected) && <path className="route-halo" d={leg.d} />}
              <path data-trail-leg="" className={active ? "return-route" : selected ? "selected-route" : "spur-route"} d={leg.d} />
            </g>
          );
        })}
        {junctions.map(({ id, name, point }) => {
          const x = point.x * demoMapWidth;
          const y = point.y * demoMapHeight;
          const current = id === confirmedId;
          const selected = id === selectedBranch?.stop || id === selectedBranch?.destination;
          const label = labels[id] ?? { dx: 10, dy: 4 };
          return (
            <g key={id}>
              {current && <circle className={recovery.length ? "return-pin" : "current-pin"} cx={x} cy={y} r="10" />}
              <circle className={selected ? "map-point selected-point" : "map-point"} cx={x} cy={y} r={current ? 3.5 : selected ? 5.5 : 4.5} />
              <text className={selected ? "map-label selected-label" : "map-label"} x={x + label.dx} y={y + label.dy} textAnchor={label.anchor}>{name}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="map-key">
        <span><i className="spur-key" /> Trail branch</span>
        {selectedBranch && <span><i className="selected-key" /> Your route</span>}
        {recovery.length > 0 && <span><i className="return-key" /> Path back</span>}
      </figcaption>
    </figure>
  );
}
