import { useState } from "react";
import meadowPhoto from "./journal-meadow.webp";
import parkPhotos from "./nps-park-photos.json";
import type { Trail } from "./trail-catalog.ts";

type Photo = { url: string; source: string; credit: string };
const photos: Partial<Record<string, Photo>> = parkPhotos;
const base = import.meta.env.BASE_URL;
const zionPhoto: Photo = { url: `${base}trails/zion-cover.webp`, source: "https://www.nps.gov/thingstodo/hike-pa-rus-trail.htm", credit: "NPS" };
const featured: Record<string, Photo> = {
  "cooks-meadow": { url: meadowPhoto, source: "https://www.nps.gov/yose/planyourvisit/fall.htm", credit: "NPS" },
  "lower-yosemite-fall": { url: `${base}trails/falls-cover.webp`, source: "https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm", credit: "NPS" },
  parus: zionPhoto,
};

export function TrailCover({ trail }: { trail: Trail }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const parkCode = trail.format === "usgs-topo" ? trail.parkCode : undefined;
  const photo = featured[trail.id] ?? (parkCode === "zion" ? zionPhoto : parkCode && photos[parkCode]);
  if (!photo || photo.url === failedUrl) return null;
  const { url, source, credit } = photo;
  const subject = parkCode ? trail.park.split(" · ")[0] : trail.name;
  return (
    <figure className="catalog-cover" data-trail={trail.id}>
      <img src={url} alt={`Photo of ${subject}`} loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />
      <figcaption>
        <a href={source} target="_blank" rel="noreferrer" aria-label={`Photo source for ${subject}: ${credit}`}>{credit}</a>
      </figcaption>
    </figure>
  );
}
