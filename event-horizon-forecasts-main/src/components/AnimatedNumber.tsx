import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

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
  prefix = "",
}: AnimatedNumberProps) => {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { duration, bounce: 0 });
  const display = useTransform(spring, (v) => Math.round(v));
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (spanRef.current) spanRef.current.textContent = `${prefix}${v}${suffix}`;
    });
    return unsubscribe;
  }, [display, prefix, suffix]);

  return (
    <motion.span ref={spanRef} className={className}>
      {prefix}{Math.round(value)}{suffix}
    </motion.span>
  );
};
