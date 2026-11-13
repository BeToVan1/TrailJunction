import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, Compass, Map, Mountain, Play, Signpost } from "lucide-react";
import meadowPhoto from "./journal-meadow.webp";
import squirrelPhoto from "./journal-squirrel.webp";

export function PublicHeader({ label, children }: { label?: string; children?: ReactNode }) {
  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="Trail Junction home">
        <span><Mountain aria-hidden="true" /></span> Trail Junction
      </a>
      {label && <span className="public-kicker">{label}</span>}
      {children}
    </header>
  );
}

export function Landing() {
  return (
    <div className="public-page landing">
      <PublicHeader>
        <a className="landing-journal-nav" href="#trail-journal">
          <BookOpen aria-hidden="true" /> Trail journal
        </a>
      </PublicHeader>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="public-kicker"><span className="landing-dot" />Offline trail maps</p>
            <h1>Go beyond<br /><em>the signal.</em></h1>
            <p>Download trail maps before you lose service, then turn your hike into a photo book.</p>
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
              <p>Search U.S. trails and download a topographic map to open offline.</p>
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
        <section id="trail-journal" className="landing-journal" aria-labelledby="landing-journal-title">
          <div className="landing-journal-copy">
            <p className="public-kicker"><BookOpen aria-hidden="true" /> Trail journal</p>
            <h2 id="landing-journal-title">Keep the hike in a photo book.</h2>
            <p>Log your hikes, write notes, and flip through a photo book with your own captions. Your journal is saved on this device and available offline after you open it online.</p>
            <p>When you’re connected, ask Gemini what plant or animal might be in a photo and save the note alongside it.</p>
            <a className="public-button" href="/app?view=journal">Open journal <ArrowUpRight aria-hidden="true" /></a>
          </div>
          <figure className="landing-journal-preview">
            <div className="landing-album">
              <div className="landing-album-title">
                <span>Cook’s Meadow Loop</span>
                <span>Yosemite National Park</span>
              </div>
              <div className="landing-album-spread">
                <div className="landing-album-page">
                  <img src={meadowPhoto} alt="Golden meadow framed by oak trees and granite cliffs" loading="lazy" />
                  <p>Late light in the meadow</p>
                </div>
                <div className="landing-album-page">
                  <img src={squirrelPhoto} alt="Striped ground squirrel eating on a rock" loading="lazy" />
                  <p>A quiet moment on the trail</p>
                </div>
              </div>
            </div>
            <figcaption>
              Sample photo book · National Park Service photos (<a href="https://www.nps.gov/yose/planyourvisit/fall.htm">meadow</a>, <a href="https://www.nps.gov/yose/learn/nature/mammals.htm">squirrel</a>)
            </figcaption>
          </figure>
        </section>
      </main>
    </div>
  );
}
