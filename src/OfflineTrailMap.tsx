import { useEffect, useState, type ReactNode } from "react";
import { mapPoint, squareTrailExtent } from "./map-projection.ts";
import { parusMapPlaces, scoutBranches, type SavedSignMapMatch } from "./saved-sign-map.ts";
import { zionDataSource, type Coordinate, type MapExtent, type Trail, type TrailMapData } from "./trail-catalog.ts";
import { nationalMap, usgsTrailsLayer } from "./usgs-trails.ts";

function useMapImage(image: Blob) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const mapUrl = URL.createObjectURL(image);
    setUrl(mapUrl);
    return () => URL.revokeObjectURL(mapUrl);
  }, [image]);
  return url;
}

function ParkMap({ image, trail }: { image: Blob; trail: Trail }) {
  const url = useMapImage(image);
  if (!url) return null;
  // The original Lower Yosemite JPEG stacks an elevation profile above the
  // map. Show only the map, including when this JPEG was saved before the update.
  return (
    <div className={trail.id === "lower-yosemite-fall" ? "park-map-art park-map-art-cropped" : "park-map-art"}>
      <img className="park-map-image" src={url} alt={`National Park Service map of ${trail.name}. Follow the yellow route.`} />
    </div>
  );
}

const parusBasemap = {
  url: `${import.meta.env.BASE_URL}trails/parus-topo.jpg`,
  width: 840,
  height: 1200,
  // EPSG:3857 extent returned by the USGS Topo image export.
  west: -12578100.584222775,
  south: 4466599.593508437,
  east: -12575651.555425322,
  north: 4470098.206076228,
};

export function TopoOverlay({ lines, extent, width, height, url, label, highlighted = false, children }: {
  lines: Coordinate[][];
  extent: MapExtent;
  width: number;
  height: number;
  url?: string;
  label: string;
  highlighted?: boolean;
  children?: ReactNode;
}) {
  const paths = lines.map((line) => line.map((point) => mapPoint(point, extent, width, height).join(",")).join(" "));
  return (
    <svg className="park-zion-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {url && <image href={url} width={width} height={height} />}
      {paths.map((points, index) => <polyline className="park-route-halo" key={index} points={points} />)}
      {paths.map((points, index) => <polyline className={highlighted ? "park-route-line park-route-matched" : "park-route-line"}
        key={index} points={points} />)}
      {children}
    </svg>
  );
}

export function JunctionRoute({ points }: { points: string }) {
  return <g className="junction-route">
    <polyline className="park-route-halo" points={points} pathLength={1} />
    <polyline className="rampart-highlight" points={points} pathLength={1} />
  </g>;
}

export function DestinationRing({ x, y, radius }: { x: number; y: number; radius: number }) {
  return <circle className="map-destination-ring" cx={x} cy={y} r={radius} aria-hidden="true" />;
}

function ParusMap({ lines, match }: { lines: Coordinate[][]; match?: SavedSignMapMatch }) {
  const { width, height, url } = parusBasemap;
  const label = "Zion Canyon topographic map of the Pa’rus Trail between the trailhead near the Visitor Center and Canyon Junction.";

  return (
    <TopoOverlay lines={lines} extent={parusBasemap} width={width} height={height} url={url}
      highlighted={match?.kind === "trail"} label={match ? `${label} ${match.name} is highlighted.` : label}>
      {parusMapPlaces.map(({ id, name, location }) => {
        const [x, y] = mapPoint(location, parusBasemap, width, height);
        const north = id === "canyon-junction";
        const selected = match?.kind === "place" && match.id === id;
        const offset = selected ? 31 : 24;
        return <g key={id}>
          <circle className={selected ? "park-route-end park-place-matched" : "park-route-end"}
            cx={x} cy={y} r={selected ? 24 : 13} />
          {selected && <><circle cx={x} cy={y} r="7" fill="white" />
            <DestinationRing x={x} y={y} radius={27} /></>}
          <text x={north ? x - offset : x + offset} y={north ? y - 16 : y + 39}
            textAnchor={north ? "end" : undefined}>{name}</text>
        </g>;
      })}
      <text x="785" y="57" textAnchor="middle">N</text>
      <path d="M785 118V74m-13 15 13-15 13 15" className="park-north-arrow" />
    </TopoOverlay>
  );
}

