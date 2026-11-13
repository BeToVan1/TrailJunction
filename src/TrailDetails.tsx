import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Clock, CloudDownload, Map, MapPin, Mountain, Route, Ruler, Signal } from "lucide-react";
import { squareTrailExtent } from "./map-projection.ts";
import { OfflineTrailMap, TopoOverlay } from "./OfflineTrailMap.tsx";
import { TrailCover } from "./TrailCover.tsx";
import { downloadTrailMap, type FeaturedTrail, type Trail, type TrailMapData, type UsgsTrail } from "./trail-catalog.ts";
import { usgsTopoImage } from "./usgs-trails.ts";

const milesFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function TrailDetails({ trail, saved, online, saving, ready, backLabel, error, back, openMap, download }: {
  trail: Trail;
  saved?: TrailMapData;
  online: boolean;
  saving: boolean;
  ready: boolean;
  backLabel: string;
  error: string;
  back: () => void;
  openMap: () => void;
  download: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  const facts = trail.format === "usgs-topo" ? trail.facts : undefined;
  // Older offline maps store the distance and agency in the display string.
  const [mappedDistance, previousAgency] = trail.details.split(" · ");
  const formattedMiles = facts?.distanceMiles === undefined ? undefined : milesFormat.format(facts.distanceMiles);
  const distance = trail.format !== "usgs-topo" ? trail.distance
    : formattedMiles ? `${formattedMiles === "0" ? "<0.01" : formattedMiles} mi`
    : mappedDistance.endsWith(" mapped") ? mappedDistance.replace(/ mapped$/, "") : "Unavailable";
  const agencies = facts?.agencies?.join(", ") || previousAgency;
  const featured = trail.format !== "usgs-topo" ? trail : undefined;
  const stats = [
    { label: featured ? "Distance" : "Mapped distance", value: distance, icon: Ruler },
    { label: "Elevation gain", value: featured?.elevationGain ?? "Unavailable", icon: Mountain },
    ...(featured ? [
      { label: "Route type", value: featured.routeType, icon: Route },
      { label: "Difficulty", value: featured.difficulty, icon: Signal },
      { label: "Typical time", value: featured.duration, icon: Clock },
    ] : []),
  ];

  return (
    <article className="trail-library trail-details">
      <button type="button" className="text-action back trail-details-back" onClick={back}>
        <ArrowLeft aria-hidden="true" /> {backLabel}
      </button>
      <header className="trail-details-hero">
        <TrailCover trail={trail} online={online} />
        <div className="trail-details-heading">
          <p className="trail-details-location"><MapPin aria-hidden="true" /> {trail.park}</p>
          <h1 ref={title} tabIndex={-1}>{trail.name}</h1>
          <div className="trail-details-action">
            {saved ? (
              <>
                <button type="button" className="primary-action" onClick={openMap}><Map aria-hidden="true" /> Open offline map</button>
                <span className="catalog-ready" role="status">Saved on this device</span>
              </>
            ) : (
              <button type="button" className="primary-action" onClick={download} disabled={!online || !ready || saving}>
                <CloudDownload aria-hidden="true" /> {saving ? "Saving map…" : "Download offline map"}
              </button>
            )}
          </div>
          {!online && !saved && <p className="muted">Reconnect to download this map.</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </header>
      <dl className="trail-details-stats" aria-label="Trail stats">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <dt><Icon aria-hidden="true" /> {label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="trail-details-layout">
        <section className="trail-sheet trail-details-about" aria-labelledby="trail-about">
          <h2 id="trail-about">About this trail</h2>
          {featured ? (
            <>
              <p>{featured.description}</p>
              <h3>Getting there</h3>
              <p>{featured.access}</p>
            </>
          ) : (
            <>
              <p>Distance covers the segments shown on the map. A longer hike may include connecting trails or a return leg.</p>
              <dl className="trail-details-source">
                {facts?.surfaces?.length ? <div><dt>Reported surface</dt><dd>{facts.surfaces.join(", ")}</dd></div> : null}
                {facts?.uses?.length ? <div><dt>Reported uses</dt><dd>{facts.uses.join(", ")}</dd></div> : null}
                {facts?.trailNumbers?.length ? <div><dt>Trail number</dt><dd>{facts.trailNumbers.join(", ")}</dd></div> : null}
                {agencies && <div><dt>Data provided by</dt><dd>{agencies}</dd></div>}
              </dl>
            </>
          )}
          <a className="park-details" href={trail.info} target="_blank" rel="noreferrer">
            {featured ? "Official park trail page" : "USGS Trails Explorer"} <ArrowUpRight aria-hidden="true" />
          </a>
        </section>
        <section className="trail-sheet trail-details-map" aria-labelledby="trail-preview">
          <h2 id="trail-preview">Route preview</h2>
          {saved ? <OfflineTrailMap trail={trail} map={saved} />
            : trail.format === "usgs-topo" ? <UsgsRoutePreview trail={trail} online={online} />
              : <FeaturedRoutePreview trail={trail} />}
        </section>
      </div>
    </article>
  );
}

function FeaturedRoutePreview({ trail }: { trail: FeaturedTrail }) {
  const [map, setMap] = useState<TrailMapData>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void downloadTrailMap(trail, controller.signal).then((data) => {
      if (!controller.signal.aborted) setMap(data);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [trail]);
  if (map) return <OfflineTrailMap trail={trail} map={map} />;
  return <p className="muted" role="status">{failed ? "Route preview unavailable." : "Loading route preview…"}</p>;
}

const previewSize = 560;

function UsgsRoutePreview({ trail, online }: { trail: UsgsTrail; online: boolean }) {
  const extent = useMemo(() => squareTrailExtent(trail.lines), [trail.lines]);
  const basemap = usgsTopoImage(extent, previewSize);
  return (
    <figure className="trail-route-preview">
      <TopoOverlay lines={trail.lines} extent={extent} width={previewSize} height={previewSize}
        url={online ? basemap : undefined} label={`Route preview for ${trail.name}. The blue line marks the mapped trail. North is up.`}>
        <text x="522" y="35" textAnchor="middle">N</text>
        <path d="M522 69V45m-9 9 9-9 9 9" className="park-north-arrow" />
      </TopoOverlay>
      <figcaption className="map-key"><a href={trail.info} target="_blank" rel="noreferrer">Map and trail data from USGS</a></figcaption>
    </figure>
  );
}
