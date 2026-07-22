import { Shield, Info } from "lucide-react";
import { LearnSheet } from "@/components/LearnSheet";

interface ProtectedMarketInfoProps {
  isOpen: boolean;
  onClose: () => void;
  activation?: {
    progress: number;
    totalPool: number;
    requirements: {
      totalPool: number;
      protectedMaxStake: number;
    };
  };
}

export const ProtectedMarketInfo = ({
  isOpen,
  onClose,
  activation,
}: ProtectedMarketInfoProps) => (
  <LearnSheet
    isOpen={isOpen}
    onClose={onClose}
    title="Refund Protected"
    subtitle="How it works"
    icon={<Shield className="h-5 w-5 text-[#4F46E5]" />}
    intro={"A \"Refund Protected\" market is new and building momentum. Your stake is safe \u2014 if the market doesn\u2019t reach enough activity before closing, you\u2019ll get a full refund."}
    items={[
      {
        title: "Zero risk",
        description: "If the market stays below the activity threshold, your stake is returned in full to your wallet.",
      },
      {
        title: "Early advantage",
        description: "Get in before the market goes live and crowd view shifts. Protected markets lock in early prices.",
      },
      {
        title: "Stake cap",
        description: `Protected markets limit individual stakes to keep things fair. The maximum is ${activation ? `₦${activation.requirements.protectedMaxStake.toLocaleString()}` : "a set amount"} per user until the market activates.`,
      },
    ]}
    example={{
      label: "Example",
      body: "You back YES with ₦500 in a Protected market. If the total pool doesn't reach the activation threshold before closing, your full ₦500 is refunded. If it does activate, your position works like any normal market.",
    }}
    footer={
      activation ? (
        <div className="rounded-xl border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[#6B7280]">Activation progress</span>
            <span className="font-bold text-[#4F46E5]">
              {Math.round(activation.progress)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
            <div
              className="h-full rounded-full bg-[#4F46E5] transition-all duration-500"
              style={{ width: `${activation.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            ₦{activation.totalPool.toLocaleString()} / ₦{activation.requirements.totalPool.toLocaleString()}{" "}
            pool activity needed
          </p>
        </div>
      ) : undefined
    }
  />
);

export const ProtectedMarketTooltip = ({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      e.preventDefault();
      onClick();
    }}
    className={`inline-flex items-center gap-1 rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5] transition hover:bg-[#4F46E5]/15 ${className}`}
    aria-label="Learn about Refund Protected markets"
  >
    <Shield className="h-3 w-3" />
    Protected
    <Info className="h-3 w-3 opacity-60" />
  </button>
);
