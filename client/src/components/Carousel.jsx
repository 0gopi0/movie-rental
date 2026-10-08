import { useCallback, useEffect, useRef, useState } from 'react';
import MovieCard, { MovieCardSkeleton } from './MovieCard.jsx';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// One horizontally scrollable row of poster cards. Native overflow scrolling gives touch/swipe
// and trackpad support; CSS scroll-snap aligns cards; the arrow buttons page by ~one screen.
// `movies === null` renders skeleton cards.
export default function Carousel({ title, movies }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    updateEdges();
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, movies]);

  const page = (dir) => {
    const el = trackRef.current;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const headingId = `row-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="carousel" aria-labelledby={headingId}>
      <div className="carousel-head">
        <h2 id={headingId} className="carousel-title">{title}</h2>
        <div className="carousel-arrows">
          <button type="button" className="carousel-arrow" onClick={() => page(-1)} disabled={edges.start} aria-label={`Scroll ${title} left`}>‹</button>
          <button type="button" className="carousel-arrow" onClick={() => page(1)} disabled={edges.end} aria-label={`Scroll ${title} right`}>›</button>
        </div>
      </div>
      <ul className="carousel-track" ref={trackRef} onScroll={updateEdges} aria-busy={!movies}>
        {movies
          ? movies.map((m) => <li key={m.id}><MovieCard movie={m} /></li>)
          : Array.from({ length: 6 }, (_, i) => <li key={i}><MovieCardSkeleton /></li>)}
      </ul>
    </section>
  );
}