function UsgsTopoMap({ map, highlighted }: { map: Extract<TrailMapData, { format: "usgs-topo" }>; highlighted: boolean }) {
  const url = useMapImage(map.image);
  if (!url) return null;
  return (
    <TopoOverlay lines={map.trail.lines} extent={map.extent} width={map.size} height={map.size} url={url}
      highlighted={highlighted} label={`USGS topographic map. ${map.trail.name} is shown in ${highlighted ? "green" : "blue"}.`}>
      <text x={map.size - 55} y="57" textAnchor="middle">N</text>
      <path d={`M${map.size - 55} 118V74m-13 15 13-15 13 15`} className="park-north-arrow" />
    </TopoOverlay>
  );
}

function ScoutJunctionMap({ lines, match }: { lines: Coordinate[][]; match?: SavedSignMapMatch }) {
  const size = 1000;
  const extent = squareTrailExtent(lines);
  const junction = lines[0].at(-1)!;
  const [x, y] = mapPoint(junction, extent, size, size);
  const branch = match?.kind === "branch" && scoutBranches.find(({ id }) => id === match.id);
  const highlight = branch && lines[branch.index];

  return <TopoOverlay lines={lines} extent={extent} width={size} height={size}
    url={`${import.meta.env.BASE_URL}trails/scout-junction.jpg`}
    label={branch ? `Map with the ${branch.name} branch highlighted from Scout Lookout.` : "Map of the West Rim Trail and Angels Landing fork at Scout Lookout."}>
    {highlight && <JunctionRoute key={branch.id}
      points={highlight.map((point) => mapPoint(point, extent, size, size).join(",")).join(" ")} />}
    {scoutBranches.map(({ id, index, name }) => {
      const end = lines[index]?.at(-1);
      if (!end) return null;
      const [endX, endY] = mapPoint(end, extent, size, size);
      const selected = branch && branch.id === id;
      return <g key={id}>
        {selected && <><circle className="park-route-end park-destination" cx={endX} cy={endY} r="13" />
          <DestinationRing x={endX} y={endY} radius={16} /></>}
        <text x={endX} y={endY - 25} textAnchor="middle">{name}</text>
      </g>;
    })}
    <circle className="park-route-end park-place-matched" cx={x} cy={y} r="20" />
    <circle cx={x} cy={y} r="6" fill="white" />
    <text x={x + 32} y={y - 20}>Scout Lookout</text>
  </TopoOverlay>;
}

export function OfflineTrailMap({ trail, map, match }: { trail: Trail; map: TrailMapData; match?: SavedSignMapMatch }) {
  const nearbyTrail = trail.id === "lower-yosemite-fall" ? "Cook’s Meadow Loop" : "Lower Yosemite Fall Trail";
  const highlighted = match?.kind === "trail";
  const scout = map.format === "linework" && map.id === "scout-junction";
  return (
    <figure className="map-frame park-map">
      {map.format === "image" ? (
        <>
          <ul className="park-legend" aria-label="Map key">
            <li><i className="park-yellow" aria-hidden="true" /><span><strong>Follow yellow</strong> for {trail.name}{highlighted && " · Matched on sign"}</span></li>
            <li><i className="park-orange" aria-hidden="true" /><span>Orange shows {nearbyTrail}</span></li>
          </ul>
          <ParkMap image={map.image} trail={trail} />
        </>
      ) : (
        <>
          <ul className="park-legend" aria-label="Map key">
            <li><i className={highlighted ? "park-green" : "park-blue"} aria-hidden="true" /><span>
              <strong>{trail.name}</strong>{highlighted ? " · Matched on sign" : map.format === "linework" && !scout && " · Visitor Center to Canyon Junction"}
            </span></li>
            {match?.kind === "branch" && <li><i className="park-green" aria-hidden="true" /><span><strong>{match.name}</strong> · Branch from Scout Lookout</span></li>}
            {match?.kind === "place" && <li><i className="park-place-key" aria-hidden="true" /><span>
              <strong>{match.name}</strong> · Matched on sign
            </span></li>}
          </ul>
          {map.format === "usgs-topo" ? <UsgsTopoMap map={map} highlighted={highlighted} />
            : scout ? <ScoutJunctionMap lines={map.lines} match={match} /> : <ParusMap lines={map.lines} match={match} />}
        </>
      )}
      <figcaption className="map-key">
        {map.format !== "usgs-topo" && !scout && (
          <a href={map.format === "image" ? trail.info : zionDataSource} target="_blank" rel="noreferrer">
            {map.format === "image" ? "National Park Service" : "Trail data: National Park Service"}
          </a>
        )}
        {map.format !== "image" && (
          <a href={map.format === "usgs-topo" || scout ? usgsTrailsLayer : nationalMap} target="_blank" rel="noreferrer">
            Map services and data available from U.S. Geological Survey, National Geospatial Program.
          </a>
        )}
      </figcaption>
    </figure>
  );
}
