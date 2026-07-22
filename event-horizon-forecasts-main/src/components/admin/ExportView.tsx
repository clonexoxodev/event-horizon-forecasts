import { useState } from "react";
import { Card, SelectField, InputField, SectionHeader, Badge } from "./ui";
import { classNames, formatDateTime } from "./utils";
import apiService from "@/lib/api";
import { toast } from "sonner";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
} from "lucide-react";

type ExportType =
  | "trades"
  | "orders"
  | "markets"
  | "users"
  | "withdrawals"
  | "deposits"
  | "settlements"
  | "audit-logs";

interface ExportOption {
  type: ExportType;
  label: string;
  description: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: "trades",
    label: "Trades",
    description: "All completed trades with prices and volumes",
  },
  {
    type: "orders",
    label: "Orders",
    description: "All placed orders with statuses",
  },
  {
    type: "markets",
    label: "Markets",
    description: "All markets with metadata",
  },
  {
    type: "users",
    label: "Users",
    description: "All registered users",
  },
  {
    type: "withdrawals",
    label: "Withdrawals",
    description: "All withdrawal requests",
  },
  {
    type: "deposits",
    label: "Deposits",
    description: "All deposit requests",
  },
  {
    type: "settlements",
    label: "Settlements",
    description: "Market settlement records",
  },
  {
    type: "audit-logs",
    label: "Audit Logs",
    description: "Admin audit trail",
  },
];

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSVValue).join(",");
  const rows = data.map((row) =>
    headers.map((h) => escapeCSVValue(row[h])).join(",")
  );
  return [headerRow, ...rows].join("\n");
}

function triggerDownload(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportView() {
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{
    type: ExportType;
    count: number;
    timestamp: Date;
  } | null>(null);

  const selectedOption = EXPORT_OPTIONS.find((o) => o.type === selectedType);

  async function handleExport() {
    if (!selectedType) return;
    setExporting(true);
    try {
      const result = await apiService.exportData(
        selectedType,
        fromDate || undefined,
        toDate || undefined
      );
      const records: Record<string, unknown>[] = Array.isArray(result)
        ? result
        : result?.data ?? [];
      if (records.length === 0) {
        toast.info("No records found for the selected filters.");
        return;
      }
      const csv = convertToCSV(records);
      const dateStamp = new Date().toISOString().slice(0, 10);
      triggerDownload(csv, `${selectedType}-${dateStamp}.csv`);
      setLastExport({
        type: selectedType,
        count: records.length,
        timestamp: new Date(),
      });
      toast.success(`Exported ${records.length} records successfully.`);
    } catch (err) {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Export Center"
        description="Export platform data as CSV files for analysis and reporting."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {EXPORT_OPTIONS.map((option) => (
          <Card
            key={option.type}
            className={classNames(
              "cursor-pointer transition-all hover:border-blue-500",
              selectedType === option.type
                ? "border-blue-500 bg-blue-500/5"
                : ""
            )}
            onClick={() => setSelectedType(option.type)}
          >
            <div className="flex flex-col items-center gap-3 p-4 text-center">
              <FileText className="h-8 w-8 text-slate-400" />
              <div>
                <p className="font-medium text-slate-200">{option.label}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {option.description}
                </p>
              </div>
              {selectedType === option.type ? (
                <Badge variant="info">Selected</Badge>
              ) : (
                <Badge variant="neutral">Select</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedOption && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <h3 className="font-medium text-slate-200">
              Export {selectedOption.label}
            </h3>
          </div>

          <p className="text-sm text-slate-400">{selectedOption.description}</p>

          <div className="flex flex-wrap items-end gap-4">
            <InputField
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFromDate(e.target.value)
              }
            />
            <InputField
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setToDate(e.target.value)
              }
            />
            <button
              onClick={handleExport}
              disabled={exporting}
              className={classNames(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                exporting
                  ? "cursor-not-allowed bg-slate-700 text-slate-400"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              )}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>

          {lastExport && lastExport.type === selectedType && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-400">
              <FileSpreadsheet className="h-4 w-4 text-green-400" />
              <span>
                Last export: <strong className="text-slate-200">{lastExport.count.toLocaleString()}</strong> records
                {" · "}
                {formatDateTime(lastExport.timestamp)}
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
