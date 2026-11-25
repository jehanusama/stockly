import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Modal, Button } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { Invoice } from "./Invoice";

export function InvoiceModal({ isOpen, onClose, invoiceData }) {
  const [lang, setLang] = useState("ar");
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const invoiceRef = useRef(null);
  const { success, error: toastError } = useToast();

  if (!isOpen || !invoiceData) return null;

  const getFilenameBase = () => {
    const customerSafeName = (invoiceData.customerName || "Customer")
      .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "_");
    const dateStr = invoiceData.date
      ? new Date(invoiceData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    return `invoice_${customerSafeName}_${dateStr}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsExportingPdf(true);
    setShareFeedback("");

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(invoiceRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (img.height * imgWidth) / img.width;
      const usablePageHeight = pageHeight - margin * 2;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(dataUrl, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= usablePageHeight;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= usablePageHeight;
      }

      pdf.save(`${getFilenameBase()}.pdf`);
      setShareFeedback("PDF downloaded successfully");
      success("Invoice PDF downloaded");
      setTimeout(() => setShareFeedback(""), 3000);
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
      toastError("Failed to generate PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveAsImage = async () => {
    if (!invoiceRef.current) return;
    setIsExportingImage(true);
    setShareFeedback("");

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const filename = `${getFilenameBase()}.png`;
      const dataUrl = await toPng(invoiceRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShareFeedback("Image downloaded successfully");
      success("Invoice image downloaded");
      setTimeout(() => setShareFeedback(""), 3000);
    } catch (err) {
      console.error("Error generating invoice image:", err);
      toastError("Failed to generate image. Please try Download PDF.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
      <div
        role="status"
        aria-live="polite"
        className="text-xs text-[var(--color-app-text-muted)] text-center sm:text-left min-h-[1.25rem] flex items-center"
      >
        {shareFeedback && (
          <span className="text-[var(--color-app-success)] font-medium animate-pulse">
            ✓ {shareFeedback}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="secondary" size="md" onClick={onClose}>
          Close
        </Button>

        {/* Save as Image Button */}
        <Button
          variant="secondary"
          size="md"
          loading={isExportingImage}
          onClick={handleSaveAsImage}
          className="flex items-center gap-2"
          title="Save or Share as PNG Image"
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
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Save as Image</span>
        </Button>

        {/* Print Button (Desktop) */}
        <Button
          variant="secondary"
          size="md"
          onClick={handlePrint}
          className="hidden sm:flex items-center gap-2"
          title="Print using browser print dialog"
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
            aria-hidden="true"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>Print</span>
        </Button>

        {/* Download PDF Button */}
        <Button
          variant="primary"
          size="md"
          loading={isExportingPdf}
          onClick={handleDownloadPdf}
          className="flex items-center gap-2"
          title="Download invoice as PDF file"
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
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Download PDF</span>
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Invoice"
      size="xl"
      footer={modalFooter}
    >
      <div className="flex flex-col gap-4">
        {/* Language Selection Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-app-border)]">
          <span className="text-xs text-[var(--color-app-text-muted)] font-medium">
            Invoice Language
          </span>

          <div
            role="group"
            aria-label="Invoice Language"
            className="inline-flex rounded-lg p-0.5 bg-[var(--color-app-bg)] border border-[var(--color-app-border)]"
          >
            <button
              type="button"
              aria-pressed={lang === "ar"}
              onClick={() => setLang("ar")}
              className={[
                "px-3 py-1 text-xs font-semibold rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]",
                lang === "ar"
                  ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                  : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
              ].join(" ")}
            >
              العربية (Arabic)
            </button>
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={[
                "px-3 py-1 text-xs font-semibold rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]",
                lang === "en"
                  ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                  : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
              ].join(" ")}
            >
              English
            </button>
          </div>
        </div>

        {/* Paper Invoice Container (Framed with dark panel for contrast) */}
        <div className="bg-[var(--color-app-bg)]/80 p-3 sm:p-6 rounded-xl border border-[var(--color-app-border)] overflow-x-auto flex justify-center">
          <Invoice ref={invoiceRef} data={invoiceData} lang={lang} />
        </div>
      </div>
    </Modal>
  );
}

export default InvoiceModal;
