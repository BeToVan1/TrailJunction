import { isCoordinate, normalizeTrailName, type Coordinate } from "./trail-catalog.ts";

export type NearbyPhoto = { url: string; source: string; author: string; license: string; licenseUrl?: string };

type CommonsPage = {
  title: string;
  coordinates?: { lat: number; lon: number }[];
  imageinfo?: {
    mime: string;
    width: number;
    descriptionurl: string;
    thumburl: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
};

const commons = "https://commons.wikimedia.org/w/api.php";
const cache = new Map<string, { expires: number; pages: Promise<CommonsPage[]> }>();
const waiting: (() => void)[] = [];
let activeRequests = 0;
let retryAfter = 0;
const scenery = /\b(trails?|hiking|view|waterfalls?|falls|lakes?|creeks?|canyons?|gorge|forest|woods|mount|mountain|peak|ridge|cliffs?|valley|overlook|beach|coast|meadow|dunes?|reservoir|state (park|reserve)|nature (reserve|preserve))\b/i;
const otherSubject = /\b(aerial|satellite|maps?|diagram|signs?|logo|placard|parking|interior|houses?|kitchen|shelter|tunnel|station|railroad|mural|monument|headstone|grave|portrait|specimen)\b/i;

export function photoSearchCenter(lines: Coordinate[][]): [latitude: string, longitude: string] | undefined {
  const line = lines.reduce<Coordinate[]>((longest, next) => next.length > longest.length ? next : longest, []);
  const point = line[Math.floor(line.length / 2)];
  if (!isCoordinate(point)) return;
  return [point[1].toFixed(2), point[0].toFixed(2)];
}

async function requestArea(params: URLSearchParams): Promise<CommonsPage[]> {
  if (activeRequests >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
  else activeRequests++;

  try {
    if (Date.now() < retryAfter) throw new Error("Photo search unavailable");
    const response = await fetch(`${commons}?${params}`, {
      headers: { "Api-User-Agent": "TrailJunction/0.1 (https://trail-junction.web.app)" },
      signal: AbortSignal.timeout(7000),
    });
    if (response.status === 429) {
      const delay = Number(response.headers.get("Retry-After"));
      retryAfter = Date.now() + (delay > 0 ? delay * 1000 : 60_000);
    }
    if (!response.ok) throw new Error("Photo search unavailable");
    const data = await response.json();
    if (data.error) throw new Error("Photo search unavailable");
    return data.query?.pages ?? [];
  } finally {
    const next = waiting.shift();
    if (next) next();
    else activeRequests--;
  }
}

function fetchArea(latitude: string, longitude: string) {
  const key = `${latitude}|${longitude}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.pages;
  const params = new URLSearchParams({
    action: "query", generator: "geosearch", ggsnamespace: "6", ggscoord: key,
    ggsradius: "3500", ggslimit: "24", prop: "coordinates|imageinfo",
    iiprop: "url|mime|size|extmetadata", iiurlwidth: "330",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Attribution|ImageDescription",
    format: "json", formatversion: "2", origin: "*", maxlag: "5", maxage: "1800", smaxage: "1800",
  });
  const pages = requestArea(params).catch(() => {
    const entry = cache.get(key);
    if (entry?.pages === pages) entry.expires = Math.max(Date.now() + 60_000, retryAfter);
    return [];
  });
  cache.delete(key);
  if (cache.size >= 96) cache.delete(cache.keys().next().value!);
  cache.set(key, { pages, expires: Date.now() + 30 * 60_000 });
  return pages;
}

function plainText(markup = "") {
  const template = document.createElement("template");
  template.innerHTML = markup;
  return (template.content.textContent ?? "").replace(/\s+/g, " ").trim();
}

function trustedUrl(value: string | undefined, hosts: string[]) {
  if (!value) return;
  try {
    const url = new URL(value, commons);
    if (url.protocol === "https:" && hosts.includes(url.hostname)) return url.href;
  } catch {
    return;
  }
}

export async function nearbyTrailPhotos(name: string, latitude: string, longitude: string): Promise<NearbyPhoto[]> {
  const pages = await fetchArea(latitude, longitude);
  const trailName = normalizeTrailName(name).replace(/\b(trail|loop|route)\b/g, "").replace(/\s+/g, " ").trim();
  return pages.flatMap((page) => {
    const info = page.imageinfo?.[0];
    const point = page.coordinates?.[0];
    const title = page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "");
    if (info?.mime !== "image/jpeg" || info.width < 400 || !point || otherSubject.test(title)) return [];

    const description = plainText(info.extmetadata?.ImageDescription?.value);
    const matchingName = trailName.length > 3 && normalizeTrailName(title).includes(trailName);
    const scenicTitle = scenery.test(title);
    if (!scenicTitle && !scenery.test(description)) return [];

    const url = trustedUrl(info.thumburl, ["thumb.wikimedia.org", "upload.wikimedia.org"]);
    const source = trustedUrl(info.descriptionurl, ["commons.wikimedia.org"]);
    const author = plainText(info.extmetadata?.Attribution?.value || info.extmetadata?.Artist?.value);
    const license = plainText(info.extmetadata?.LicenseShortName?.value);
    const licenseUrl = trustedUrl(info.extmetadata?.LicenseUrl?.value, ["creativecommons.org"]);
    const publicDomain = /^(public domain|cc0)$/i.test(license);
    if (!url || !source || !author || author.length > 120) return [];
    if (!publicDomain && (!/^CC BY(?:-SA)? \d\.\d$/i.test(license) || !licenseUrl)) return [];

    // Use local distances to rank photos within the small Wikimedia search radius.
    const distance = 111_000 * Math.hypot(point.lat - Number(latitude),
      (point.lon - Number(longitude)) * Math.cos(Number(latitude) * Math.PI / 180));
    const score = distance - (matchingName ? 2500 : 0) - (scenicTitle ? 900 : 0);
    return [{ score, photo: { url, source, author, license, licenseUrl } }];
  }).sort((a, b) => a.score - b.score).slice(0, 3).map(({ photo }) => photo);
}
