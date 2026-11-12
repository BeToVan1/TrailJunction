import type { RoutePack, TrailSegment } from "./route.ts";

const width = 360;
const height = 270;

function segmentKey(segment: TrailSegment) {
  return [segment.from, segment.to].sort().join("/");
}

export function TrailMap({
  pack, confirmedId, recovery,
}: {
  pack: RoutePack;
  confirmedId: string | null;
  recovery: TrailSegment[];
}) {
  const points = new Map(pack.junctions.map(({ id, point }) => [
    id, { x: point.x * width, y: point.y * height },
  ]));
  const loopKeys = new Set(pack.loop.map((from, index) =>
    segmentKey({ from, to: pack.loop[(index + 1) % pack.loop.length], branch: "" }),
  ));
  const recoveryKeys = new Set(recovery.map(segmentKey));
  const segments = [...new Map(pack.segments.map((segment) => [segmentKey(segment), segment])).entries()];

  return (
    <figure className="map-frame">
      <svg className="trail-map" viewBox="0 0 360 270" role="img" aria-labelledby="trail-map-title trail-map-detail">
        <title id="trail-map-title">{pack.name} schematic</title>
        <desc id="trail-map-detail">
          {confirmedId ? `Last confirmed at ${pack.junctions.find(({ id }) => id === confirmedId)?.name}.` : "Choose a checkpoint to mark your position."}
          {recovery.length > 0 && ` Return via the branch marked ${recovery[0].branch}.`}
        </desc>
        <defs>
          <pattern id="map-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r=".65" className="map-dot" />
          </pattern>
        </defs>
        <rect width="360" height="270" className="map-background" />
        <path className="map-land-west" d="M0 0H173c10 29-42 51-24 76 14 19 72 22 58 47-20 37-71 23-91 42C85 194 60 217 0 207Z" />
        <path className="map-land-east" d="M360 48c-48-13-93 2-107 28-18 33 40 58 22 82-13 17-48 8-66 27-19 21-7 56 16 85h135Z" />
        <rect width="360" height="270" fill="url(#map-grid)" />
        <g className="contours">
          <path d="M-16 31C54 65 113 61 141 37s61-36 88-21 40 40 99 17 70-4 82 5" />
          <path d="M-16 50C52 83 110 78 152 49s59-34 81-21 40 43 99 19 61-2 77 5" />
          <path d="M-14 68C51 100 109 96 160 62s55-33 76-18 41 41 100 18 58-1 73 5" />
          <path d="M-7 215c45-3 66-40 100-43 38-3 57 23 85 25 29 2 59-27 87-21 38 8 56 49 109 31" />
          <path d="M-7 230c49-4 73-43 102-45 35-3 59 23 84 26 28 2 57-24 84-20 36 5 55 44 111 28" />
          <path d="M-9 248c52-4 74-43 106-47 31-4 54 24 81 25 34 2 55-24 84-21 34 4 55 44 112 31" />
          <path d="M-11 265c60-7 76-47 110-49 32-2 55 24 80 25 31 2 57-25 84-20 36 6 55 47 111 29" />
        </g>
        <path className="map-stream" d="M42-7c-2 31 28 42 22 71-4 26-27 34-23 58 3 27 27 46 15 70-12 23-2 40 11 57 10 14 13 27 10 32" />
        {segments.map(([key, segment]) => {
          const onLoop = loopKeys.has(key);
          const active = recoveryKeys.has(key);
          const from = points.get(segment.from)!;
          const to = points.get(segment.to)!;
          const bend = onLoop ? 0.15 : -0.16;
          const direction = !onLoop && from.x > to.x ? -1 : 1;
          const x = (from.x + to.x) / 2 - (to.y - from.y) * bend * direction;
          const y = (from.y + to.y) / 2 + (to.x - from.x) * bend * direction;
          const d = `M${from.x},${from.y} Q${x},${y} ${to.x},${to.y}`;
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
          const useLeftLabel = id === "fern-fork";
          const centered = id === "cedar-spur";
          const labelX = centered ? x : useLeftLabel ? x - 10 : x + 10;
          const labelY = id === "ridge" ? y + 4 : useLeftLabel ? y - 12 : y + 21;
          return (
            <g key={id}>
              {current && <circle className={recovery.length ? "return-pin" : "current-pin"} cx={x} cy={y} r="10" />}
              <circle className="map-point" cx={x} cy={y} r={current ? 3.5 : 4.5} />
              <text className="map-label" x={labelX} y={labelY} textAnchor={centered ? "middle" : useLeftLabel ? "end" : "start"}>{name}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="map-key">
        <span><i className="loop-key" /> Planned loop</span>
        {recovery.length ? <span><i className="return-key" /> Path back</span> :
          <span><i className="spur-key" /> Side trail</span>}
      </figcaption>
    </figure>
  );
}
