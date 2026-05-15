import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
};

export const AnimatedNumber = ({ 
  value, 
  duration = 500, 
  className = "", 
  suffix = "",
  prefix = ""
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    if (startValue !== endValue) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = Math.round(displayValue);

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};
