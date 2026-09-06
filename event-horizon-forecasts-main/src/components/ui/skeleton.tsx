import { cn } from "@/lib/utils";

function Skeleton({ className, shimmer = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn(shimmer ? "soft-shimmer rounded-md" : "animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
