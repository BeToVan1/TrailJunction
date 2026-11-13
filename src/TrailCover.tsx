import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import meadowPhoto from "./journal-meadow.webp";
import { nearbyTrailPhotos, photoSearchCenter, type NearbyPhoto } from "./nearby-trail-photos.ts";
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

export function TrailCover({ trail, online }: { trail: Trail; online: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const [loadedUrl, setLoadedUrl] = useState<string>();
  const parkCode = trail.format === "usgs-topo" ? trail.parkCode : undefined;
  const photo = featured[trail.id] ?? (parkCode === "zion" ? zionPhoto : parkCode && photos[parkCode]);
  if (!photo || photo.url === failedUrl) {
    const center = trail.format === "usgs-topo" ? photoSearchCenter(trail.lines) : undefined;
    return center ? <NearbyTrailCover key={center.join("|")} trail={trail} center={center} online={online} />
      : <figure className="catalog-cover"><PhotoPlaceholder /></figure>;
  }
  const { url, source, credit } = photo;
  const subject = parkCode ? trail.park.split(" · ")[0] : trail.name;
  const loaded = loadedUrl === url;
  return (
    <figure className="catalog-cover" data-trail={trail.id}>
      <div className="catalog-cover-image">
        {!loaded && <PhotoPlaceholder loading />}
        <img src={url} alt={`Photo of ${subject}`} hidden={!loaded} loading="lazy" decoding="async"
          onLoad={() => setLoadedUrl(url)} onError={() => setFailedUrl(url)} />
      </div>
      {loaded && <figcaption>
        <a href={source} target="_blank" rel="noreferrer" aria-label={`Photo source for ${subject}: ${credit}`}>{credit}</a>
      </figcaption>}
    </figure>
  );
}

function PhotoPlaceholder({ loading = false }: { loading?: boolean }) {
  return (
    <div className="catalog-cover-placeholder">
      <ImageOff aria-hidden="true" />
      <span>{loading ? "Looking for a photo…" : "No photo available"}</span>
    </div>
  );
}

function NearbyTrailCover({ trail, center: [latitude, longitude], online }: {
  trail: Trail;
  center: [string, string];
  online: boolean;
}) {
  const cover = useRef<HTMLElement>(null);
  const [nearby, setNearby] = useState<NearbyPhoto[]>();
  const [index, setIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string>();

  useEffect(() => {
    const target = cover.current;
    if (!target || !online || nearby?.length) return;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void nearbyTrailPhotos(trail.name, latitude, longitude).then((photos) => {
        if (active) setNearby(photos);
      });
    }, { rootMargin: "180px 0px" });
    observer.observe(target);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [online, nearby?.length, trail.name, latitude, longitude]);

  const photo = nearby?.[index];
  const loaded = photo && loadedUrl === photo.url;

  return (
    <figure ref={cover} className="catalog-cover catalog-cover-nearby" data-trail={trail.id}>
      <div className="catalog-cover-image">
        {!loaded && <PhotoPlaceholder loading={Boolean(online && (photo || nearby === undefined))} />}
        {photo && (
          <img key={photo.url} src={photo.url} alt="" hidden={!loaded} decoding="async"
            onLoad={() => setLoadedUrl(photo.url)} onError={() => setIndex((failedIndex) => failedIndex + 1)} />
        )}
        {loaded && <span>Nearby photo</span>}
      </div>
      {loaded && <figcaption>
        <a href={photo.source} target="_blank" rel="noreferrer">{photo.author}</a>
        {photo.licenseUrl
          ? <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>
          : <span>{photo.license}</span>}
      </figcaption>}
    </figure>
  );
}
