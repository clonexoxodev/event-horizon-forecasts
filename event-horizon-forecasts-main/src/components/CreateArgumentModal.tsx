import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import apiService, { type ApiMarket, type NormalizedFixture } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatStake } from "@/lib/football";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Format = "1v1" | "group" | "unlimited";

const FORMATS: { key: Format; label: string; hint: string }[] = [
  { key: "1v1", label: "1v1", hint: "You plus one opponent" },
  { key: "group", label: "Group", hint: "Up to 10 people" },
  { key: "unlimited", label: "Unlimited", hint: "Open to everyone" },
];

type Suggestion = { question: string; condition: string; label?: string };

export const CreateArgumentModal = ({
  fixture,
  open,
  onOpenChange,
  onCreated,
}: {
  fixture: NormalizedFixture;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (marketId: string) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [condition, setCondition] = useState<string>("");
  const [format, setFormat] = useState<Format>("1v1");
  const [groupLimit, setGroupLimit] = useState(10);
  const [stake, setStake] = useState("2,000");
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [opinion, setOpinion] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuestion("");
    setCondition("");
    setFormat("1v1");
    setSide("YES");
    setOpinion("");
    setError(null);
    setSuggestions([]);
    const load = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await apiService.suggestQuestions(fixture.id);
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    load();
  }, [open, fixture.id]);

  const stakeNumber = Math.round(Number(stake.replace(/,/g, "")) || 0);

  const handleSubmit = async () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/football/${fixture.id}` } } });
      return;
    }
    if (question.trim().length < 5) {
      setError("Describe your argument in at least a few words.");
      return;
    }
    if (stakeNumber < 1) {
      setError("Stake must be at least ₦1.");
      return;
    }
    if (stakeNumber > (user.balance ?? 0)) {
      setError("Your stake cannot exceed your available wallet balance.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiService.createArgument({
        question: question.trim(),
        fixture_id: fixture.id,
        participation_format: format,
        ...(condition ? { condition } : {}),
        ...(format === "group" ? { participant_limit: groupLimit } : {}),
        stake_amount_smallest_unit: stakeNumber * 100,
        currency: "NGN",
      });
      if (!created.market?.id) throw new Error("Could not create the argument.");
      try {
        await apiService.placePrediction(created.market.id, {
          side,
          amount: stakeNumber,
          currency: "NGN",
          ...(opinion.trim() ? { opinion: opinion.trim() } : {}),
        });
      } catch (err: any) {
        // Position failed but the argument exists — surface it and move on.
        onOpenChange(false);
        onCreated(created.market.id);
        return;
      }
      onOpenChange(false);
      onCreated(created.market.id);
    } catch (err: any) {
      setError(err?.message || "Could not create the argument.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Start an Argument</DialogTitle>
          <DialogDescription>
            {fixture.home?.name} vs {fixture.away?.name} — make a claim and back it with a stake.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-xs text-flippe-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking of arguments for this match…
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-flippe-accent">
                <Sparkles className="h-3 w-3" />
                Suggested arguments
              </div>
              {suggestions.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuestion(s.question);
                    setCondition(s.condition);
                  }}
                  className={cn(
                    "block w-full rounded-xl border border-flippe-border bg-flippe-surface-2 px-3 py-2.5 text-left text-[13px] font-medium text-flippe-text transition-all duration-200 hover:border-flippe-accent/40 hover:bg-flippe-surface-2/70",
                    question === s.question && "border-flippe-accent/50 bg-flippe-accent/5"
                  )}
                >
                  {s.question}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="arg-question">Your argument</Label>
            <Textarea
              id="arg-question"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (condition) setCondition("");
              }}
              placeholder="e.g. Lagos FC will score at least 2 goals"
              maxLength={160}
              rows={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Who can join?</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormat(f.key)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-left transition-all duration-200",
                    format === f.key
                      ? "border-flippe-accent/50 bg-flippe-accent/10"
                      : "border-flippe-border bg-flippe-surface-2 hover:border-flippe-accent/30"
                  )}
                >
                  <div className={cn("text-[13px] font-bold", format === f.key ? "text-flippe-accent" : "text-flippe-text")}>
                    {f.label}
                  </div>
                  <div className="text-[10px] text-flippe-muted">{f.hint}</div>
                </button>
              ))}
            </div>
            {format === "group" && (
              <div className="mt-1 flex items-center gap-2">
                <Label htmlFor="arg-group-limit" className="shrink-0 text-xs text-flippe-muted">Participant limit</Label>
                <Input
                  id="arg-group-limit"
                  type="number"
                  min={3}
                  max={100}
                  value={groupLimit}
                  onChange={(e) => setGroupLimit(Math.max(3, Math.min(100, Number(e.target.value) || 10)))}
                  className="h-8 w-24"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="arg-stake">Your stake (NGN)</Label>
              <Input
                id="arg-stake"
                value={stake}
                onChange={(e) => setStake(e.target.value.replace(/[^\d,]/g, ""))}
                inputMode="numeric"
                placeholder="2,000"
              />
              {user && (
                <p className="text-[10px] text-flippe-muted">
                  Balance {formatStake(user.balance ?? 0)}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Your side</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide("YES")}
                  className={cn(
                    "h-9 rounded-xl border text-[13px] font-bold transition-all duration-200",
                    side === "YES"
                      ? "border-flippe-accent/50 bg-flippe-accent/10 text-flippe-accent"
                      : "border-flippe-border bg-flippe-surface-2 text-flippe-muted"
                  )}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setSide("NO")}
                  className={cn(
                    "h-9 rounded-xl border text-[13px] font-bold transition-all duration-200",
                    side === "NO"
                      ? "border-coral/50 bg-coral/10 text-coral"
                      : "border-flippe-border bg-flippe-surface-2 text-flippe-muted"
                  )}
                >
                  NO
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="arg-opinion">Why do you think so? <span className="font-normal text-flippe-muted">(optional)</span></Label>
            <Textarea
              id="arg-opinion"
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder="Share the reasoning behind your side"
              rows={2}
              maxLength={500}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-flippe-accent text-flippe-onaccent hover:bg-flippe-accent-strong"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : user ? (
              `Back ${side} with ${stakeNumber.toLocaleString("en-NG")} NGN`
            ) : (
              "Sign in to start"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};