import { forwardRef } from "react";

const translations = {
  ar: {
    customer: "العميل",
    date: "التاريخ",
    item: "الصنف",
    qty: "الكمية",
    price: "السعر",
    total: "الإجمالي",
    finalTotal: "الإجمالي",
    balanceDue: "المبلغ المتبقي",
    currency: "ج.م",
    notes: "ملاحظات",
    noItems: "لا توجد عناصر",
  },
  en: {
    customer: "Customer",
    date: "Date",
    item: "Item",
    qty: "Qty",
    price: "Price",
    total: "Total",
    finalTotal: "Total",
    balanceDue: "Balance Due",
    currency: "EGP",
    notes: "Notes",
    noItems: "No items",
  },
};


function formatAmount(num) {
  const val = Number(num);
  if (isNaN(val)) return "0.00";
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const Invoice = forwardRef(function Invoice(
  { data, lang = "ar", className = "" },
  ref
) {
  const t = translations[lang] || translations.ar;
  const isRtl = lang === "ar";

  const {
    items = [],
    finalTotal = 0,
    balanceDue = 0,
    notes,
  } = data || {};

  const hasBalanceDue = Number(balanceDue) > 0;

  return (
    <div
      ref={ref}
      id="stockly-invoice-sheet"
      dir={isRtl ? "rtl" : "ltr"}
      className={[
        "bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900",
        "w-full max-w-[620px] mx-auto p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200",
        "transition-all duration-200",
        className,
      ].filter(Boolean).join(" ")}
      style={{
        fontFamily: "'Cairo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Items Table */}
      <div className="mt-5 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <th className={`py-2.5 ${isRtl ? "text-right" : "text-left"}`}>
                {t.item}
              </th>
              <th className="py-2.5 text-center w-16">
                {t.qty}
              </th>
              <th className={`py-2.5 w-24 ${isRtl ? "text-left" : "text-right"}`}>
                {t.price}
              </th>
              <th className={`py-2.5 w-28 ${isRtl ? "text-left" : "text-right"}`}>
                {t.total}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs text-gray-400">
                  {t.noItems}
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const qty = item.quantity ?? 1;
                const unitPrice = item.unitPrice ?? item.sale_price ?? 0;
                const lineTotal = item.lineTotal ?? item.line_total ?? (qty * unitPrice);

                return (
                  <tr key={item.id || idx} className="break-inside-avoid">
                    <td className={`py-3 font-medium text-gray-800 ${isRtl ? "text-right" : "text-left"}`}>
                      <span>{item.name || "—"}</span>
                      {item.unit && (
                        <span className="text-xs text-gray-400 mx-1 font-normal">
                          ({item.unit})
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center font-mono text-gray-700">
                      {qty}
                    </td>
                    <td className={`py-3 font-mono text-gray-600 ${isRtl ? "text-left" : "text-right"}`}>
                      {formatAmount(unitPrice)}
                    </td>
                    <td className={`py-3 font-mono font-semibold text-gray-900 ${isRtl ? "text-left" : "text-right"}`}>
                      {formatAmount(lineTotal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col gap-2">
        {/* Total */}
        <div className="flex justify-between items-center py-2.5 px-3.5 bg-gray-50 rounded-lg border border-gray-100 text-gray-900">
          <span className="font-bold text-sm sm:text-base">
            {t.finalTotal}
          </span>
          <span className="font-mono font-extrabold text-base sm:text-lg text-gray-900">
            {formatAmount(finalTotal)} <span className="text-xs sm:text-sm font-semibold">{t.currency}</span>
          </span>
        </div>

        {/* Balance Due (small clean line if unpaid) */}
        {hasBalanceDue && (
          <div className="flex justify-between items-center text-xs text-amber-700 font-semibold px-3 py-1.5 bg-amber-50 rounded-md border border-amber-200/60 mt-0.5">
            <span>{t.balanceDue}</span>
            <span className="font-mono font-bold">
              {formatAmount(balanceDue)} {t.currency}
            </span>
          </div>
        )}
      </div>

      {/* Notes if present */}
      {notes && (
        <div className="mt-5 pt-3 border-t border-dashed border-gray-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
            {t.notes}
          </span>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
});

export default Invoice;
