import { useEffect, useState } from "react";
import { zionDataSource, type Coordinate, type Trail, type TrailMapData } from "./trail-catalog.ts";

function ParkMap({ image, trail }: { image: Blob; trail: Trail }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const mapUrl = URL.createObjectURL(image);
    setUrl(mapUrl);
    return () => URL.revokeObjectURL(mapUrl);
  }, [image]);

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

function parusMapPoint([longitude, latitude]: Coordinate) {
  const radians = Math.PI / 180;
  const radius = 6378137;
  const x = radius * longitude * radians;
  const y = radius * Math.asinh(Math.tan(latitude * radians));
  const { west, south, east, north, width, height } = parusBasemap;
  return [
    (x - west) * width / (east - west),
    (north - y) * height / (north - south),
  ];
}

function ParusMap({ lines }: { lines: Coordinate[][] }) {
  const { width, height, url } = parusBasemap;
  const paths = lines.map((line) => line.map((point) => parusMapPoint(point).join(",")).join(" "));
  const [trailheadX, trailheadY] = parusMapPoint([-112.986755, 37.201825]);
  const [junctionX, junctionY] = parusMapPoint([-112.973749, 37.218756]);

  return (
    <svg className="park-zion-map" viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label="Zion Canyon topographic map. The blue Pa’rus Trail follows the Virgin River from the trailhead near the Visitor Center to Canyon Junction.">
      <image href={url} width={width} height={height} />
      {paths.map((points, index) => <polyline className="park-route-halo" key={index} points={points} />)}
      {paths.map((points, index) => <polyline className="park-route-line" key={index} points={points} />)}
      <circle className="park-route-end" cx={trailheadX} cy={trailheadY} r="13" />
      <circle className="park-route-end" cx={junctionX} cy={junctionY} r="13" />
      <text x={trailheadX + 24} y={trailheadY + 39}>Pa’rus Trailhead</text>
      <text x={junctionX - 24} y={junctionY - 16} textAnchor="end">Canyon Junction</text>
      <text x="785" y="57" textAnchor="middle">N</text>
      <path d="M785 118V74m-13 15 13-15 13 15" className="park-north-arrow" />
    </svg>
  );
}

export function OfflineTrailMap({ trail, map }: { trail: Trail; map: TrailMapData }) {
  const nearbyTrail = trail.id === "lower-yosemite-fall" ? "Cook’s Meadow Loop" : "Lower Yosemite Fall Trail";
  return (
    <figure className="map-frame park-map">
      {map.format === "image" ? (
        <>
          <ul className="park-legend" aria-label="Map key">
            <li><i className="park-yellow" aria-hidden="true" /><span><strong>Follow yellow</strong> for {trail.name}</span></li>
            <li><i className="park-orange" aria-hidden="true" /><span>Orange shows {nearbyTrail}</span></li>
          </ul>
          <ParkMap image={map.image} trail={trail} />
        </>
      ) : (
        <>
          <ul className="park-legend" aria-label="Map key">
            <li><i className="park-blue" aria-hidden="true" /><span><strong>Pa’rus Trail</strong> · Visitor Center to Canyon Junction</span></li>
          </ul>
          <ParusMap lines={map.lines} />
        </>
      )}
      <figcaption className="map-key">
        <a href={map.format === "image" ? trail.info : zionDataSource} target="_blank" rel="noreferrer">
          {map.format === "image" ? "National Park Service" : "Trail data: National Park Service"}
        </a>
        {map.format === "linework" && (
          <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank" rel="noreferrer">
            Map services and data available from U.S. Geological Survey, National Geospatial Program.
          </a>
        )}
      </figcaption>
    </figure>
  );
}
