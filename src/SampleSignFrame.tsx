export function SampleSignFrame({ src, alt, framing, portrait = false }: {
  src: string;
  alt: string;
  framing?: boolean;
  portrait?: boolean;
}) {
  return <figure className={`fern-visual fern-photo${portrait ? " sample-sign-portrait" : ""}`}>
    <img src={src} alt={alt} />
    <figcaption>{framing ? "Simulated viewfinder" : "Captured sample photo"}</figcaption>
    {framing && <div className="fern-viewfinder" aria-hidden="true"><span /><span /><span /><span /></div>}
  </figure>;
}
