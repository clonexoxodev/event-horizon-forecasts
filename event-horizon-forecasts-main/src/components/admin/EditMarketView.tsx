import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiService, type AdminMarket, type AdminCreateMarketInput } from "@/lib/api";
import { Card, InputField, SectionHeader, SelectField, SkeletonCard } from "./ui";
import { toDateTimeLocal, getErrorMessage } from "./utils";

const CATEGORIES = [
  { value: "Sports", label: "Sports" },
  { value: "Crypto", label: "Crypto" },
  { value: "Politics", label: "Politics" },
  { value: "Economy", label: "Economy" },
  { value: "Entertainment", label: "Entertainment" },
  { value: "Music", label: "Music" },
  { value: "Technology", label: "Technology" },
  { value: "Business", label: "Business" },
  { value: "Global", label: "Global" },
  { value: "Other", label: "Other" },
];

const READ_ONLY_STATUSES = new Set(["resolved", "refunded"]);

type FormErrors = Record<string, string>;

export const EditMarketView = ({
  marketId,
  onBack,
  onSaved,
}: {
  marketId: string;
  onBack: () => void;
  onSaved: (marketId: string) => void;
}) => {
  const [market, setMarket] = useState<AdminMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [yesLabel, setYesLabel] = useState("Yes");
  const [noLabel, setNoLabel] = useState("No");
  const [closeDate, setCloseDate] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionSource, setResolutionSource] = useState("");
  const [resolutionInstructions, setResolutionInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isTrending, setIsTrending] = useState(false);
  const [protectedMarket, setProtectedMarket] = useState(false);
  const [activationThreshold, setActivationThreshold] = useState("");
  const [maxStakePerUser, setMaxStakePerUser] = useState("");
  const [minYesPool, setMinYesPool] = useState("");
  const [minNoPool, setMinNoPool] = useState("");
  const [minParticipants, setMinParticipants] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAdminMarket(marketId);
      if (!res.market) {
        setError("Market not found.");
        return;
      }
      const m = res.market;
      setMarket(m);
      setQuestion(m.question || "");
      setDescription(m.description || "");
      setCategory(m.category || "");
      setYesLabel(m.yes_label || "Yes");
      setNoLabel(m.no_label || "No");
      setCloseDate(toDateTimeLocal(m.trading_close_at || m.close_date));
      setResolutionDate(toDateTimeLocal(m.resolution_date));
      setResolutionSource(m.resolution_source || "");
      setResolutionInstructions(m.resolution_instructions || "");
      setImageUrl(m.image_url || "");
      setIsTrending(m.is_trending || false);
      setProtectedMarket(m.protected_market_enabled || false);
      setActivationThreshold(
        m.activation_threshold_smallest_unit ? String(m.activation_threshold_smallest_unit / 100) : ""
      );
      setMaxStakePerUser(
        m.protected_max_stake_smallest_unit ? String(m.protected_max_stake_smallest_unit / 100) : ""
      );
      setMinYesPool(
        m.activation_yes_min_smallest_unit ? String(m.activation_yes_min_smallest_unit / 100) : ""
      );
      setMinNoPool(
        m.activation_no_min_smallest_unit ? String(m.activation_no_min_smallest_unit / 100) : ""
      );
      setMinParticipants(
        m.activation_min_participants ? String(m.activation_min_participants) : ""
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const isReadOnly = market ? READ_ONLY_STATUSES.has(market.status) : false;

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!question.trim()) errs.question = "Question is required";
    if (!category) errs.category = "Category is required";
    if (!closeDate) {
      errs.closeDate = "Close date is required";
    } else if (new Date(closeDate) <= new Date()) {
      errs.closeDate = "Close date must be in the future";
    }
    if (!resolutionDate) {
      errs.resolutionDate = "Resolution date is required";
    } else if (closeDate && new Date(resolutionDate) <= new Date(closeDate)) {
      errs.resolutionDate = "Resolution date must be after close date";
    }
    if (protectedMarket) {
      if (!activationThreshold) errs.activationThreshold = "Activation threshold is required";
      if (!maxStakePerUser) errs.maxStakePerUser = "Max stake per trader is required";
      if (!minYesPool) errs.minYesPool = "Min YES pool is required";
      if (!minNoPool) errs.minNoPool = "Min NO pool is required";
      if (!minParticipants) errs.minParticipants = "Min traders is required";
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setServerError("");

    try {
      const payload: Partial<AdminCreateMarketInput> = {
        question: question.trim(),
        description: description.trim(),
        category,
        yes_label: yesLabel || "Yes",
        no_label: noLabel || "No",
        close_date: new Date(closeDate).toISOString(),
        resolution_date: new Date(resolutionDate).toISOString(),
        resolution_source: resolutionSource.trim() || undefined,
        resolution_instructions: resolutionInstructions.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        is_trending: isTrending || undefined,
        protected_market_enabled: protectedMarket || undefined,
        activation_threshold_smallest_unit: protectedMarket && activationThreshold
          ? Number(activationThreshold) * 100
          : undefined,
        protected_max_stake_smallest_unit: protectedMarket && maxStakePerUser
          ? Number(maxStakePerUser) * 100
          : undefined,
        activation_yes_min_smallest_unit: protectedMarket && minYesPool
          ? Number(minYesPool) * 100
          : undefined,
        activation_no_min_smallest_unit: protectedMarket && minNoPool
          ? Number(minNoPool) * 100
          : undefined,
        activation_min_participants: protectedMarket && minParticipants
          ? Number(minParticipants)
          : undefined,
      };

      await apiService.updateAdminMarket(marketId, payload);
      setToast({ type: "success", message: "Market updated successfully." });
      setTimeout(() => onSaved(marketId), 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update market";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Market
        </button>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Market
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error || "Market not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
        >
          ← Back to Market
        </button>
        {isReadOnly && (
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            This market is {market.status} and cannot be edited.
          </span>
        )}
      </div>

      <SectionHeader
        title="Edit Market"
        description={`Editing: ${market.question}`}
      />

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {serverError}
        </div>
      )}

      <Card>
        <SectionHeader title="Basic Details" description="Core market information" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <InputField
              label="Question"
              value={question}
              onChange={setQuestion}
              placeholder="e.g. Will Bitcoin exceed $100k by end of 2025?"
              required
              error={errors.question}
              disabled={isReadOnly}
            />
          </div>
          <div className="md:col-span-2">
            <InputField
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Detailed description of the market..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>
          <SelectField
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES}
            required
          />
          {errors.category && (
            <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.category}</p>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Labels & Media" description="Customize outcome labels and optional media" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="YES Label"
            value={yesLabel}
            onChange={setYesLabel}
            placeholder="Yes"
            disabled={isReadOnly}
          />
          <InputField
            label="NO Label"
            value={noLabel}
            onChange={setNoLabel}
            placeholder="No"
            disabled={isReadOnly}
          />
          <div className="md:col-span-2">
            <InputField
              label="Image URL"
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="https://example.com/image.png"
              hint="Optional banner image for the market"
              disabled={isReadOnly}
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
                disabled={isReadOnly}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700">Mark as Trending</span>
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Dates & Resolution" description="When the market closes and how it resolves" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="Close Date"
            value={closeDate}
            onChange={setCloseDate}
            type="datetime-local"
            required
            error={errors.closeDate}
            disabled={isReadOnly}
          />
          <InputField
            label="Resolution Date"
            value={resolutionDate}
            onChange={setResolutionDate}
            type="datetime-local"
            required
            error={errors.resolutionDate}
            disabled={isReadOnly}
          />
          <InputField
            label="Resolution Source"
            value={resolutionSource}
            onChange={setResolutionSource}
            placeholder="e.g. Reuters, Official data"
            disabled={isReadOnly}
          />
          <div className="md:col-span-2">
            <InputField
              label="Resolution Instructions"
              value={resolutionInstructions}
              onChange={setResolutionInstructions}
              placeholder="How this market will be resolved..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Protected Market"
          description="Configure activation thresholds and stake limits"
        />
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={protectedMarket}
              onChange={(e) => setProtectedMarket(e.target.checked)}
              disabled={isReadOnly}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-gray-700">Enable Protected Market</span>
          </label>
        </div>
        {protectedMarket && (
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Activation Threshold (₦)"
              value={activationThreshold}
              onChange={setActivationThreshold}
              type="number"
              placeholder="e.g. 50000"
              required
              hint="Minimum total pool in Naira to activate market"
              error={errors.activationThreshold}
              disabled={isReadOnly}
            />
            <InputField
              label="Max Stake Per Trader (₦)"
              value={maxStakePerUser}
              onChange={setMaxStakePerUser}
              type="number"
              placeholder="e.g. 10000"
              required
              hint="Maximum amount a single trader can stake"
              error={errors.maxStakePerUser}
              disabled={isReadOnly}
            />
            <InputField
              label="Min YES Pool (₦)"
              value={minYesPool}
              onChange={setMinYesPool}
              type="number"
              placeholder="e.g. 10000"
              required
              hint="Minimum YES side pool in Naira"
              error={errors.minYesPool}
              disabled={isReadOnly}
            />
            <InputField
              label="Min NO Pool (₦)"
              value={minNoPool}
              onChange={setMinNoPool}
              type="number"
              placeholder="e.g. 10000"
              required
              hint="Minimum NO side pool in Naira"
              error={errors.minNoPool}
              disabled={isReadOnly}
            />
            <InputField
              label="Min Traders"
              value={minParticipants}
              onChange={setMinParticipants}
              type="number"
              placeholder="e.g. 10"
              required
              hint="Minimum number of traders to activate"
              error={errors.minParticipants}
              disabled={isReadOnly}
            />
          </div>
        )}
      </Card>

      {!isReadOnly && (
        <div className="flex justify-end gap-3 pb-8">
          <button
            onClick={onBack}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
};
