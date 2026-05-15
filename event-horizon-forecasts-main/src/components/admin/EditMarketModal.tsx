import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Market = {
  id: string;
  question: string;
  category: string;
  status: "draft" | "active" | "closed" | "resolved";
  yesPool: number;
  noPool: number;
  totalPool: number;
  participants: number;
  yesPrice: number;
  noPrice: number;
  closeTime: string;
  createdAt: string;
};

type EditMarketModalProps = {
  open: boolean;
  onClose: () => void;
  market: Market;
  onSubmit: (data: any) => void;
};

const CATEGORIES = [
  "Finance",
  "Politics",
  "Entertainment",
  "Economy",
  "Technology",
  "Sports",
  "Others"
];

export const EditMarketModal = ({ open, onClose, market, onSubmit }: EditMarketModalProps) => {
  const [formData, setFormData] = useState({
    question: market.question,
    category: market.category,
    status: market.status,
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
  });

  useEffect(() => {
    setFormData({
      question: market.question,
      category: market.category,
      status: market.status,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
    });
  }, [market]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-adjust probabilities
    if (field === "yesPrice") {
      const yesPrice = Math.max(1, Math.min(99, Number(value)));
      setFormData(prev => ({
        ...prev,
        yesPrice,
        noPrice: 100 - yesPrice
      }));
    } else if (field === "noPrice") {
      const noPrice = Math.max(1, Math.min(99, Number(value)));
      setFormData(prev => ({
        ...prev,
        noPrice,
        yesPrice: 100 - noPrice
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: market.id,
      ...formData,
    });
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
            <div>
              <h2 className="text-xl font-bold text-charcoal">Edit Market</h2>
              <p className="text-xs text-graphite mt-0.5">ID: {market.id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/10 transition-fast"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Market Stats (Read-only) */}
            <div className="bg-graphite/5 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-bold text-charcoal mb-3">Market Statistics</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-graphite">Total Pool</div>
                  <div className="text-lg font-bold text-charcoal">₦{(market.totalPool / 1000).toFixed(1)}K</div>
                </div>
                <div>
                  <div className="text-xs text-graphite">Participants</div>
                  <div className="text-lg font-bold text-charcoal">{market.participants}</div>
                </div>
                <div>
                  <div className="text-xs text-graphite">Created</div>
                  <div className="text-lg font-bold text-charcoal">{new Date(market.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Market Question */}
            <div>
              <Label htmlFor="question">Market Question</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => handleChange("question", e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
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

            {/* Manual Price Adjustment */}
            <div>
              <h3 className="text-sm font-bold text-charcoal mb-3">Manual Price Adjustment</h3>
              <p className="text-xs text-graphite mb-3">
                Adjust market probabilities manually. This will override the pool-based pricing.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yesPrice">YES Probability (%)</Label>
                  <Input
                    id="yesPrice"
                    type="number"
                    min="1"
                    max="99"
                    value={formData.yesPrice}
                    onChange={(e) => handleChange("yesPrice", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="noPrice">NO Probability (%)</Label>
                  <Input
                    id="noPrice"
                    type="number"
                    min="1"
                    max="99"
                    value={formData.noPrice}
                    onChange={(e) => handleChange("noPrice", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-purple"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="resolved">Resolved</option>
              </select>
              <p className="text-xs text-graphite mt-1">
                {formData.status === "draft" && "Market is hidden from users"}
                {formData.status === "active" && "Market is live and accepting forecasts"}
                {formData.status === "closed" && "Market is closed, no new forecasts"}
                {formData.status === "resolved" && "Market has been resolved"}
              </p>
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
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
