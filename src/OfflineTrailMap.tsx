import { useEffect, useState } from "react";
import { zionDataSource, type Coordinate, type Trail, type TrailMapData } from "./trail-catalog.ts";

function ParkMap({ image, name }: { image: Blob; name: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const mapUrl = URL.createObjectURL(image);
    setUrl(mapUrl);
    return () => URL.revokeObjectURL(mapUrl);
  }, [image]);

  return url ? <img className="park-map-image" src={url} alt={`National Park Service map of ${name}`} /> : null;
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
  return (
    <figure className="map-frame park-map">
      {map.format === "image" ? <ParkMap image={map.image} name={trail.name} /> :
        <RouteOutline lines={map.lines} name={trail.name} />}
      <figcaption className="map-key">
        {map.format === "linework" && <span><i className="loop-key" /> Route outline</span>}
        <a href={map.format === "image" ? trail.info : zionDataSource} target="_blank" rel="noreferrer">
          National Park Service
        </a>
      </figcaption>
    </figure>
  );
}
