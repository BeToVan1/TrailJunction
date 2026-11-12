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

function RouteOutline({ lines, name }: { lines: Coordinate[][]; name: string }) {
  const points = lines.flat();
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const longitudeScale = Math.cos((south + north) / 2 * Math.PI / 180);
  const rangeX = (east - west) * longitudeScale;
  const rangeY = north - south;
  const scale = 224 / Math.max(rangeX, rangeY, Number.EPSILON);
  const insetX = (336 - rangeX * scale) / 2;
  const insetY = (280 - rangeY * scale) / 2;

  return (
    <svg className="park-route-outline" viewBox="0 0 336 280" role="img" aria-label={`North-up route outline of ${name}`}>
      <text x="310" y="27" textAnchor="middle">N</text>
      <path d="M310 33V52m-5-13 5-6 5 6" className="park-north-arrow" />
      {lines.map((line, index) => (
        <polyline className="park-route-line" key={index} points={line.map(([longitude, latitude]) =>
          `${insetX + (longitude - west) * longitudeScale * scale},${insetY + (north - latitude) * scale}`).join(" ")} />
      ))}
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
      ) : <RouteOutline lines={map.lines} name={trail.name} />}
      <figcaption className="map-key">
        {map.format === "linework" && <span><i className="loop-key" /> Route outline</span>}
        <a href={map.format === "image" ? trail.info : zionDataSource} target="_blank" rel="noreferrer">
          National Park Service
        </a>
      </figcaption>
    </figure>
  );
}
