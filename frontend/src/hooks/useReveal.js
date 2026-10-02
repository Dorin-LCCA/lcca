import { useEffect, useRef, useState } from "react";

// Adds .in-view when element scrolls into view, for CSS reveal animations.
export default function useReveal(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.12, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line
  return [ref, inView];
}
