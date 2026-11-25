import { useRef, useState } from "react";
import { toPng, toBlob } from "html-to-image";
import { Modal, Button } from "@/components/ui";
import { formatCurrency } from "@/utils/currency";
import { useToast } from "@/context/ToastContext";

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function OutstandingPdfModal({
  isOpen,
  onClose,
  unpaidCustomers = [],
  totalOutstanding = 0,
  sortBy = "balance",
}) {
  const sheetRef = useRef(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const { success, error: toastError } = useToast();

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const isoDate = new Date().toISOString().split("T")[0];
  const overdueCount = unpaidCustomers.filter(
    (c) => daysSince(c.oldestUnpaidDate) >= 30
  ).length;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsImage = async () => {
    if (!sheetRef.current) return;
    setIsExportingImage(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const filename = `outstanding_report_${isoDate}.png`;
      const blob = await toBlob(sheetRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      if (!blob) throw new Error("Could not generate image");

      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Outstanding Report - ${todayStr}`,
            text: `Total Outstanding: ${formatCurrency(totalOutstanding)}`,
          });
          setIsExportingImage(false);
          return;
        } catch (shareErr) {
          if (shareErr.name === "AbortError") {
            setIsExportingImage(false);
            return;
          }
        }
      }

      const dataUrl = await toPng(sheetRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      success("Image saved successfully");
    } catch (err) {
      console.error("Error exporting outstanding image:", err);
      toastError("Failed to generate image. Please use Print / Save as PDF.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const modalFooter = (
    <div className="flex flex-wrap items-center justify-end gap-2.5 w-full">
      <Button variant="secondary" size="md" onClick={onClose}>
        Close
      </Button>

      <Button
        variant="secondary"
        size="md"
        loading={isExportingImage}
        onClick={handleSaveAsImage}
        className="flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        Save as Image
      </Button>

      <Button
        variant="primary"
        size="md"
        onClick={handlePrint}
        className="flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect width="12" height="8" x="6" y="14" />
        </svg>
        Print / Save as PDF
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Outstanding Report (PDF)"
      size="xl"
      footer={modalFooter}
    >
      <div className="bg-slate-200/70 dark:bg-[#0f172a] p-3 sm:p-6 rounded-xl overflow-x-auto max-h-[70vh] overflow-y-auto">
        <div
          id="stockly-outstanding-sheet"
          ref={sheetRef}
          className="bg-white text-slate-900 w-full max-w-[794px] mx-auto p-6 sm:p-8 rounded-lg shadow-sm border border-slate-200"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-slate-900">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Stockly
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">
                Outstanding Customer Balances Report
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
              <div>
                <span className="font-semibold text-slate-800">Generated:</span>{" "}
                {todayStr}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Sorted by:</span>{" "}
                {sortBy === "oldest" ? "Oldest Unpaid Order" : "Highest Balance"}
              </div>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-3 my-5">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Total Outstanding
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-700 mt-0.5">
                {formatCurrency(totalOutstanding)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Customers Owing
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-0.5">
                {unpaidCustomers.length}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                30+ Days Overdue
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 mt-0.5">
                {overdueCount}
              </div>
            </div>
          </div>

          {/* Table */}
          {unpaidCustomers.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg">
              No outstanding customer balances.
            </div>
          ) : (
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-left">
                  <th className="py-2.5 px-3 font-semibold w-10 rounded-tl-md">#</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Orders</th>
                  <th className="py-2.5 px-3 font-semibold">Oldest Debt</th>
                  <th className="py-2.5 px-3 font-semibold text-right rounded-tr-md">
                    Balance Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {unpaidCustomers.map((c, idx) => {
                  const days = daysSince(c.oldestUnpaidDate);
                  const oldestFormatted = c.oldestUnpaidDate
                    ? new Date(c.oldestUnpaidDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={c.customerId}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div
                          className="font-semibold text-slate-900"
                          dir="auto"
                        >
                          {c.name}
                        </div>
                        {c.phone && (
                          <div className="text-[11px] font-mono text-slate-500">
                            {c.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {c.unpaidOrderCount}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-700">{oldestFormatted}</span>
                        <span
                          className={`ml-1.5 text-[10px] font-mono font-semibold ${
                            days >= 60
                              ? "text-rose-600"
                              : days >= 30
                              ? "text-amber-600"
                              : "text-slate-500"
                          }`}
                        >
                          ({days}d)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(c.totalBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase text-xs tracking-wider text-slate-700">
                    Total Outstanding ({unpaidCustomers.length} customer{unpaidCustomers.length !== 1 ? "s" : ""})
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-amber-700">
                    {formatCurrency(totalOutstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
