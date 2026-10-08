import { useEffect, useState } from 'react';

// Shows time left until `to` (ISO string). Calls onExpire once when it hits zero.
export default function Countdown({ to, onExpire, prefix = 'expires in ' }) {
  const target = Date.parse(to);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = target - now;
  useEffect(() => {
    if (left <= 0 && onExpire) onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0]);

  if (left <= 0) return <span className="countdown expired">expired</span>;
  const h = Math.floor(left / 3.6e6);
  const m = Math.floor((left % 3.6e6) / 6e4);
  const s = Math.floor((left % 6e4) / 1000);
  return <span className="countdown">{prefix}{h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}</span>;
}
