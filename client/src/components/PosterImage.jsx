import { useEffect, useState } from 'react';

// Shown when there is no poster at all, or both the remote image and the local SVG fail.
const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="#0F2A4D"/><text x="100" y="160" font-size="48" text-anchor="middle" fill="#5B7BA3">🎬</text></svg>');

// Poster from the TMDB image CDN; swaps to the local SVG once if the remote image fails to load.
export default function PosterImage({ src, fallback, alt = '', ...rest }) {
  const [current, setCurrent] = useState(src || fallback || PLACEHOLDER);
  useEffect(() => setCurrent(src || fallback || PLACEHOLDER), [src, fallback]);

  const onError = () => {
    if (fallback && current !== fallback) setCurrent(fallback);
    else if (current !== PLACEHOLDER) setCurrent(PLACEHOLDER);
  };
  return <img src={current} alt={alt} onError={onError} {...rest} />;
}
