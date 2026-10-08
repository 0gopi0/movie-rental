import { useEffect, useState } from 'react';

// Poster from the TMDB image CDN; swaps to the local SVG once if the remote image fails to load.
export default function PosterImage({ src, fallback, alt = '', ...rest }) {
  const [current, setCurrent] = useState(src || fallback);
  useEffect(() => setCurrent(src || fallback), [src, fallback]);

  const onError = () => {
    if (fallback && current !== fallback) setCurrent(fallback);
  };
  return <img src={current} alt={alt} onError={onError} {...rest} />;
}
