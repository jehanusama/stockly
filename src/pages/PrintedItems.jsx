import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, Table, Input, Modal, StockBar, Select, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

const UNIT_OPTIONS = [
  { value: "piece", label: "Piece" },
  { value: "roll", label: "Roll" },
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box" },
  { value: "kilo", label: "Kilo" },
];

export default function PrintedItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    printedItems = [],
    customers = [],
    addPrintedItem,
    updatePrintedItem,
    deletePrintedItem,
    addPrintedBatch,
    editPrintedBatch,
    deletePrintedBatch,
    addPrintedSale,
    isLoading,
    error,
    refreshData,
  } = useAppData();

  const [search, setSearch] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  // Expanded row IDs for batch history accordion
  const [expandedItemIds, setExpandedItemIds] = useState([]);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null);

  // Form States
  const [addFormData, setAddFormData] = useState({ name: "", cost: "", stock: "", unit: "piece" });
  const [editFormData, setEditFormData] = useState({ id: "", name: "", unit: "piece" });
  const [restockForm, setRestockForm] = useState({
    printed_item_id: "",
    itemName: "",
    cost_price: "",
    quantity_received: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });
  const [editBatchData, setEditBatchData] = useState({
    id: "",
    printed_item_id: "",
    itemName: "",
    cost_price: "",
    quantity_received: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });
  const [saleForm, setSaleForm] = useState({
    customer_id: "",
    printed_item_id: "",
    quantity: "",
    sale_price: "",
    amount_paid_now: "",
    sale_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const resetForms = () => {
    setAddFormData({ name: "", cost: "", stock: "", unit: "piece" });
    setEditFormData({ id: "", name: "", unit: "piece" });
    setRestockForm({
      printed_item_id: "",
      itemName: "",
      cost_price: "",
      quantity_received: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });
    setEditBatchData({
      id: "",
      printed_item_id: "",
      itemName: "",
      cost_price: "",
      quantity_received: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });
    setSaleForm({
      customer_id: "",
      printed_item_id: "",
      quantity: "",
      sale_price: "",
      amount_paid_now: "",
      sale_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setFormError("");
  };

  // Handle URL action ?action=new-sale
  useEffect(() => {
    const action = searchParams.get("action");
    const itemId = searchParams.get("item_id");

    if (action === "new-sale") {
      const targetItem = printedItems.find(p => p.id === itemId) || (printedItems.length > 0 ? printedItems[0] : null);
      const timer = setTimeout(() => {
        setSaleForm(prev => ({
          ...prev,
          printed_item_id: prev.printed_item_id || (targetItem ? targetItem.id : ""),
          sale_price: prev.sale_price || (targetItem && targetItem.cost_price ? (targetItem.cost_price * 1.2).toFixed(2) : ""),
        }));
        setIsSaleModalOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, printedItems]);

  const openAddModal = () => {
    resetForms();
    setIsAddModalOpen(true);
  };

  const openEditModal = (item) => {
    resetForms();
    setEditFormData({
      id: item.id,
      name: item.name,
      unit: item.unit || "piece",
    });
    setIsEditModalOpen(true);
  };

  const openRestockModal = (item) => {
    resetForms();
    setRestockForm({
      printed_item_id: item.id,
      itemName: item.name,
      cost_price: item.cost_price ? item.cost_price.toString() : "",
      quantity_received: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });
    setIsRestockModalOpen(true);
  };

  const openEditBatchModal = (batch, item) => {
    resetForms();
    setEditBatchData({
      id: batch.id,
      printed_item_id: item.id,
      itemName: item.name,
      cost_price: batch.cost_price ? batch.cost_price.toString() : "",
      quantity_received: batch.quantity_received ? batch.quantity_received.toString() : "",
      purchase_date: batch.purchase_date || new Date().toISOString().split("T")[0],
    });
    setIsEditBatchOpen(true);
  };

  const openSaleModal = (item = null) => {
    resetForms();
    const targetItem = item || (printedItems.length > 0 ? printedItems[0] : null);
    setSaleForm({
      customer_id: "",
      printed_item_id: targetItem ? targetItem.id : "",
      quantity: "",
      sale_price: targetItem && targetItem.cost_price ? (targetItem.cost_price * 1.2).toFixed(2) : "",
      amount_paid_now: "",
      sale_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setFormError("");
    setIsSaleModalOpen(true);
  };

  const closeSaleModal = () => {
    setIsSaleModalOpen(false);
    if (searchParams.get("action")) {
      setSearchParams({});
    }
    resetForms();
  };

  const toggleExpandItem = (itemId) => {
    setExpandedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Filter Items by Search
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return printedItems;
    return printedItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [printedItems, search]);

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.name.trim()) return;

    setIsSubmitting(true);
    setFormError("");

    const newItem = {
      name: addFormData.name.trim(),
      cost_price: addFormData.cost ? parseFloat(addFormData.cost) : 0,
      stock_quantity: addFormData.stock ? parseFloat(addFormData.stock) : 0,
      unit: addFormData.unit || "piece",
    };

    const res = await addPrintedItem(newItem);
    setIsSubmitting(false);
    if (res && !res.success) {
      setFormError(res.error || "Failed to add printed item.");
      return;
    }
    setIsAddModalOpen(false);
    resetForms();
  };

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) return;

    setIsSubmitting(true);
    setFormError("");

    const res = await updatePrintedItem({
      id: editFormData.id,
      name: editFormData.name.trim(),
      unit: editFormData.unit || "piece",
    });

    setIsSubmitting(false);
    if (res && !res.success) {
      setFormError(res.error || "Failed to update printed item.");
      return;
    }
    setIsEditModalOpen(false);
    resetForms();
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(restockForm.quantity_received);
    const cost = parseFloat(restockForm.cost_price);

    if (isNaN(qty) || qty <= 0) {
      setFormError("Please enter a valid quantity greater than 0.");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setFormError("Please enter a valid cost price.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const res = await addPrintedBatch({
      printed_item_id: restockForm.printed_item_id,
      cost_price: cost,
      quantity_received: qty,
      purchase_date: restockForm.purchase_date,
    });

    setIsSubmitting(false);
    if (res && !res.success) {
      setFormError(res.error || "Failed to add stock batch.");
      return;
    }
    setIsRestockModalOpen(false);
    resetForms();
  };

  const handleEditBatchSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(editBatchData.quantity_received);
    const cost = parseFloat(editBatchData.cost_price);

    if (isNaN(qty) || qty <= 0) {
      setFormError("Please enter a valid quantity greater than 0.");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setFormError("Please enter a valid cost price.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const res = await editPrintedBatch({
      id: editBatchData.id,
      cost_price: cost,
      quantity_received: qty,
      purchase_date: editBatchData.purchase_date,
    });

    setIsSubmitting(false);
    if (res && !res.success) {
      setFormError(res.error || "Failed to update batch.");
      return;
    }
    setIsEditBatchOpen(false);
    resetForms();
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!saleForm.printed_item_id) {
      setFormError("Please select a printed item.");
      return;
    }

    const qty = parseFloat(saleForm.quantity);
    const price = parseFloat(saleForm.sale_price);

    if (isNaN(qty) || qty <= 0) {
      setFormError("Please enter a valid quantity greater than 0.");
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError("Please enter a valid sale price.");
      return;
    }

    const selectedItem = printedItems.find(p => p.id === saleForm.printed_item_id);
    const availStock = Number(selectedItem?.stock_quantity ?? 0);
    if (qty > availStock) {
      setFormError(`Insufficient stock. Requested: ${qty}, Available: ${availStock}`);
      return;
    }

    const calculatedTotal = qty * price;
    const paidNow = saleForm.amount_paid_now !== "" ? parseFloat(saleForm.amount_paid_now) : calculatedTotal;

    if (isNaN(paidNow) || paidNow < 0) {
      setFormError("Please enter a valid amount paid.");
      return;
    }
    if (paidNow > calculatedTotal + 0.001) {
      setFormError(`Amount paid cannot exceed total amount (${formatCurrency(calculatedTotal)}).`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const res = await addPrintedSale({
      customer_id: saleForm.customer_id || null,
      printed_item_id: saleForm.printed_item_id,
      quantity: qty,
      sale_price: price,
      line_total: calculatedTotal,
      amount_paid_now: paidNow,
      sale_date: saleForm.sale_date,
      notes: saleForm.notes.trim() || null,
    });

    setIsSubmitting(false);

    if (res && !res.success) {
      setFormError(res.error || "Failed to record printed sale.");
      return;
    }

    closeSaleModal();
  };

  const handleDeleteBatchConfirm = async () => {
    if (!deleteBatchTarget) return;
    const isUntouched = Number(deleteBatchTarget.quantity_remaining) === Number(deleteBatchTarget.quantity_received);
    if (!isUntouched) {
      setDeleteError("Can't delete — some of this batch has already been sold");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    const res = await deletePrintedBatch(deleteBatchTarget.id);
    setIsDeleting(false);
    if (res && !res.success) {
      setDeleteError(res.error || "Failed to delete batch.");
    } else {
      setDeleteBatchTarget(null);
    }
  };

  const handleDeleteItemConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    const res = await deletePrintedItem(deleteTarget.id);
    setIsDeleting(false);
    if (res && !res.success) {
      setDeleteError(res.error || "Failed to delete printed item.");
    } else {
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Item Name",
      render: (val, row) => {
        const isExpanded = expandedItemIds.includes(row.id);
        const batchCount = (row.batches || []).length;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleExpandItem(row.id)}
              className="p-1 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] rounded transition-colors"
              title={isExpanded ? "Collapse batches" : "View batch history"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${isExpanded ? "rotate-90 text-[var(--color-app-accent)]" : ""}`}
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="font-semibold text-[var(--color-app-text)]">{val}</span>
              <button
                type="button"
                onClick={() => toggleExpandItem(row.id)}
                className="text-xs text-[var(--color-app-text-muted)] hover:text-[var(--color-app-accent)] text-left transition-colors flex items-center gap-1 mt-0.5"
              >
                <span>{batchCount} {batchCount === 1 ? "batch" : "batches"}</span>
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: "cost_price",
      label: "Latest Cost",
      render: (val) => <span className="font-mono text-[var(--color-app-text-muted)]">{formatCurrency(val)}</span>,
    },
    {
      key: "unit",
      label: "Unit",
      render: (val) => <span className="text-[var(--color-app-text-muted)] capitalize">{val || "piece"}</span>,
    },
    {
      key: "stock_quantity",
      label: "Total Stock",
      render: (val, row) => <StockBar quantity={val} unit={row.unit || "piece"} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" size="sm" onClick={() => openSaleModal(row)}>
            + Sale
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openRestockModal(row)}>
            + Add Stock
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>
            Edit
          </Button>
          <button
            type="button"
            className="p-2 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-danger-muted)] transition-colors focus:outline-none"
            onClick={() => { setDeleteError(""); setDeleteTarget(row); }}
            title="Delete printed item"
            aria-label="Delete printed item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const renderBatchHistory = (item) => {
    const batches = item.batches || [];
    if (batches.length === 0) {
      return (
        <div className="p-4 rounded-lg bg-[var(--color-app-panel)] border border-[var(--color-app-border)] text-center flex flex-col items-center gap-2">
          <p className="text-sm text-[var(--color-app-text-muted)]">No stock batches recorded yet for this printed item.</p>
          <Button variant="primary" size="sm" onClick={() => openRestockModal(item)}>
            + Add First Batch
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 p-3 rounded-lg bg-[var(--color-app-panel)] border border-[var(--color-app-border)]">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
            Batch History ({batches.length})
          </span>
          <span className="text-xs text-[var(--color-app-text-muted)]">
            Total Remaining: <strong className="text-[var(--color-app-text)] font-mono">{item.stock_quantity} {item.unit || "piece"}</strong>
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-bg)]">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] font-semibold">
                <th className="px-3 py-2">Purchase Date</th>
                <th className="px-3 py-2">Cost Price</th>
                <th className="px-3 py-2">Quantity Received</th>
                <th className="px-3 py-2">Quantity Remaining</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-app-border)] text-[var(--color-app-text)]">
              {batches.map((batch) => {
                const isUntouched = Number(batch.quantity_remaining) === Number(batch.quantity_received);
                const disabledTooltip = "Can't edit — some of this batch has already been sold";
                const disabledDeleteTooltip = "Can't delete — some of this batch has already been sold";

                return (
                  <tr key={batch.id} className="hover:bg-[var(--color-app-panel)] transition-colors">
                    <td className="px-3 py-2 font-mono">{batch.purchase_date ? new Date(batch.purchase_date).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 font-mono">{formatCurrency(batch.cost_price)}</td>
                    <td className="px-3 py-2 font-mono">{batch.quantity_received} {item.unit || "piece"}</td>
                    <td className="px-3 py-2 font-mono">
                      <span className={batch.quantity_remaining > 0 ? "text-[var(--color-app-success)] font-semibold" : "text-[var(--color-app-text-muted)]"}>
                        {batch.quantity_remaining} {item.unit || "piece"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={!isUntouched}
                          onClick={() => isUntouched && openEditBatchModal(batch, item)}
                          className="p-1 rounded text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={isUntouched ? "Edit batch" : disabledTooltip}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={!isUntouched}
                          onClick={() => {
                            if (isUntouched) {
                              setDeleteError("");
                              setDeleteBatchTarget(batch);
                            }
                          }}
                          className="p-1 rounded text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-danger-muted)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={isUntouched ? "Delete batch" : disabledDeleteTooltip}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <PageContainer title="Printed Items" subtitle="Manage inventory catalog and stock batches for printed products.">
        <LoadingState message="Loading printed items inventory..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Printed Items" subtitle="Manage inventory catalog and stock batches for printed products.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Printed Items"
      subtitle="Manage inventory catalog and stock batches for printed products."
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" size="sm" className="sm:text-sm sm:h-10 sm:px-4" onClick={() => openSaleModal()}>
            + Record Printed Sale
          </Button>
          <Button variant="secondary" size="sm" className="sm:text-sm sm:h-10 sm:px-4" onClick={openAddModal}>
            + Add Printed Item
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-app-text-muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="text"
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[var(--color-app-bg)] border border-[var(--color-app-border)] text-sm text-[var(--color-app-text)] placeholder-[var(--color-app-text-muted)] focus:outline-none focus:border-[var(--color-app-border-focus)] focus:ring-1 focus:ring-[var(--color-app-border-focus)] transition-colors"
            placeholder="Search printed items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Printed Items Table */}
        {filteredItems.length === 0 ? (
          <Card padding="xl" className="text-center">
            <p className="text-[var(--color-app-text-muted)] mb-4">
              {search ? "No printed items found matching your search." : "No printed items found in inventory."}
            </p>
            {search ? (
              <Button variant="secondary" onClick={() => setSearch("")}>Clear Search</Button>
            ) : (
              <Button variant="primary" onClick={openAddModal}>+ Add First Printed Item</Button>
            )}
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <Table
              columns={columns}
              rows={filteredItems}
              expandedRowKeys={expandedItemIds}
              renderExpandedRow={renderBatchHistory}
            />
          </Card>
        )}
      </div>

      {/* ── Record Printed Sale Modal ── */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={closeSaleModal}
        title="Record Printed Sale"
      >
        <form onSubmit={handleSaleSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <Select
            label="Customer (Optional)"
            value={saleForm.customer_id}
            onChange={(e) => setSaleForm({ ...saleForm, customer_id: e.target.value })}
            options={[{ value: "", label: "Guest Customer (No Account)" }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
          />

          <Select
            label="Printed Item"
            value={saleForm.printed_item_id}
            onChange={(e) => {
              const item = printedItems.find(p => p.id === e.target.value);
              setSaleForm({
                ...saleForm,
                printed_item_id: e.target.value,
                sale_price: item && item.cost_price ? (item.cost_price * 1.2).toFixed(2) : saleForm.sale_price,
              });
            }}
            options={printedItems.map(item => ({
              value: item.id,
              label: `${item.name} (${item.stock_quantity} ${item.unit || "piece"} available)`,
            }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={saleForm.quantity}
              onChange={(e) => {
                const qtyVal = e.target.value;
                const priceVal = parseFloat(saleForm.sale_price) || 0;
                const totalVal = (parseFloat(qtyVal) || 0) * priceVal;
                setSaleForm({
                  ...saleForm,
                  quantity: qtyVal,
                  amount_paid_now: totalVal > 0 ? totalVal.toFixed(2) : "",
                });
              }}
              placeholder="e.g. 50"
              required
              autoFocus
            />

            <Input
              label="Sale Price Per Unit (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={saleForm.sale_price}
              onChange={(e) => {
                const priceVal = e.target.value;
                const qtyVal = parseFloat(saleForm.quantity) || 0;
                const totalVal = qtyVal * (parseFloat(priceVal) || 0);
                setSaleForm({
                  ...saleForm,
                  sale_price: priceVal,
                  amount_paid_now: totalVal > 0 ? totalVal.toFixed(2) : "",
                });
              }}
              placeholder="0.00"
              required
            />
          </div>

          {/* Calculated Summary Card */}
          {(() => {
            const qtyNum = parseFloat(saleForm.quantity) || 0;
            const priceNum = parseFloat(saleForm.sale_price) || 0;
            const totalNum = qtyNum * priceNum;
            const itemObj = printedItems.find(p => p.id === saleForm.printed_item_id);
            return totalNum > 0 ? (
              <div className="p-3.5 rounded-xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-between text-xs">
                <span className="text-[var(--color-app-text-muted)] font-medium">
                  {qtyNum} {itemObj?.unit || "piece"} × {formatCurrency(priceNum)}
                </span>
                <span className="font-mono text-sm font-bold text-[var(--color-app-accent)]">
                  Total: {formatCurrency(totalNum)}
                </span>
              </div>
            ) : null;
          })()}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount Paid Now (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={saleForm.amount_paid_now}
              onChange={(e) => setSaleForm({ ...saleForm, amount_paid_now: e.target.value })}
              placeholder="Leave empty for full payment"
            />

            <Input
              label="Sale Date"
              type="date"
              value={saleForm.sale_date}
              onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
              required
            />
          </div>

          <Input
            label="Notes (Optional)"
            type="text"
            value={saleForm.notes}
            onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
            placeholder="e.g. Agreement details, PO #"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={closeSaleModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Confirm & Record Sale
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Printed Item Modal ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); resetForms(); }}
        title="Add New Printed Item"
      >
        <form onSubmit={handleAddItemSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Item Name"
            value={addFormData.name}
            onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
            placeholder="e.g. Logo Printed Box"
            required
            autoFocus
          />

          <Select
            label="Unit"
            value={addFormData.unit}
            onChange={(e) => setAddFormData({ ...addFormData, unit: e.target.value })}
            options={UNIT_OPTIONS}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Initial Cost Price (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={addFormData.cost}
              onChange={(e) => setAddFormData({ ...addFormData, cost: e.target.value })}
              placeholder="0.00 (Optional)"
            />
            <Input
              label="Initial Stock Quantity"
              type="number"
              min="0"
              step="0.01"
              value={addFormData.stock}
              onChange={(e) => setAddFormData({ ...addFormData, stock: e.target.value })}
              placeholder="0 (Optional)"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsAddModalOpen(false); resetForms(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!addFormData.name.trim()}
            >
              Save Printed Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Printed Item Modal ── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); resetForms(); }}
        title="Edit Printed Item"
      >
        <form onSubmit={handleEditItemSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Item Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            placeholder="Item Name"
            required
            autoFocus
          />

          <Select
            label="Unit"
            value={editFormData.unit}
            onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
            options={UNIT_OPTIONS}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsEditModalOpen(false); resetForms(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!editFormData.name.trim()}
            >
              Update Printed Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Restock Batch Modal ── */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => { setIsRestockModalOpen(false); resetForms(); }}
        title={`Add Stock Batch — ${restockForm.itemName}`}
      >
        <form onSubmit={handleRestockSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity Received"
              type="number"
              min="0.01"
              step="0.01"
              value={restockForm.quantity_received}
              onChange={(e) => setRestockForm({ ...restockForm, quantity_received: e.target.value })}
              placeholder="e.g. 100"
              required
              autoFocus
            />
            <Input
              label="Cost Price Per Unit (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={restockForm.cost_price}
              onChange={(e) => setRestockForm({ ...restockForm, cost_price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <Input
            label="Purchase Date"
            type="date"
            value={restockForm.purchase_date}
            onChange={(e) => setRestockForm({ ...restockForm, purchase_date: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsRestockModalOpen(false); resetForms(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Save Stock Batch
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Batch Modal ── */}
      <Modal
        isOpen={isEditBatchOpen}
        onClose={() => { setIsEditBatchOpen(false); resetForms(); }}
        title={`Edit Stock Batch — ${editBatchData.itemName}`}
      >
        <form onSubmit={handleEditBatchSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity Received"
              type="number"
              min="0.01"
              step="0.01"
              value={editBatchData.quantity_received}
              onChange={(e) => setEditBatchData({ ...editBatchData, quantity_received: e.target.value })}
              placeholder="e.g. 100"
              required
              autoFocus
            />
            <Input
              label="Cost Price Per Unit (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={editBatchData.cost_price}
              onChange={(e) => setEditBatchData({ ...editBatchData, cost_price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <Input
            label="Purchase Date"
            type="date"
            value={editBatchData.purchase_date}
            onChange={(e) => setEditBatchData({ ...editBatchData, purchase_date: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsEditBatchOpen(false); resetForms(); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Update Batch
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Item Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Printed Item"
      >
        <div className="flex flex-col gap-5">
          {deleteError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-[var(--color-app-text-muted)]">
            Are you sure you want to delete <strong className="text-[var(--color-app-text)]">{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleDeleteItemConfirm}>
              Delete Printed Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Batch Modal ── */}
      <Modal
        isOpen={!!deleteBatchTarget}
        onClose={() => setDeleteBatchTarget(null)}
        title="Delete Stock Batch"
      >
        <div className="flex flex-col gap-5">
          {deleteError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-[var(--color-app-text-muted)]">
            Are you sure you want to delete this batch of <strong className="text-[var(--color-app-text)] font-mono">{deleteBatchTarget?.quantity_received}</strong> units purchased on <strong className="text-[var(--color-app-text)]">{deleteBatchTarget?.purchase_date}</strong>?
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button variant="secondary" onClick={() => setDeleteBatchTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleDeleteBatchConfirm}>
              Delete Batch
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
