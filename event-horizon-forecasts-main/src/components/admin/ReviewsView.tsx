import { useCallback, useEffect, useState } from "react";
import { Inbox, CheckCircle2, XCircle, Loader2, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import apiService, { type ApiRequestError } from "@/lib/api";
import { getCategoryLabel } from "@/lib/categories";
import { classNames } from "./utils";

type ReviewRecord = {
  id: string;
  marketId: string;
  question: string;
  category: string;
  status: string;
  rejectionReason?: string | null;
  createdBy?: string;
  submittedAt?: string;
};

type FilterTab = "submitted" | "approved" | "rejected";

const TABS: Array<{ value: FilterTab; label: string }> = [
  { value: "submitted", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const ReviewsView = () => {
  const [tab, setTab] = useState<FilterTab>("submitted");
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

  const load = useCallback(async (status: FilterTab) => {
    setLoading(true);
    try {
      const result = await apiService.getAdminReviews({ status });
      setReviews(result.reviews || []);
    } catch (error) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const handleDecision = async (marketId: string, decision: "approve" | "reject") => {
    if (decision === "reject") {
      const reason = (rejectReason[marketId] || "").trim();
      if (!reason) {
        toast.error("Add a rejection reason first");
        setConfirmReject(marketId);
        return;
      }
    }
    setBusyId(marketId);
    try {
      await apiService.reviewMarket(marketId, decision, decision === "reject" ? (rejectReason[marketId] || "").trim() : undefined);
      toast.success(decision === "approve" ? "Pool approved and is now live" : "Pool rejected");
      setConfirmReject(null);
      await load(tab);
    } catch (error: any) {
      if (error instanceof ApiRequestError) toast.error(error.message);
      else toast.error(error?.message || `Could not ${decision} this pool`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pool Reviews</h1>
          <p className="mt-1 text-sm text-gray-500">Approve or reject pools submitted by users.</p>
        </div>
        <button
          onClick={() => load(tab)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <RefreshCw className={classNames("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={classNames(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              tab === item.value ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gray-100 text-gray-400">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            {tab === "submitted" ? "No pools awaiting review" : tab === "approved" ? "No approved pools" : "No rejected pools"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {tab === "submitted" ? "New submissions will appear here." : "Decisions on user-submitted pools will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Inbox className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {getCategoryLabel(review.category)}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      {review.status === "submitted" ? "Pending" : review.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{review.question}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                Submitted {review.submittedAt ? new Date(review.submittedAt).toLocaleString() : "—"}
              </div>

              {review.status === "rejected" && review.rejectionReason && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                  <span className="font-bold">Reason:</span> {review.rejectionReason}
                </div>
              )}

              {tab === "submitted" && (
                <>
                  {confirmReject === review.marketId && (
                    <div className="mt-3">
                      <label className="text-xs font-bold text-gray-600">Rejection reason</label>
                      <textarea
                        value={rejectReason[review.marketId] || ""}
                        onChange={(e) => setRejectReason((prev) => ({ ...prev, [review.marketId]: e.target.value }))}
                        rows={2}
                        placeholder="e.g. Ambiguous question, resolvable by human judgement only"
                        className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setConfirmReject(null)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDecision(review.marketId, "reject")}
                          disabled={busyId === review.marketId}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {busyId === review.marketId ? "Rejecting..." : "Confirm rejection"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <a
                      href={`/market/${review.marketId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      View pool →
                    </a>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(review.marketId, "reject")}
                        disabled={busyId === review.marketId}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {busyId === review.marketId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Reject
                      </button>
                      <button
                        onClick={() => handleDecision(review.marketId, "approve")}
                        disabled={busyId === review.marketId}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {busyId === review.marketId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsView;