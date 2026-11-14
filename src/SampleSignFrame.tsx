export function SampleSignFrame({ src, alt, framing }: {
  src: string;
  alt: string;
  framing?: boolean;
}) {
  return <figure className="sample-sign-frame">
    <img src={src} alt={alt} />
    <figcaption>{framing ? "Simulated viewfinder" : "Captured sample photo"}</figcaption>
    {framing && <div className="sample-sign-guides" aria-hidden="true"><span /><span /><span /><span /></div>}
  </figure>;
}
