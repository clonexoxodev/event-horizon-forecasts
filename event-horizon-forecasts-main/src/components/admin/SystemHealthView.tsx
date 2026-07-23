import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";
import type { SystemHealth } from "./types";
import { Card, MetricCard, Badge, SectionHeader, SkeletonCard } from "./ui";
import { classNames } from "./utils";

const SERVICE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  database: { label: "Database", icon: Database },
  settlementEngine: { label: "Settlement Engine", icon: Activity },
  walletService: { label: "Wallet Service", icon: HardDrive },
  paymentGateway: { label: "Payment Gateway", icon: Wifi },
  notifications: { label: "Notifications", icon: Server },
  api: { label: "API", icon: Cpu },
};

const STATUS_BADGE: Record<string, "success" | "warning" | "danger"> = {
  healthy: "success",
  ok: "success",
  up: "success",
  warning: "warning",
  degraded: "warning",
  critical: "danger",
  down: "danger",
  error: "danger",
};

const STATUS_TONE: Record<string, "green" | "amber" | "red"> = {
  healthy: "green",
  ok: "green",
  up: "green",
  warning: "amber",
  degraded: "amber",
  critical: "red",
  down: "red",
  error: "red",
};

const normalizeStatus = (s: string): "success" | "warning" | "danger" =>
  STATUS_BADGE[s?.toLowerCase()] ?? "danger";

const overallStatus = (health: SystemHealth): "success" | "warning" | "danger" => {
  const statuses: string[] = [
    health.database?.status,
    health.matchingEngine?.status,
    health.settlementEngine?.status,
    health.walletService?.status,
    health.paymentGateway?.status,
    health.notifications?.status,
    health.api?.status,
  ];
  if (statuses.some((s) => normalizeStatus(s) === "danger")) return "danger";
  if (statuses.some((s) => normalizeStatus(s) === "warning")) return "warning";
  return "success";
};

const OVERVIEW: Record<"success" | "warning" | "danger", { label: string; color: string; Icon: React.ElementType }> = {
  success: { label: "All Systems Operational", color: "bg-emerald-50 border-emerald-200 text-emerald-700", Icon: CheckCircle },
  warning: { label: "Degraded Performance", color: "bg-amber-50 border-amber-200 text-amber-700", Icon: AlertTriangle },
  danger: { label: "System Outage Detected", color: "bg-red-50 border-red-200 text-red-700", Icon: XCircle },
};

export function SystemHealthView() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiService.getSystemHealth();
      setHealth(res.health);
      setLastRefresh(new Date());
    } catch {
      toast.error("Failed to fetch system health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const ov = health ? overallStatus(health) : null;
  const ovConfig = ov ? OVERVIEW[ov] : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="System Health"
        description="Monitor platform service status"
        action={
          <button
            onClick={() => {
              setLoading(true);
              fetchHealth();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
          >
            <RefreshCw className={classNames("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        }
      />

      {loading && !health ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {ovConfig && (
            <div
              className={classNames(
                "flex items-center gap-3 rounded-2xl border p-4",
                ovConfig.color
              )}
            >
              <ovConfig.Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-bold">{ovConfig.label}</span>
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => {
              const service = health?.[key as keyof SystemHealth] as
                | { status: string; latency?: number }
                | undefined;
              if (!service) return null;
              const Icon = cfg.icon;
              const badge = normalizeStatus(service.status);
              const tone = STATUS_TONE[service.status?.toLowerCase()] ?? "red";

              return (
                <Card key={key}>
                  <div className="flex items-start gap-3">
                    <div
                      className={classNames(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        tone === "green" && "bg-emerald-50 text-emerald-600",
                        tone === "amber" && "bg-amber-50 text-amber-600",
                        tone === "red" && "bg-red-50 text-red-600"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-500">{cfg.label}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={badge}>
                          {service.status?.charAt(0).toUpperCase() + service.status?.slice(1)}
                        </Badge>
                      </div>
                      {service.latency != null && (
                        <div className="mt-1 text-[11px] text-gray-400">
                          {service.latency}ms
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {health?.api && (
              <MetricCard
                icon={<Cpu className="h-4 w-4" />}
                label="API Response Time"
                value={`${health.api.responseTime}ms`}
                tone={health.api.responseTime > 500 ? "amber" : "green"}
              />
            )}

            {health?.uptime != null && (
              <MetricCard
                icon={<Activity className="h-4 w-4" />}
                label="System Uptime"
                value={`${(health.uptime / 3600).toFixed(1)}h`}
                tone="green"
              />
            )}
          </div>

          {lastRefresh && (
            <div className="text-center text-[11px] text-gray-400">
              Auto-refreshes every 15s · Last updated {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
