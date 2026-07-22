import { useEffect, useState, useCallback } from "react";
import { Flag, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";
import type { FeatureFlag } from "./types";
import { Card, Badge, SectionHeader, SkeletonCard } from "./ui";
import { classNames, formatDateTime } from "./utils";

const CATEGORY_ORDER = ["trading", "finance", "platform", "compliance"];

const CATEGORY_BADGE_VARIANT: Record<string, "info" | "success" | "warning" | "muted"> = {
  trading: "info",
  finance: "success",
  platform: "warning",
  compliance: "muted",
};

function groupByCategory(flags: FeatureFlag[]): Map<string, FeatureFlag[]> {
  const map = new Map<string, FeatureFlag[]>();
  for (const flag of flags) {
    const cat = flag.category || "platform";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(flag);
  }
  const sorted = new Map<string, FeatureFlag[]>();
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) sorted.set(cat, map.get(cat)!);
  }
  for (const [cat, items] of map) {
    if (!sorted.has(cat)) sorted.set(cat, items);
  }
  return sorted;
}

export function FeatureFlagsView() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await apiService.getFeatureFlags();
      setFlags(res.flags || []);
    } catch {
      toast.error("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    const newEnabled = !flag.enabled;
    setToggling(flag.key);

    setFlags((prev) =>
      prev.map((f) => (f.key === flag.key ? { ...f, enabled: newEnabled } : f))
    );

    try {
      await apiService.updateFeatureFlag(flag.key, newEnabled);
      toast.success(`${flag.label} ${newEnabled ? "enabled" : "disabled"}`);
    } catch {
      setFlags((prev) =>
        prev.map((f) => (f.key === flag.key ? { ...f, enabled: !newEnabled } : f))
      );
      toast.error(`Failed to update ${flag.label}`);
    } finally {
      setToggling(null);
    }
  };

  const grouped = groupByCategory(flags);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Feature Flags"
        description="Toggle platform features on and off"
        action={
          <button
            onClick={() => {
              setLoading(true);
              fetchFlags();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
          >
            <RefreshCw className={classNames("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        }
      />

      {loading && flags.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-500">
              <Flag className="h-5 w-5" />
            </div>
            <div className="text-sm font-bold text-gray-900">No feature flags</div>
            <p className="mt-1 text-xs text-gray-500">
              Feature flags will appear here once configured.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, categoryFlags]) => (
            <div key={category}>
              <SectionHeader
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                description={`${categoryFlags.length} flag${categoryFlags.length !== 1 ? "s" : ""}`}
              />
              <Card padding={false}>
                <div className="divide-y divide-gray-100">
                  {categoryFlags.map((flag) => {
                    const isToggling = toggling === flag.key;
                    return (
                      <div
                        key={flag.key}
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">
                              {flag.label}
                            </span>
                            <Badge variant={CATEGORY_BADGE_VARIANT[flag.category] || "default"}>
                              {flag.category}
                            </Badge>
                          </div>
                          {flag.description && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {flag.description}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-gray-400">
                            Updated {formatDateTime(flag.updated_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle(flag)}
                          disabled={isToggling}
                          className={classNames(
                            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50",
                            flag.enabled ? "bg-emerald-500" : "bg-gray-300"
                          )}
                        >
                          <span
                            className={classNames(
                              "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
                              flag.enabled ? "translate-x-6" : "translate-x-1"
                            )}
                          >
                            {isToggling ? (
                              <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
                            ) : flag.enabled ? (
                              <ToggleRight className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-3 w-3 text-gray-400" />
                            )}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
