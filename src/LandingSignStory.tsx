import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { TopoOverlay } from "./OfflineTrailMap.tsx";
import { mapPoint } from "./map-projection.ts";
import { rampartMap, rampartPhoto, rampartPhotoSource, rampartTrips, rampartUrl } from "./rampart-junction.ts";
import { nationalMap } from "./usgs-trails.ts";

const { extent, lines, junction, url, size } = rampartMap;
const [longmireRoute] = rampartTrips[1].lines;
const point = (location: typeof junction) => mapPoint(location, extent, size, size);
const routePath = longmireRoute.map((location) => point(location).join(",")).join(" ");
const [startX, startY] = point(junction);
const [endX, endY] = point(longmireRoute.at(-1)!);

export function LandingSignStory() {
  const story = useRef<HTMLElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  const map = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const section = story.current;
    const track = steps.current;
    const last = map.current;
    if (!section || !track || !last) return;
    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const draw = () => {
      frame = 0;
      if (!motion.matches) return;
      const height = window.innerHeight;
      const area = track.getBoundingClientRect();
      const end = last.getBoundingClientRect();
      const railTravel = Math.min(area.height, height * .62 + area.height * .3);
      const branchTravel = Math.min(end.height * .75, height * .45);
      section.style.setProperty("--story-progress", String(clamp((height * .86 - area.top) / railTravel)));
      section.style.setProperty("--branch-progress", String(clamp((height * .85 - end.top) / branchTravel)));
      section.setAttribute("data-scroll-ready", "");
    };
    function schedule() {
      if (motion.matches && !frame) frame = window.requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <section className="landing-sign-story" ref={story} aria-labelledby="landing-sign-title">
      <header>
        <div>
          <p className="public-kicker">Rampart Ridge Junction · Mount Rainier</p>
          <h2 id="landing-sign-title">One sign. Two ways to Longmire.</h2>
        </div>
        <a href={rampartUrl} className="public-button">Try the junction <ArrowUpRight aria-hidden="true" /></a>
      </header>
      <ol className="landing-story-steps" ref={steps}>
        <li>
          <div className="landing-story-art landing-story-photo">
            <img src={rampartPhoto} alt="Two trail sign panels at Rampart Ridge Junction" loading="lazy" />
          </div>
          <h3>See the sign</h3>
          <p>Both panels point to Longmire, at different distances.</p>
          <a href={rampartPhotoSource}>National Park Service photo</a>
        </li>
        <li>
          <div className="landing-story-art landing-story-reading">
            <div><strong>Longmire</strong><span>2.0 mi <span className="screen-reader-only">right</span></span><ArrowRight aria-hidden="true" /></div>
            <div><strong>Longmire</strong><span>3.0 mi <span className="screen-reader-only">left</span></span><ArrowLeft aria-hidden="true" /></div>
          </div>
          <h3>Read the arrows</h3>
          <p>Gemini extracts the two distances and their arrows for you to check.</p>
        </li>
        <li ref={map}>
          <div className="landing-story-art landing-story-map">
            <TopoOverlay lines={lines} extent={extent} width={size} height={size} url={url}
              label="USGS map highlighting the Wonderland Trail from Rampart Ridge Junction to Longmire">
              <polyline className="park-route-halo landing-story-branch" points={routePath} pathLength={1} />
              <polyline className="rampart-highlight landing-story-branch" points={routePath} pathLength={1} />
              <circle className="park-route-end park-place-matched" cx={startX} cy={startY} r="15" />
              <circle className="park-route-end park-destination" cx={endX} cy={endY} r="15" />
            </TopoOverlay>
          </div>
          <h3>Find the branch</h3>
          <p>Apply the reading to trace the 2.0 mi route on the saved map.</p>
          <a href={nationalMap}>USGS Topo map</a>
        </li>
      </ol>
    </section>
  );
}
