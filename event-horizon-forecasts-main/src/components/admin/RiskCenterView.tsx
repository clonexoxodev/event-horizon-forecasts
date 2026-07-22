import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Users, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { Card, MetricCard, Badge, DataTable, Th, Td, SkeletonCard, SectionHeader } from "./ui";
import { classNames, formatNaira } from "./utils";
import type { RiskCenterData } from "./types";

const riskScoreTone = (score: number): "green" | "amber" | "red" => {
  if (score < 30) return "green";
  if (score <= 70) return "amber";
  return "red";
};

const imbalanceBadge = (pct: number): "success" | "warning" | "danger" => {
  const imbalance = Math.abs(pct - 50);
  if (imbalance < 15) return "success";
  if (imbalance <= 30) return "warning";
  return "danger";
};

export const RiskCenterView = () => {
  const [data, setData] = useState<RiskCenterData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAdminRiskCenter();
      setData(res.risk as RiskCenterData);
    } catch {
      toast.error("Failed to load risk data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exposedMarketsCount = data?.exposedMarkets?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Risk Center</h1>
          <p className="mt-0.5 text-sm text-gray-500">Platform exposure and liability overview</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={classNames("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      ) : !data ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="text-sm font-bold text-gray-900">Failed to load risk data</div>
            <p className="mt-1 text-xs text-gray-500">Please try again later.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Shield className="h-4 w-4" />}
              label="Risk Score"
              value={data.riskScore}
              tone={riskScoreTone(data.riskScore)}
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Total Liabilities"
              value={formatNaira(data.totalLiabilities)}
              tone="red"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Potential Payouts"
              value={formatNaira(data.potentialPayouts)}
              tone="amber"
            />
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Exposed Markets"
              value={exposedMarketsCount}
              tone="blue"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <SectionHeader
                title="Top Open Positions"
                description="Largest active positions across the platform"
              />
              {data.topPositions.length === 0 ? (
                <div className="grid min-h-[120px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                  <p className="text-xs text-gray-500">No open positions</p>
                </div>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Trader</Th>
                      <Th>Market</Th>
                      <Th className="text-right">Amount</Th>
                      <Th className="text-right">Risk</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPositions.map((pos, i) => (
                      <tr key={`${pos.user_id}-${pos.market_id}-${i}`} className="transition hover:bg-gray-50">
                        <Td className="font-medium text-gray-900">{pos.username || pos.user_id.slice(0, 8)}</Td>
                        <Td className="max-w-[200px] truncate text-xs text-gray-500">{pos.market_question || pos.market_id}</Td>
                        <Td className="text-right font-semibold">{formatNaira(pos.amount)}</Td>
                        <Td className="text-right">
                          <Badge variant={pos.amount > 1000000 ? "danger" : pos.amount > 500000 ? "warning" : "default"}>
                            {pos.amount > 1000000 ? "High" : pos.amount > 500000 ? "Medium" : "Low"}
                          </Badge>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Most Exposed Markets"
                description="Markets with the highest total exposure"
              />
              {data.exposedMarkets.length === 0 ? (
                <div className="grid min-h-[120px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                  <p className="text-xs text-gray-500">No exposed markets</p>
                </div>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Market</Th>
                      <Th className="text-right">Total Exposure</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.exposedMarkets.map((m) => (
                      <tr key={m.id} className="transition hover:bg-gray-50">
                        <Td className="font-medium text-gray-900 max-w-[300px] truncate">{m.question}</Td>
                        <Td className="text-right font-semibold">{formatNaira(m.total_exposure)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <SectionHeader
                title="Imbalanced Markets"
                description="Markets with one-sided exposure"
              />
              {data.imbalancedMarkets.length === 0 ? (
                <div className="grid min-h-[120px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                  <p className="text-xs text-gray-500">No imbalanced markets</p>
                </div>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Market</Th>
                      <Th className="text-right">YES%</Th>
                      <Th className="text-right">NO%</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.imbalancedMarkets.map((m) => (
                      <tr key={m.id} className="transition hover:bg-gray-50">
                        <Td className="font-medium text-gray-900 max-w-[250px] truncate">{m.question}</Td>
                        <Td className="text-right text-xs font-semibold text-emerald-600">{m.yes_pct.toFixed(1)}%</Td>
                        <Td className="text-right text-xs font-semibold text-red-600">{m.no_pct.toFixed(1)}%</Td>
                        <Td>
                          <Badge variant={imbalanceBadge(m.yes_pct)}>
                            {Math.abs(m.yes_pct - 50) < 15 ? "Balanced" : Math.abs(m.yes_pct - 50) <= 30 ? "Skewed" : "Lopsided"}
                          </Badge>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Top Exposed Traders"
                description="Traders with the highest total exposure"
              />
              {data.topExposedUsers.length === 0 ? (
                <div className="grid min-h-[120px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                  <p className="text-xs text-gray-500">No exposed traders</p>
                </div>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Trader</Th>
                      <Th className="text-right">Total Exposure</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topExposedUsers.map((u) => (
                      <tr key={u.user_id} className="transition hover:bg-gray-50">
                        <Td className="font-medium text-gray-900">{u.username || u.user_id.slice(0, 8)}</Td>
                        <Td className="text-right font-semibold">{formatNaira(u.total_exposure)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
