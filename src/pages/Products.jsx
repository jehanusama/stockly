import { useState, useMemo } from "react";
import { Button, Card, Table, Input, Modal, StockBar, Select, LoadingState, ErrorState, DatePicker } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

function ManageCategoriesModal({ isOpen, onClose }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useAppData();
  const sortedCategories = useMemo(
    () => [...(categories || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsAdding(true);
    setErrorMsg("");
    const res = await addCategory({ name: newCatName.trim() });
    setIsAdding(false);
    if (res && !res.success) {
      setErrorMsg(res.error || "Failed to add category");
      return;
    }
    setNewCatName("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsUpdating(true);
    setErrorMsg("");
    const res = await updateCategory({ id: editingId, name: editName.trim() });
    setIsUpdating(false);
    if (res && !res.success) {
      setErrorMsg(res.error || "Failed to update category");
      return;
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = async (id) => {
    setErrorMsg("");
    setDeletingId(id);
    const res = await deleteCategory(id);
    setDeletingId(null);
    if (res && !res.success) {
      setErrorMsg(res.error || "Failed to delete category");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
      <div className="flex flex-col gap-6">
        {errorMsg && (
          <div className="px-4 py-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm font-medium border border-[var(--color-app-danger)]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="New Category"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Paper Bags"
            />
          </div>
          <Button type="submit" disabled={!newCatName.trim()} loading={isAdding}>Add</Button>
        </form>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Existing Categories</h3>
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-[var(--color-app-text-muted)] italic py-4 text-center">No categories exist.</p>
          ) : (
            <div className="flex flex-col rounded-lg border border-[var(--color-app-border)] overflow-hidden">
              {sortedCategories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 border-b border-[var(--color-app-border)] last:border-0 bg-[var(--color-app-panel)] hover:bg-[var(--color-app-elevated)] transition-colors">
                  {editingId === c.id ? (
                    <form onSubmit={handleUpdate} className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button type="submit" variant="primary" size="sm" loading={isUpdating}>Save</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    </form>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-[var(--color-app-text)]">{c.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingId(c.id); setEditName(c.name); setErrorMsg(""); }}
                          className="p-1.5 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] transition-colors rounded"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] transition-colors rounded disabled:opacity-50"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function Products() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addStockBatch, editBatch: editBatchFunc, deleteBatch: deleteBatchFunc, isLoading, error, refreshData } = useAppData();
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);

  // Expanded row IDs for batch history accordion
  const [expandedProductIds, setExpandedProductIds] = useState([]);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null);

  // Form States
  const [addFormData, setAddFormData] = useState({ category_id: "", name: "", cost: "", sale_price: "", stock: "", unit: "kilo" });
  const [editFormData, setEditFormData] = useState({ id: "", category_id: "", name: "", unit: "kilo" });
  const [restockForm, setRestockForm] = useState({
    product_id: "",
    productName: "",
    cost_price: "",
    quantity_received: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });
  const [editBatchData, setEditBatchData] = useState({
    id: "",
    product_id: "",
    productName: "",
    cost_price: "",
    quantity_received: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });

  const resetForms = () => {
    setAddFormData({ category_id: "", name: "", cost: "", sale_price: "", stock: "", unit: "kilo" });
    setEditFormData({ id: "", category_id: "", name: "", unit: "kilo", sale_price: "" });
    setRestockForm({
      product_id: "",
      productName: "",
      cost_price: "",
      quantity_received: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });
    setEditBatchData({
      id: "",
      product_id: "",
      productName: "",
      cost_price: "",
      quantity_received: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });
    setFormError("");
  };

  const openAddModalWithCat = (catId = "") => {
    resetForms();
    const selectedCat = catId || (categories.length > 0 ? categories[0].id : "");
    setAddFormData(prev => ({ ...prev, category_id: selectedCat }));
    setIsAddModalOpen(true);
  };

  const openEditModal = (product) => {
    resetForms();
    setEditFormData({
      id: product.id,
      category_id: product.category_id,
      name: product.name,
      unit: product.unit || "kilo",
      sale_price: product.sale_price != null ? String(product.sale_price) : "",
    });
    setIsEditModalOpen(true);
  };

  const openRestockModal = (product) => {
    resetForms();
    setRestockForm({
      product_id: product.id,
      productName: product.name,
      cost_price: product.cost_price ? product.cost_price.toString() : "",
      quantity_received: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });
    setIsRestockModalOpen(true);
  };

  const openEditBatchModal = (batch, product) => {
    resetForms();
    setEditBatchData({
      id: batch.id,
      product_id: product.id,
      productName: product.name,
      cost_price: batch.cost_price ? batch.cost_price.toString() : "",
      quantity_received: batch.quantity_received ? batch.quantity_received.toString() : "",
      purchase_date: batch.purchase_date || new Date().toISOString().split("T")[0],
    });
    setIsEditBatchOpen(true);
  };

  const toggleExpandProduct = (productId) => {
    setExpandedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Group and Filter Products
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    
    let groups = categories.map(c => ({
      ...c,
      products: products.filter(p => p.category_id === c.id)
    }));

    if (q) {
      groups = groups.reduce((acc, g) => {
        const catMatches = g.name.toLowerCase().includes(q);
        const prodMatches = g.products.filter(p => p.name.toLowerCase().includes(q));
        
        if (catMatches || prodMatches.length > 0) {
          acc.push({
            ...g,
            products: catMatches ? g.products : prodMatches
          });
        }
        return acc;
      }, []);
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, categories, search]);

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.name.trim() || !addFormData.category_id) return;
    
    setIsSubmitting(true);
    setFormError("");

    const newProduct = {
      category_id: addFormData.category_id,
      name: addFormData.name.trim(),
      cost_price: addFormData.cost ? parseFloat(addFormData.cost) : 0,
      sale_price: addFormData.sale_price !== "" ? parseFloat(addFormData.sale_price) : null,
      stock_quantity: addFormData.stock ? parseFloat(addFormData.stock) : 0,
      unit: addFormData.unit || "kilo"
    };
    const res = await addProduct(newProduct);
    setIsSubmitting(false);
    if (res && !res.success) {
      setFormError(res.error || "Failed to add product.");
      return;
    }
    setIsAddModalOpen(false);
    resetForms();
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editFormData.category_id) return;

    setIsSubmitting(true);
    setFormError("");

    const res = await updateProduct({
      id: editFormData.id,
      category_id: editFormData.category_id,
      name: editFormData.name.trim(),
      unit: editFormData.unit || "kilo",
      sale_price: editFormData.sale_price !== "" ? parseFloat(editFormData.sale_price) : null,
    });
    setIsSubmitting(false);
    if (res && !res.success) {
      setFormError(res.error || "Failed to update product.");
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

    const res = await addStockBatch({
      product_id: restockForm.product_id,
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

    const res = await editBatchFunc({
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

  const handleDeleteBatchConfirm = async () => {
    if (!deleteBatchTarget) return;
    const isUntouched = Number(deleteBatchTarget.quantity_remaining) === Number(deleteBatchTarget.quantity_received);
    if (!isUntouched) {
      setDeleteError("Can't delete — some of this batch has already been sold");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteBatchFunc(deleteBatchTarget.id);
    setIsDeleting(false);
    if (res && !res.success) {
      setDeleteError(res.error || "Failed to delete batch.");
    } else {
      setDeleteBatchTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteProduct(deleteTarget.id);
    setIsDeleting(false);
    if (res && !res.success) {
      setDeleteError(res.error || "Failed to delete product.");
    } else {
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Product Name",
      render: (val, row) => {
        const isExpanded = expandedProductIds.includes(row.id);
        const batchCount = (row.batches || []).length;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleExpandProduct(row.id)}
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
                onClick={() => toggleExpandProduct(row.id)}
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
      key: "stock_quantity",
      label: "Total Stock",
      render: (val, row) => <StockBar quantity={val} unit={row.unit} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
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
            title="Delete product"
            aria-label="Delete product"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const renderBatchHistory = (product) => {
    const batches = product.batches || [];
    if (batches.length === 0) {
      return (
        <div className="p-4 rounded-lg bg-[var(--color-app-panel)] border border-[var(--color-app-border)] text-center flex flex-col items-center gap-2">
          <p className="text-sm text-[var(--color-app-text-muted)]">No stock batches recorded yet for this product.</p>
          <Button variant="primary" size="sm" onClick={() => openRestockModal(product)}>
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
            Total Remaining: <strong className="text-[var(--color-app-text)] font-mono">{product.stock_quantity} {product.unit || "kilo"}</strong>
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
                    <td className="px-3 py-2 font-mono">{batch.quantity_received} {product.unit || "kilo"}</td>
                    <td className="px-3 py-2 font-mono">
                      <span className={batch.quantity_remaining > 0 ? "text-[var(--color-app-success)] font-semibold" : "text-[var(--color-app-text-muted)]"}>
                        {batch.quantity_remaining} {product.unit || "kilo"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={!isUntouched}
                          onClick={() => isUntouched && openEditBatchModal(batch, product)}
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
      <PageContainer title="Products" subtitle="Manage your inventory catalog, grouped by category.">
        <LoadingState message="Loading inventory catalog..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Products" subtitle="Manage your inventory catalog, grouped by category.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Products"
      subtitle="Manage your inventory catalog, grouped by category."
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="secondary" size="sm" className="sm:text-sm sm:h-10 sm:px-4" onClick={() => setIsManageCatsOpen(true)}>
            Manage Categories
          </Button>
          <Button variant="primary" size="sm" className="sm:text-sm sm:h-10 sm:px-4" onClick={() => openAddModalWithCat()}>
            + Add Product
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
            placeholder="Search categories or products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grouped Product Lists */}
        <div className="flex flex-col gap-4">
          {filteredGroups.length === 0 ? (
            <Card padding="xl" className="text-center">
              <p className="text-[var(--color-app-text-muted)] mb-4">No categories or products found.</p>
              {search ? (
                <Button variant="secondary" onClick={() => setSearch("")}>Clear Search</Button>
              ) : (
                <Button variant="primary" onClick={() => setIsManageCatsOpen(true)}>Create a Category</Button>
              )}
            </Card>
          ) : (
            filteredGroups.map(group => (
              <details 
                key={group.id} 
                open={!!search || group.products.length > 0}
                className="group bg-[var(--color-app-bg)] rounded-xl border border-[var(--color-app-border)] overflow-hidden"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-[var(--color-app-panel)] hover:bg-[var(--color-app-elevated)] transition-colors border-b border-transparent group-open:border-[var(--color-app-border)]">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-app-text-muted)] transition-transform group-open:rotate-90">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <h3 className="text-base font-semibold text-[var(--color-app-text)]">{group.name}</h3>
                    <span className="text-xs font-mono font-medium text-[var(--color-app-text-muted)] px-2 py-0.5 rounded bg-[var(--color-app-elevated)] border border-[var(--color-app-border)]">
                      {group.products.length}
                    </span>
                  </div>
                  {group.products.length === 0 && !search && (
                    <span className="text-xs text-[var(--color-app-accent)] font-medium">Empty — Click to expand</span>
                  )}
                </summary>
                
                <div className="bg-[var(--color-app-bg)]">
                  {group.products.length > 0 ? (
                    <Table 
                      columns={columns} 
                      rows={group.products} 
                      expandedRowKeys={expandedProductIds}
                      renderExpandedRow={renderBatchHistory}
                      className="!border-0 !rounded-none" 
                    />
                  ) : (
                    <div className="px-4 py-8 text-center border-t border-[var(--color-app-border)]">
                      <p className="text-[var(--color-app-text-muted)] text-sm mb-4">No products in this category.</p>
                      <Button variant="secondary" onClick={() => openAddModalWithCat(group.id)}>+ Add Product Here</Button>
                    </div>
                  )}
                </div>
              </details>
            ))
          )}
        </div>
      </div>

      {/* ── Product Add Modal ── */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); resetForms(); }}
        title="Add New Product"
      >
        <form onSubmit={handleAddProductSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          {categories.length === 0 && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)]">
              You must create a category first before adding products.
            </div>
          )}
          
          <Select
            label="Category"
            value={addFormData.category_id}
            onChange={(e) => setAddFormData({ ...addFormData, category_id: e.target.value })}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            required
            disabled={categories.length === 0}
          />

          <Input
            label="Product Name"
            value={addFormData.name}
            onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
            placeholder="e.g. Medium Paper Bag"
            required
            autoFocus
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
              label="Default Sale Price (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={addFormData.sale_price}
              onChange={(e) => setAddFormData({ ...addFormData, sale_price: e.target.value })}
              placeholder="Leave blank = auto"
              helperText="Pre-fills the price when selling"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Initial Stock"
                  type="number"
                  min="0"
                  step="any"
                  value={addFormData.stock}
                  onChange={(e) => setAddFormData({ ...addFormData, stock: e.target.value })}
                  placeholder="0 (Optional)"
                />
              </div>
              <div className="w-24">
                <Input
                  label="Unit"
                  value={addFormData.unit}
                  onChange={(e) => setAddFormData({ ...addFormData, unit: e.target.value })}
                  placeholder="kilo"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsAddModalOpen(false); resetForms(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={categories.length === 0} loading={isSubmitting}>
              Add Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Product Edit Details Modal ── */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => { setIsEditModalOpen(false); resetForms(); }}
        title="Edit Product Details"
      >
        <form onSubmit={handleEditProductSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <Select
            label="Category"
            value={editFormData.category_id}
            onChange={(e) => setEditFormData({ ...editFormData, category_id: e.target.value })}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            required
          />

          <Input
            label="Product Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            placeholder="e.g. Medium Paper Bag"
            required
            autoFocus
          />

          <Input
            label="Unit"
            value={editFormData.unit}
            onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
            placeholder="kilo"
            required
          />

          <Input
            label="Default Sale Price (EGP)"
            type="number"
            min="0"
            step="0.01"
            value={editFormData.sale_price}
            onChange={(e) => setEditFormData({ ...editFormData, sale_price: e.target.value })}
            placeholder="Leave blank = auto (cost × 1.2)"
            helperText="Pre-fills the price when adding this product to a sale"
          />

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsEditModalOpen(false); resetForms(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Restock Batch Modal ── */}
      <Modal 
        isOpen={isRestockModalOpen} 
        onClose={() => { setIsRestockModalOpen(false); resetForms(); }}
        title={`Add Stock - ${restockForm.productName}`}
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
              step="any"
              value={restockForm.quantity_received}
              onChange={(e) => setRestockForm({ ...restockForm, quantity_received: e.target.value })}
              placeholder="e.g. 50"
              required
              autoFocus
            />
            <Input
              label="Batch Cost Price (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={restockForm.cost_price}
              onChange={(e) => setRestockForm({ ...restockForm, cost_price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <DatePicker
            label="Purchase Date"
            value={restockForm.purchase_date}
            onChange={(iso) => setRestockForm({ ...restockForm, purchase_date: iso })}
            required
          />

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsRestockModalOpen(false); resetForms(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Add Batch Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Batch Modal ── */}
      <Modal 
        isOpen={isEditBatchOpen} 
        onClose={() => { setIsEditBatchOpen(false); resetForms(); }}
        title={`Edit Batch - ${editBatchData.productName}`}
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
              step="any"
              value={editBatchData.quantity_received}
              onChange={(e) => setEditBatchData({ ...editBatchData, quantity_received: e.target.value })}
              placeholder="e.g. 50"
              required
              autoFocus
            />
            <Input
              label="Batch Cost Price (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={editBatchData.cost_price}
              onChange={(e) => setEditBatchData({ ...editBatchData, cost_price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <DatePicker
            label="Purchase Date"
            value={editBatchData.purchase_date}
            onChange={(iso) => setEditBatchData({ ...editBatchData, purchase_date: iso })}
            required
          />

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsEditBatchOpen(false); resetForms(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save Batch Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Product Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title="Delete Product"
      >
        <div className="flex flex-col gap-5">
          {deleteError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {deleteError}
            </div>
          )}

          <p className="text-[var(--color-app-text-muted)] text-sm leading-relaxed">
            Are you sure you want to delete <strong className="text-[var(--color-app-text)]">{deleteTarget?.name}</strong>? 
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(""); }} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={isDeleting}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Batch Modal ── */}
      <Modal
        isOpen={!!deleteBatchTarget}
        onClose={() => { setDeleteBatchTarget(null); setDeleteError(""); }}
        title="Delete Batch"
      >
        <div className="flex flex-col gap-5">
          {deleteError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {deleteError}
            </div>
          )}

          <p className="text-[var(--color-app-text-muted)] text-sm leading-relaxed">
            Are you sure you want to delete this batch of <strong className="text-[var(--color-app-text)]">{deleteBatchTarget?.quantity_received} units</strong> purchased on <strong className="text-[var(--color-app-text)]">{deleteBatchTarget?.purchase_date}</strong>?
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => { setDeleteBatchTarget(null); setDeleteError(""); }} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteBatchConfirm} loading={isDeleting}>Delete Batch</Button>
          </div>
        </div>
      </Modal>

      {/* ── Manage Categories Modal ── */}
      <ManageCategoriesModal 
        isOpen={isManageCatsOpen} 
        onClose={() => setIsManageCatsOpen(false)} 
      />
    </PageContainer>
  );
}
