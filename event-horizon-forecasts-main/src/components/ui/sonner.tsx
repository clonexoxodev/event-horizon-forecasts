import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border-[#E5E7EB] group-[.toaster]:bg-white group-[.toaster]:text-[#101828] group-[.toaster]:shadow-[0_18px_60px_rgba(16,24,40,0.16)]",
          description: "group-[.toast]:text-[#475467]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-[#F3F4F6] group-[.toast]:text-[#344054]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
