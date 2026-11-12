import { ArrowUpRight, Compass, Map, Mountain, Play, Signpost } from "lucide-react";

export function PublicHeader({ label }: { label?: string }) {
  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="Trail Junction home">
        <span><Mountain aria-hidden="true" /></span> Trail Junction
      </a>
      {label && <span className="public-kicker">{label}</span>}
    </header>
  );
}

export function Landing() {
  return (
    <div className="public-page landing">
      <PublicHeader />
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="public-kicker"><span className="landing-dot" />Offline trail maps</p>
            <h1>Go beyond<br /><em>the signal.</em></h1>
            <p>Find a trail, download its map, and take it with you when cell service drops.</p>
            <div className="landing-actions">
              <a className="public-button" href="/app">Open trail app <ArrowUpRight aria-hidden="true" /></a>
              <a className="public-button landing-demo-link" href="/demo"><Play aria-hidden="true" /> Try sign demo</a>
            </div>
          </div>
          <span className="landing-legend" aria-hidden="true"><Compass /> Illustrated terrain</span>
        </section>
        <div className="landing-paths">
          <article>
            <span className="landing-icon"><Map aria-hidden="true" /></span>
            <div>
              <h2>Find and save real trails</h2>
              <p>Search Yosemite and Zion trails and download a map to open offline.</p>
            </div>
          </article>
          <article>
            <span className="landing-icon"><Signpost aria-hidden="true" /></span>
            <div>
              <h2>See how sign reading works</h2>
              <p>Try a sample sign at Fern Fork and see which branch leads to your destination.</p>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
