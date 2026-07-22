import { useEffect, useRef, useState } from "react";
import { classNames } from "./utils";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function PaginatedList<T>({
  items,
  pageSize,
  renderItem,
  emptyMessage = "No items.",
}: {
  items: T[];
  pageSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
}) {
  const [page, setPage] = useState(1);
  const visible = items.slice(0, page * pageSize);
  const hasMore = visible.length < items.length;

  return (
    <div className="space-y-2">
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        visible.map((item, i) => (
          <div key={i}>{renderItem(item, i)}</div>
        ))
      )}
      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
          >
            Load More ({items.length - visible.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(stored));
    } catch {}
  }, [key, stored]);

  return [stored, setStored];
}

export function LazyLoad({
  children,
  placeholder,
  className = "",
}: {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {visible ? children : placeholder ?? <div className="h-24 animate-pulse rounded-xl bg-gray-100" />}
    </div>
  );
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}
