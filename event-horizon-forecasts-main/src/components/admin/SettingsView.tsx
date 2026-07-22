import { useEffect, useState, useCallback, useMemo } from "react";
import { Settings, Save, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";
import type { PlatformSetting } from "./types";
import { Card, InputField, SelectField, SectionHeader, SkeletonCard } from "./ui";
import { classNames, formatDateTime } from "./utils";

const CATEGORY_ORDER = ["general", "platform", "trading", "finance", "settlement"];

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  platform: "Platform",
  trading: "Trading",
  finance: "Finance",
  settlement: "Settlement",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  general: "Basic platform identity",
  platform: "Platform availability and mode",
  trading: "Trading rules and thresholds",
  finance: "Deposit and withdrawal configuration",
  settlement: "Settlement timing",
};

function groupByCategory(settings: PlatformSetting[]): Map<string, PlatformSetting[]> {
  const map = new Map<string, PlatformSetting[]>();
  for (const s of settings) {
    const cat = s.category || "general";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  const sorted = new Map<string, PlatformSetting[]>();
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) sorted.set(cat, map.get(cat)!);
  }
  for (const [cat, items] of map) {
    if (!sorted.has(cat)) sorted.set(cat, items);
  }
  return sorted;
}

function isBooleanValue(val: any): boolean {
  return typeof val === "boolean";
}

function isNumberValue(val: any): boolean {
  return typeof val === "number";
}

function isStringValue(val: any): boolean {
  return typeof val === "string";
}

export function SettingsView() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiService.getSettings();
      setSettings(res.settings || []);
    } catch {
      toast.error("Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const hasUnsavedChanges = useMemo(() => Object.keys(editedValues).length > 0, [editedValues]);

  const getDisplayValue = (setting: PlatformSetting): any => {
    if (setting.key in editedValues) return editedValues[setting.key];
    return setting.value;
  };

  const handleValueChange = (key: string, originalValue: any, newValue: any) => {
    setEditedValues((prev) => {
      if (newValue === originalValue) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: newValue };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updateSettings(editedValues);
      const count = Object.keys(editedValues).length;
      toast.success(`${count} setting${count !== 1 ? "s" : ""} updated`);
      setEditedValues({});
      setLoading(true);
      await fetchSettings();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedValues({});
  };

  const grouped = groupByCategory(settings);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Platform Settings"
        description="Configure core platform parameters"
        action={
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-[11px] font-semibold text-amber-600">
                Unsaved changes
              </span>
            )}
            <button
              onClick={() => {
                setLoading(true);
                fetchSettings();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
            >
              <RefreshCw className={classNames("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        }
      />

      {loading && settings.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : settings.length === 0 ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-500">
              <Settings className="h-5 w-5" />
            </div>
            <div className="text-sm font-bold text-gray-900">No settings configured</div>
            <p className="mt-1 text-xs text-gray-500">
              Platform settings will appear here once configured.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, categorySettings]) => (
            <div key={category}>
              <SectionHeader
                title={CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                description={CATEGORY_DESCRIPTIONS[category] || `${categorySettings.length} setting${categorySettings.length !== 1 ? "s" : ""}`}
              />
              <Card padding={false}>
                <div className="divide-y divide-gray-100">
                  {categorySettings.map((setting) => {
                    const currentValue = getDisplayValue(setting);
                    const isEdited = setting.key in editedValues;

                    if (isBooleanValue(currentValue) || isBooleanValue(setting.value)) {
                      return (
                        <div
                          key={setting.key}
                          className="flex items-center justify-between gap-4 px-5 py-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">
                                {setting.description || setting.key}
                              </span>
                              {isEdited && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                  modified
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-400">
                              Key: {setting.key} &middot; Updated {formatDateTime(setting.updated_at)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleValueChange(setting.key, setting.value, !currentValue)
                            }
                            className={classNames(
                              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                              currentValue ? "bg-emerald-500" : "bg-gray-300"
                            )}
                          >
                            <span
                              className={classNames(
                                "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
                                currentValue ? "translate-x-6" : "translate-x-1"
                              )}
                            >
                              {currentValue ? (
                                <ToggleRight className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-3 w-3 text-gray-400" />
                              )}
                            </span>
                          </button>
                        </div>
                      );
                    }

                    if (isNumberValue(currentValue) || isNumberValue(setting.value)) {
                      return (
                        <div key={setting.key} className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            {isEdited && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                modified
                              </span>
                            )}
                          </div>
                          <InputField
                            label={setting.description || setting.key}
                            value={String(currentValue ?? "")}
                            onChange={(v) => {
                              const num = v === "" ? "" : Number(v);
                              handleValueChange(setting.key, setting.value, num);
                            }}
                            type="number"
                            hint={`Key: ${setting.key} · Updated ${formatDateTime(setting.updated_at)}`}
                          />
                        </div>
                      );
                    }

                    if (setting.key === "default_currency") {
                      return (
                        <div key={setting.key} className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            {isEdited && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                modified
                              </span>
                            )}
                          </div>
                          <SelectField
                            label={setting.description || setting.key}
                            value={String(currentValue ?? "")}
                            onChange={(v) => handleValueChange(setting.key, setting.value, v)}
                            options={[
                              { value: "NGN", label: "Nigerian Naira (NGN)" },
                              { value: "USD", label: "US Dollar (USD)" },
                            ]}
                          />
                          <p className="mt-1 text-[11px] text-gray-400">
                            Key: {setting.key} · Updated {formatDateTime(setting.updated_at)}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div key={setting.key} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          {isEdited && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                              modified
                            </span>
                          )}
                        </div>
                        <InputField
                          label={setting.description || setting.key}
                          value={String(currentValue ?? "")}
                          onChange={(v) => handleValueChange(setting.key, setting.value, v)}
                          type="text"
                          hint={`Key: ${setting.key} · Updated ${formatDateTime(setting.updated_at)}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-amber-800">
                <span className="font-bold">{Object.keys(editedValues).length}</span> unsaved change
                {Object.keys(editedValues).length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
