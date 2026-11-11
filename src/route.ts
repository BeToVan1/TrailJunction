export interface Junction {
  id: string;
  name: string;
  signLines: readonly string[];
  point: { x: number; y: number };
}

export interface TrailSegment {
  from: string;
  to: string;
  branch: string;
}

export interface RoutePack {
  id: string;
  version: number;
  name: string;
  kind: "demo" | "verified";
  loop: readonly string[];
  junctions: readonly Junction[];
  segments: readonly TrailSegment[];
}

export type JunctionMatch =
  | { status: "candidate"; junction: Junction; evidence: string[] }
  | { status: "ambiguous"; junctions: Junction[] }
  | { status: "unmatched" };

export type Recovery =
  | { status: "on-loop" }
  | { status: "return"; segments: TrailSegment[] }
  | { status: "unavailable" };

function normalizeSignLine(line: string): string {
  return line
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/^[\s←→↑↓]+|[\s←→↑↓]+$/gu, "")
    .replace(/\s+/gu, " ");
}

export function matchJunction(
  pack: RoutePack,
  observedLines: readonly string[],
): JunctionMatch {
  const evidence = [...new Set(observedLines.map(normalizeSignLine))].filter(Boolean);
  const matches = evidence.flatMap((line) => {
    const junctions = pack.junctions.filter((junction) =>
      junction.signLines.some((label) => normalizeSignLine(label) === line),
    );
    return junctions.length ? [{ line, junctions }] : [];
  });

  if (matches.length === 0) {
    return { status: "unmatched" };
  }

  const possible = pack.junctions.filter((junction) =>
    matches.every((match) => match.junctions.includes(junction)),
  );

  if (possible.length === 1) {
    return {
      status: "candidate",
      junction: possible[0],
      evidence: matches.map((match) => match.line),
    };
  }

  return {
    status: "ambiguous",
    junctions: possible.length
      ? possible
      : pack.junctions.filter((junction) =>
          matches.some((match) => match.junctions.includes(junction)),
        ),
  };
}

export function findRecovery(pack: RoutePack, confirmedJunctionId: string): Recovery {
  const knownIds = new Set(pack.junctions.map((junction) => junction.id));
  if (!knownIds.has(confirmedJunctionId)) {
    return { status: "unavailable" };
  }

  const loop = new Set(pack.loop);
  if (loop.has(confirmedJunctionId)) {
    return { status: "on-loop" };
  }

  const visited = new Set([confirmedJunctionId]);
  const queue: Array<{ junctionId: string; path: TrailSegment[] }> = [
    { junctionId: confirmedJunctionId, path: [] },
  ];

  for (const { junctionId, path } of queue) {
    for (const segment of pack.segments) {
      if (segment.from !== junctionId || visited.has(segment.to) || !knownIds.has(segment.to)) {
        continue;
      }

      const nextPath = [...path, segment];
      if (loop.has(segment.to)) {
        return { status: "return", segments: nextPath };
      }

      visited.add(segment.to);
      queue.push({ junctionId: segment.to, path: nextPath });
    }
  }

  return { status: "unavailable" };
}
