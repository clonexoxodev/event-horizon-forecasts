import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_MARKET_CATEGORIES, normalizeCategory } from "@/lib/categories";

type CreateMarketModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
};

const CATEGORIES = ADMIN_MARKET_CATEGORIES.map((category) => category.value);

const COUNTRIES = [
  "Nigeria",
  "United States",
  "United Kingdom",
  "Global",
  "Others"
];

export const CreateMarketModal = ({ open, onClose, onSubmit }: CreateMarketModalProps) => {
  const [formData, setFormData] = useState({
    question: "",
    category: "Sports",
    country: "Nigeria",
    marketType: "YES/NO",
    yesLabel: "YES",
    noLabel: "NO",
    initialYesProb: 50,
    initialNoProb: 50,
    closeDate: "",
    closeTime: "",
    resolutionSource: "",
    description: "",
    icon: "📊",
    status: "active" as "draft" | "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-adjust probabilities
    if (field === "initialYesProb") {
      const yesProb = Math.max(1, Math.min(99, Number(value)));
      setFormData(prev => ({
        ...prev,
        initialYesProb: yesProb,
        initialNoProb: 100 - yesProb
      }));
    } else if (field === "initialNoProb") {
      const noProb = Math.max(1, Math.min(99, Number(value)));
      setFormData(prev => ({
        ...prev,
        initialNoProb: noProb,
        initialYesProb: 100 - noProb
      }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.question.trim()) newErrors.question = "Market question is required";
    if (!formData.closeDate) newErrors.closeDate = "Close date is required";
    if (!formData.closeTime) newErrors.closeTime = "Close time is required";
    if (!formData.resolutionSource.trim()) newErrors.resolutionSource = "Resolution source is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const closeDateTime = `${formData.closeDate}T${formData.closeTime}:00Z`;
    
    onSubmit({
      ...formData,
      category: normalizeCategory(formData.category),
      closeDateTime,
    });
    
    // Reset form
    setFormData({
      question: "",
      category: "Sports",
      country: "Nigeria",
      marketType: "YES/NO",
      yesLabel: "YES",
      noLabel: "NO",
      initialYesProb: 50,
      initialNoProb: 50,
      closeDate: "",
      closeTime: "",
      resolutionSource: "",
      description: "",
      icon: "📊",
      status: "active",
    });
    setErrors({});
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-card rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border/50 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-charcoal">Create New Market</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/10 transition-fast"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Market Question */}
            <div>
              <Label htmlFor="question">Market Question *</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => handleChange("question", e.target.value)}
                placeholder="Will Bitcoin reach $100,000 by end of 2026?"
                className={errors.question ? "border-coral" : ""}
              />
              {errors.question && <p className="text-xs text-coral mt-1">{errors.question}</p>}
            </div>

            {/* Category & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-purple"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-purple"
                >
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Market Type & Icon */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marketType">Market Type *</Label>
                <select
                  id="marketType"
                  value={formData.marketType}
                  onChange={(e) => handleChange("marketType", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-purple"
                >
                  <option value="YES/NO">YES/NO</option>
                  <option value="UP/DOWN">UP/DOWN</option>
                </select>
              </div>
              <div>
                <Label htmlFor="icon">Market Icon *</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => handleChange("icon", e.target.value)}
                  placeholder="📊"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Option Labels */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yesLabel">Option 1 Label *</Label>
                <Input
                  id="yesLabel"
                  value={formData.yesLabel}
                  onChange={(e) => handleChange("yesLabel", e.target.value)}
                  placeholder="YES"
                />
              </div>
              <div>
                <Label htmlFor="noLabel">Option 2 Label *</Label>
                <Input
                  id="noLabel"
                  value={formData.noLabel}
                  onChange={(e) => handleChange("noLabel", e.target.value)}
                  placeholder="NO"
                />
              </div>
            </div>

            {/* Initial Probabilities */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="initialYesProb">Initial {formData.yesLabel} Probability (%) *</Label>
                <Input
                  id="initialYesProb"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.initialYesProb}
                  onChange={(e) => handleChange("initialYesProb", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="initialNoProb">Initial {formData.noLabel} Probability (%) *</Label>
                <Input
                  id="initialNoProb"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.initialNoProb}
                  onChange={(e) => handleChange("initialNoProb", e.target.value)}
                />
              </div>
            </div>

            {/* Close Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="closeDate">Close Date *</Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => handleChange("closeDate", e.target.value)}
                  className={errors.closeDate ? "border-coral" : ""}
                />
                {errors.closeDate && <p className="text-xs text-coral mt-1">{errors.closeDate}</p>}
              </div>
              <div>
                <Label htmlFor="closeTime">Close Time *</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={formData.closeTime}
                  onChange={(e) => handleChange("closeTime", e.target.value)}
                  className={errors.closeTime ? "border-coral" : ""}
                />
                {errors.closeTime && <p className="text-xs text-coral mt-1">{errors.closeTime}</p>}
              </div>
            </div>

            {/* Resolution Source */}
            <div>
              <Label htmlFor="resolutionSource">Resolution Source *</Label>
              <Input
                id="resolutionSource"
                value={formData.resolutionSource}
                onChange={(e) => handleChange("resolutionSource", e.target.value)}
                placeholder="e.g., CoinMarketCap, Official Website, etc."
                className={errors.resolutionSource ? "border-coral" : ""}
              />
              {errors.resolutionSource && <p className="text-xs text-coral mt-1">{errors.resolutionSource}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Market Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Detailed description of the market and resolution criteria..."
                rows={4}
                className={errors.description ? "border-coral" : ""}
              />
              {errors.description && <p className="text-xs text-coral mt-1">{errors.description}</p>}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-purple"
              >
                <option value="draft">Draft (Not visible to users)</option>
                <option value="active">Active (Publish immediately)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple hover:bg-purple/90 text-white font-semibold"
              >
                Create Market
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
