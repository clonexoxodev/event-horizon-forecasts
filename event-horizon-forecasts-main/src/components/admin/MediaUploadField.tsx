import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api";

export const MediaUploadField = ({
  label,
  hint,
  value,
  onChange,
  required,
  error,
  disabled,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Image must be under 30MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await apiService.uploadAdminMarketMedia(file, "image");
      onChange(result.url);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-bold text-gray-700">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      {value && !disabled ? (
        <div className="relative mt-1.5 overflow-hidden rounded-xl border border-gray-200">
          <img src={value} alt="Uploaded banner" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-gray-700 shadow transition hover:bg-white"
            aria-label="Remove uploaded image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : value ? (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200">
          <img src={value} alt="Uploaded banner" className="h-40 w-full object-cover" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-semibold text-gray-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {uploading ? "Uploading..." : disabled ? "No banner image" : "Upload banner image"}
        </button>
      )}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};