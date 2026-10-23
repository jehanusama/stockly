import { useState, useRef } from "react";
import { toPng, toBlob } from "html-to-image";
import { Modal, Button } from "@/components/ui";
import { Invoice } from "./Invoice";

export function InvoiceModal({ isOpen, onClose, invoiceData }) {
  const [lang, setLang] = useState("ar");
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const invoiceRef = useRef(null);

  if (!isOpen || !invoiceData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsImage = async () => {
    if (!invoiceRef.current) return;
    setIsExportingImage(true);
    setShareFeedback("");

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const element = invoiceRef.current;
      const customerSafeName = (invoiceData.customerName || "Customer")
        .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "_");
      const dateStr = invoiceData.date
        ? new Date(invoiceData.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const filename = `invoice_${customerSafeName}_${dateStr}.png`;

      // Export using html-to-image with sharp pixelRatio
      const blob = await toBlob(element, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      if (!blob) throw new Error("Could not generate image blob");

      const file = new File([blob], filename, { type: "image/png" });

      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice - ${invoiceData.customerName || "Customer"}`,
            text: `Invoice for ${invoiceData.customerName || "Customer"} - ${dateStr}`,
          });
          setIsExportingImage(false);
          return;
        } catch (shareErr) {
          if (shareErr.name === "AbortError") {
            setIsExportingImage(false);
            return;
          }
          console.warn("Share failed, falling back to download:", shareErr);
        }
      }

      // Fallback: Normal browser download
      const dataUrl = await toPng(element, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setShareFeedback("Image saved successfully");
      setTimeout(() => setShareFeedback(""), 3000);
    } catch (err) {
      console.error("Error generating invoice image:", err);
      alert("Failed to generate image. Please try the Print / Save as PDF option.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
      <div className="text-xs text-[var(--color-app-text-muted)] text-center sm:text-left">
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
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Save as Image</span>
        </Button>

        {/* Print / Save as PDF Button */}
        <Button
          variant="primary"
          size="md"
          onClick={handlePrint}
          className="flex items-center gap-2"
          title="Print or Save as PDF using browser print dialog"
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
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>Print / Save as PDF</span>
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

          <div className="inline-flex rounded-lg p-0.5 bg-[var(--color-app-bg)] border border-[var(--color-app-border)]">
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={[
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                lang === "ar"
                  ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                  : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
              ].join(" ")}
            >
              العربية (Arabic)
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={[
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
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
