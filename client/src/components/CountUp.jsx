import { useEffect, useState, useRef } from 'react';

export default function CountUp({ target, duration = 1000, prefix = '', suffix = '', decimals = 0 }) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    startTime.current = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (target - startValue) * eased;

      setValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return <>{prefix}{value.toFixed(decimals)}{suffix}</>;
}
