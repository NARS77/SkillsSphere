import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 800, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  // Handle display formatted to float/integer
  const isFloat = value % 1 !== 0;
  const displayValue = isFloat ? count.toFixed(1) : count;

  return <span>{displayValue}{suffix}</span>;
};
