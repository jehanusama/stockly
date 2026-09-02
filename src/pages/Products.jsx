import { useState, useMemo } from "react";
import { Button, Card, Table, Input, Modal, StockBar, Select, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

function ManageCategoriesModal({ isOpen, onClose }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useAppData();
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
          {categories.length === 0 ? (
            <p className="text-sm text-[var(--color-app-text-muted)] italic py-4 text-center">No categories exist.</p>
          ) : (
            <div className="flex flex-col rounded-lg border border-[var(--color-app-border)] overflow-hidden">
              {categories.map(c => (
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
  const { products, categories, addProduct, updateProduct, deleteProduct, isLoading, error, refreshData } = useAppData();
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Form State
  const [formData, setFormData] = useState({ id: "", category_id: "", name: "", cost: "", stock: "", unit: "kilo" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const resetForm = () => {
    setFormData({ id: "", category_id: "", name: "", cost: "", stock: "", unit: "kilo" });
    setFormError("");
  };

  const openAddModalWithCat = (catId = "") => {
    resetForm();
    if (catId) setFormData(prev => ({ ...prev, category_id: catId }));
    else if (categories.length > 0) setFormData(prev => ({ ...prev, category_id: categories[0].id }));
    setIsAddModalOpen(true);
  };

  // Group and Filter Products
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    
    // Group products by category
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

    // Sort categories alphabetically
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, categories, search]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.cost || !formData.stock || !formData.category_id) return;
    
    setIsSubmitting(true);
    setFormError("");

    if (isAddModalOpen) {
      const newProduct = {
        category_id: formData.category_id,
        name: formData.name.trim(),
        cost_price: parseFloat(formData.cost),
        stock_quantity: parseInt(formData.stock, 10),
        unit: formData.unit || "kilo"
      };
      const res = await addProduct(newProduct);
      setIsSubmitting(false);
      if (res && !res.success) {
        setFormError(res.error || "Failed to add product.");
        return;
      }
      setIsAddModalOpen(false);
    } else if (isEditModalOpen) {
      const res = await updateProduct({
        id: formData.id,
        category_id: formData.category_id,
        name: formData.name.trim(),
        cost_price: parseFloat(formData.cost),
        stock_quantity: parseInt(formData.stock, 10),
        unit: formData.unit || "kilo"
      });
      setIsSubmitting(false);
      if (res && !res.success) {
        setFormError(res.error || "Failed to update product.");
        return;
      }
      setIsEditModalOpen(false);
    }
    resetForm();
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

  const openEditModal = (product) => {
    setFormData({
      id: product.id,
      category_id: product.category_id,
      name: product.name,
      cost: product.cost_price.toString(),
      stock: product.stock_quantity.toString(),
      unit: product.unit || "kilo"
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const columns = [
    {
      key: "name",
      label: "Product Name",
      render: (val) => <span className="font-semibold text-[var(--color-app-text)]">{val}</span>,
    },
    {
      key: "cost_price",
      label: "Cost Price",
      render: (val) => <span className="font-mono text-[var(--color-app-text-muted)]">{formatCurrency(val)}</span>,
    },
    {
      key: "stock_quantity",
      label: "Stock Level",
      render: (val, row) => <StockBar quantity={val} unit={row.unit} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>Edit</Button>
          <button
            type="button"
            className="p-1.5 rounded text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-danger-muted)] transition-colors"
            onClick={() => setDeleteTarget(row)}
            title="Delete product"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      ),
    },
  ];

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
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsManageCatsOpen(true)}>
            Manage Categories
          </Button>
          <Button variant="primary" onClick={() => openAddModalWithCat()}>
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

      {/* ── Product Add/Edit Modal ── */}
      <Modal 
        isOpen={isAddModalOpen || isEditModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
        title={isAddModalOpen ? "Add New Product" : "Edit Product"}
      >
        <form onSubmit={handleSaveProduct} className="flex flex-col gap-5">
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
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            required
            disabled={categories.length === 0}
          />

          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Medium Paper Bag"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost Price (EGP)"
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="0.00"
              required
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Initial Stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="w-24">
                <Input
                  label="Unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="kilo"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={categories.length === 0} loading={isSubmitting}>
              {isAddModalOpen ? "Add Product" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
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
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={isDeleting}>Delete</Button>
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
