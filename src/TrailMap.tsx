import { useId } from "react";
import { demoMapHeight, demoMapWidth, fernForkLegs } from "./demo-route.ts";
import { FernMapTerrain } from "./FernForkMap.tsx";
import type { RoutePack, TrailSegment } from "./route.ts";

function segmentKey(segment: Pick<TrailSegment, "from" | "to">) {
  return [segment.from, segment.to].sort().join("/");
}

const forkPaths = new Map(fernForkLegs.map((leg) => [segmentKey(leg), leg.d]));
const labels: Record<string, { dx: number; dy: number; anchor?: "middle" | "end" }> = {
  "rocky-point": { dx: 0, dy: -12, anchor: "middle" },
  "sloan-lake": { dx: 0, dy: -12, anchor: "middle" },
  trailhead: { dx: -9, dy: 4, anchor: "end" },
  "cedar-spur": { dx: 9, dy: 4 },
  "fern-fork": { dx: 11, dy: 18 },
  footbridge: { dx: -1, dy: 18, anchor: "middle" },
  ridge: { dx: 0, dy: 16, anchor: "middle" },
};

export function TrailMap({
  pack, confirmedId, recovery,
}: {
  pack: RoutePack;
  confirmedId: string | null;
  recovery: TrailSegment[];
}) {
  const id = useId();
  const points = new Map(pack.junctions.map(({ id, point }) => [
    id, { x: point.x * demoMapWidth, y: point.y * demoMapHeight },
  ]));
  const loopKeys = new Set(pack.loop.map((from, index) =>
    segmentKey({ from, to: pack.loop[(index + 1) % pack.loop.length] }),
  ));
  const recoveryKeys = new Set(recovery.map(segmentKey));
  const segments = [...new Map(pack.segments.map((segment) => [segmentKey(segment), segment])).entries()];

  return (
    <figure className="map-frame fern-terrain">
      <svg className="trail-map" viewBox={`0 0 ${demoMapWidth} ${demoMapHeight}`} role="img" aria-labelledby={`${id}-title ${id}-detail`}>
        <title id={`${id}-title`}>{pack.name} schematic</title>
        <desc id={`${id}-detail`}>
          From Fern Fork, the left branch passes through Trailhead to Rocky Point. The right branch passes through Cedar Spur to Sloan Lake.{" "}
          {confirmedId ? `Last confirmed at ${pack.junctions.find(({ id }) => id === confirmedId)?.name}.` : "Choose a checkpoint to mark your position."}
          {recovery.length > 0 && ` Return via the branch marked ${recovery[0].branch}.`}
        </desc>
        <FernMapTerrain height={demoMapHeight} />
        {segments.map(([key, segment]) => {
          const onLoop = loopKeys.has(key);
          const active = recoveryKeys.has(key);
          const from = points.get(segment.from)!;
          const to = points.get(segment.to)!;
          const x = (from.x + to.x) / 2 - (to.y - from.y) * 0.15;
          const y = (from.y + to.y) / 2 + (to.x - from.x) * 0.15;
          const d = forkPaths.get(key) ?? `M${from.x},${from.y} Q${x},${y} ${to.x},${to.y}`;
          return (
            <g key={key}>
              {(onLoop || active) && <path className="route-halo" d={d} />}
              <path className={active ? "return-route" : onLoop ? "loop-route" : "spur-route"} d={d} />
            </g>
          );
        })}
        {pack.junctions.map(({ id, name }) => {
          const { x, y } = points.get(id)!;
          const current = id === confirmedId;
          const label = labels[id] ?? { dx: 10, dy: 4 };
          return (
            <g key={id}>
              {current && <circle className={recovery.length ? "return-pin" : "current-pin"} cx={x} cy={y} r="10" />}
              <circle className="map-point" cx={x} cy={y} r={current ? 3.5 : 4.5} />
              <text className="map-label" x={x + label.dx} y={y + label.dy} textAnchor={label.anchor}>{name}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="map-key">
        <span><i className="loop-key" /> Planned loop</span>
        <span><i className="spur-key" /> Side trail</span>
        {recovery.length > 0 && <span><i className="return-key" /> Path back</span>}
      </figcaption>
    </figure>
  );
}
