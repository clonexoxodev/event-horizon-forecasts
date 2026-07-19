import { type MouseEvent, type FocusEvent } from "react";
import {
  CheckCircle,
  Image as ImageIcon,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminMarket } from "@/lib/api";
import {
  ADMIN_MARKET_CATEGORIES,
  normalizeCategory,
} from "@/lib/categories";
import type { MarketForm as MarketFormType, MarketKind } from "./types";
import { emptyForm } from "./types";
import { ShellCard, SectionHeader, Badge, Field, ChecklistItem } from "./ui";
import {
  categoryLabel,
  classNames,
  getDateTimeLocalMin,
  isValidDateTimeLocal,
  labelsForKind,
  statusText,
} from "./utils";

const MarketFormView = ({
  form,
  editingMarket,
  saving,
  onChange,
  onMediaUpload,
  onSave,
  onReset,
}: {
  form: MarketFormType;
  editingMarket: AdminMarket | null;
  saving: boolean;
  onChange: (field: keyof MarketFormType, value: string | number | boolean) => void;
  onMediaUpload: (file: File) => void;
  onSave: () => void;
  onReset: () => void;
}) => {
  const priceSum = Number(form.yes_price) + Number(form.no_price);
  const hasMedia = Boolean(form.image_url || form.video_url);
  const minDateTime = getDateTimeLocalMin();
  const openDateTimePicker = (
    event: MouseEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>
  ) => {
    try {
      event.currentTarget.showPicker?.();
    } catch {
      // Some browsers only allow showPicker during direct user activation.
    }
  };
  const ready =
    form.question.trim() &&
    form.category &&
    isValidDateTimeLocal(form.close_date) &&
    form.rules.trim() &&
    form.resolution_source.trim() &&
    hasMedia &&
    priceSum === 100;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <ShellCard>
        <SectionHeader
          eyebrow={editingMarket ? "Edit market" : "Create market"}
          title="Market details"
          description="Keep the market specific, resolvable, and easy for users to understand."
        />
        <div className="space-y-5 p-6">
          <Field label="Market question" required>
            <Input
              value={form.question}
              onChange={(event) => onChange("question", event.target.value)}
              placeholder="Will Nigeria qualify for the 2026 World Cup?"
              className="border-[#E5E7EB] bg-white text-[#101828]"
            />
          </Field>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Category" required>
              <select
                value={normalizeCategory(form.category)}
                onChange={(event) => onChange("category", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              >
                {ADMIN_MARKET_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Market type">
              <select
                value={form.market_type}
                onChange={(event) =>
                  onChange("market_type", event.target.value as MarketKind)
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              >
                <option>YES/NO</option>
                <option>UP/DOWN</option>
                <option>Bigger/Smaller</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="End date/time" required>
              <input
                type="datetime-local"
                value={form.close_date}
                min={minDateTime}
                required
                onClick={openDateTimePicker}
                onFocus={openDateTimePicker}
                onChange={(event) => onChange("close_date", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            </Field>
            <Field label="Trading close time" hint="Leave blank to close predictions at market end.">
              <input
                type="datetime-local"
                value={form.trading_close_at}
                min={minDateTime}
                max={form.close_date || undefined}
                onClick={openDateTimePicker}
                onFocus={openDateTimePicker}
                onChange={(event) => onChange("trading_close_at", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Starting YES price">
              <Input
                type="number"
                min={1}
                max={99}
                value={form.yes_price}
                onChange={(event) => onChange("yes_price", Number(event.target.value))}
                className="border-[#E5E7EB] bg-white text-[#101828]"
              />
            </Field>
            <Field label="Starting NO price">
              <Input
                type="number"
                min={1}
                max={99}
                value={form.no_price}
                onChange={(event) => onChange("no_price", Number(event.target.value))}
                className="border-[#E5E7EB] bg-white text-[#101828]"
              />
            </Field>
          </div>

          <div
            className={classNames(
              "rounded-xl border px-4 py-3 text-sm font-medium",
              priceSum === 100
                ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5]"
                : "border-red-500/30 bg-red-500/10 text-[#E85D5D]"
            )}
          >
            YES + NO = {priceSum}. Prices must always equal 100.
          </div>

          <Field label="Rules / resolution condition" required>
            <Textarea
              value={form.rules}
              onChange={(event) => onChange("rules", event.target.value)}
              placeholder="Explain exactly what must happen for YES to win and what source will be used."
              className="min-h-32 border-[#E5E7EB] bg-white text-[#101828]"
            />
          </Field>

          <Field label="Resolution source" required>
            <Input
              value={form.resolution_source}
              onChange={(event) => onChange("resolution_source", event.target.value)}
              placeholder="Official FIFA report, exchange rate source, public announcement..."
              className="border-[#E5E7EB] bg-white text-[#101828]"
            />
          </Field>
        </div>
      </ShellCard>

      <div className="space-y-6">
        <ShellCard>
          <SectionHeader title="Controls" description="Limits, media, status, and safety." />
          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum stake (₦)">
                <Input
                  type="number"
                  value={form.min_stake}
                  onChange={(event) => onChange("min_stake", Number(event.target.value))}
                  className="border-[#E5E7EB] bg-white text-[#101828]"
                />
              </Field>
              <Field label="Maximum stake (₦)">
                <Input
                  type="number"
                  value={form.max_stake}
                  onChange={(event) => onChange("max_stake", Number(event.target.value))}
                  className="border-[#E5E7EB] bg-white text-[#101828]"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-4">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-[#101828]">
                <input
                  type="checkbox"
                  checked={form.protected_market_enabled}
                  onChange={(event) => onChange("protected_market_enabled", event.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Enable refund protection
              </label>
              <p className="mt-1.5 text-xs leading-5 text-[#475467]">
                Users can predict immediately. If the activity target is not reached before closing, eligible stakes can be refunded.
              </p>
              {form.protected_market_enabled && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Activity threshold (₦)">
                    <Input
                      type="number"
                      value={form.activation_threshold}
                      onChange={(event) => onChange("activation_threshold", Number(event.target.value))}
                      className="border-[#E5E7EB] bg-white text-[#101828]"
                    />
                  </Field>
                  <Field label="Max stake before live (₦)">
                    <Input
                      type="number"
                      value={form.protected_max_stake}
                      onChange={(event) => onChange("protected_max_stake", Number(event.target.value))}
                      className="border-[#E5E7EB] bg-white text-[#101828]"
                    />
                  </Field>
                  <Field label="YES side minimum (₦)">
                    <Input
                      type="number"
                      value={form.activation_yes_min}
                      onChange={(event) => onChange("activation_yes_min", Number(event.target.value))}
                      className="border-[#E5E7EB] bg-white text-[#101828]"
                    />
                  </Field>
                  <Field label="NO side minimum (₦)">
                    <Input
                      type="number"
                      value={form.activation_no_min}
                      onChange={(event) => onChange("activation_no_min", Number(event.target.value))}
                      className="border-[#E5E7EB] bg-white text-[#101828]"
                    />
                  </Field>
                  <Field label="Minimum participants">
                    <Input
                      type="number"
                      min={1}
                      value={form.activation_min_participants}
                      onChange={(event) => onChange("activation_min_participants", Number(event.target.value))}
                      className="border-[#E5E7EB] bg-white text-[#101828]"
                    />
                  </Field>
                </div>
              )}
            </div>

            <Field label="Media upload" required>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-8 text-sm text-[#667085] transition hover:border-[#4F46E5]/60 hover:text-[#101828]">
                <Upload className="mr-2 h-4 w-4" />
                Upload image or video
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onMediaUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </Field>

            {(form.image_url || form.video_url) && (
              <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                {form.video_url ? (
                  <video src={form.video_url} controls className="h-48 w-full object-cover" />
                ) : (
                  <img src={form.image_url} alt="" className="h-48 w-full object-cover" />
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) => onChange("status", event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </Field>
              <Field label="Trending">
                <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_trending}
                    onChange={(event) => onChange("is_trending", event.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Mark as trending
                </label>
              </Field>
            </div>
          </div>
        </ShellCard>

        <ShellCard>
          <SectionHeader title="User preview" description="Approximate market card before publishing." />
          <div className="p-6">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
              <div className="flex h-44 items-center justify-center bg-[#F3F4F6]">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#667085]">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">Media preview</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge>{categoryLabel(form.category)}</Badge>
                  <Badge tone={form.status === "active" ? "green" : "neutral"}>
                    {statusText(form.status)}
                  </Badge>
                </div>
                <p className="font-semibold leading-snug">
                  {form.question || "Market question appears here"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#EEF2FF] px-3 py-2 text-center text-sm font-semibold text-[#4F46E5]">
                    {form.yes_label} {form.yes_price}
                  </div>
                  <div className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-[#E85D5D]">
                    {form.no_label} {form.no_price}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ShellCard>

        <ShellCard>
          <SectionHeader title="Safety checklist" />
          <div className="space-y-2 px-6 pb-4 pt-5 text-sm">
            <ChecklistItem ok={Boolean(form.question.trim())}>Question is clear</ChecklistItem>
            <ChecklistItem ok={Boolean(form.close_date)}>End date is set</ChecklistItem>
            <ChecklistItem ok={priceSum === 100}>Prices add up to 100</ChecklistItem>
            <ChecklistItem ok={Boolean(form.rules.trim())}>Rules are written</ChecklistItem>
            <ChecklistItem ok={Boolean(form.resolution_source.trim())}>Resolution source is set</ChecklistItem>
            <ChecklistItem ok={hasMedia}>Media is attached</ChecklistItem>
          </div>
          <div className="border-t border-[#E5E7EB] p-6">
            <Button
              className="w-full bg-[#4F46E5] text-[#FFFFFF] hover:bg-[#4338CA]"
              onClick={onSave}
              disabled={saving || !ready}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMarket ? "Save market" : "Review and publish"}
            </Button>
            {editingMarket && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-[#667085] hover:bg-[#F3F4F6] hover:text-[#101828]"
                onClick={onReset}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </ShellCard>
      </div>
    </div>
  );
};

export default MarketFormView;
