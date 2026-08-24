import { useState, useMemo } from "react";
import { Button, Card, Table, Input, Modal, StockBar } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { mockProducts as initialProducts } from "@/data/mockProducts";
import { formatCurrency } from "@/utils/currency";

export default function Products() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ id: "", name: "", cost: "", stock: "" });

  const resetForm = () => setFormData({ id: "", name: "", cost: "", stock: "" });

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.cost || !formData.stock) return;
    
    if (isAddModalOpen) {
      const newProduct = {
        id: `p${Date.now()}`,
        name: formData.name,
        cost_price: parseFloat(formData.cost),
        stock_quantity: parseInt(formData.stock, 10),
        unit: "pcs"
      };
      setProducts([newProduct, ...products]);
      setIsAddModalOpen(false);
    } else if (isEditModalOpen) {
      setProducts(products.map(p => 
        p.id === formData.id 
          ? { ...p, name: formData.name, cost_price: parseFloat(formData.cost), stock_quantity: parseInt(formData.stock, 10) }
          : p
      ));
      setIsEditModalOpen(false);
    }
    resetForm();
  };

  const openEditModal = (product) => {
    setFormData({
      id: product.id,
      name: product.name,
      cost: product.cost_price.toString(),
      stock: product.stock_quantity.toString()
    });
    setIsEditModalOpen(true);
  };

  const columns = [
    { key: "name", label: "Product Name", render: (val) => <span className="font-medium text-[var(--color-app-text)]">{val}</span> },
    { key: "cost_price", label: "Cost Price", align: "right", render: (val) => <span className="font-mono text-[var(--color-app-text)]">{formatCurrency(val)}</span> },
    { key: "stock_quantity", label: "Inventory Level", align: "right", render: (val, row) => <span className="font-mono text-[var(--color-app-text)]">{val} <span className="text-[var(--color-app-text-subtle)]">{row.unit}</span></span> },
    { key: "health", label: "Health", render: (_, row) => <StockBar current={row.stock_quantity} threshold={10} /> },
    { key: "actions", label: "", align: "right", render: (_, row) => (
      <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openEditModal(row)}>Edit</Button>
    )}
  ];

  const tableRows = filteredProducts.map(p => ({
    ...p,
    className: p.stock_quantity < 10 ? "bg-[var(--color-app-danger)]/5 border-l-2 border-l-[var(--color-app-danger)]" : "border-l-2 border-l-transparent"
  }));

  const productForm = (
    <form onSubmit={handleSaveProduct} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-2">Details</h4>
        <Input label="Product Name" placeholder="e.g. شنطة جلد أصلي" dir="auto" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-2">Pricing & Inventory</h4>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Cost Price (EGP)" type="number" step="0.01" placeholder="0.00" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} required />
          <Input label="Current Stock" type="number" placeholder="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required />
        </div>
        
        {formData.stock !== "" && (
          <div className="mt-2 p-4 bg-[var(--color-app-bg)] rounded-lg border border-[var(--color-app-border)] flex items-center justify-between">
            <span className="text-sm text-[var(--color-app-text-muted)]">Predicted Health:</span>
            <StockBar current={parseInt(formData.stock, 10) || 0} threshold={10} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-app-border)]">
        <Button variant="secondary" type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}>Cancel</Button>
        <Button variant="primary" type="submit">{isAddModalOpen ? "Save Product" : "Save Changes"}</Button>
      </div>
    </form>
  );

  return (
    <PageContainer 
      title="Products" 
      subtitle="Manage your inventory and track stock levels."
      actions={<Button variant="primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>+ Add Product</Button>}
    >
      <div className="flex flex-col h-[calc(100vh-180px)] pb-8">
        <Card className="flex flex-col flex-1 min-h-0 relative border-[var(--color-app-border)] p-0 overflow-hidden">
          <div className="sticky top-0 z-10 p-4 border-b border-[var(--color-app-border)] bg-[var(--color-app-panel)] rounded-t-xl">
            <Input 
              placeholder="Search products by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-[var(--color-app-bg)] border-[var(--color-app-border)] shadow-sm"
            />
          </div>

          <div className="flex-1 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center mb-4 border border-[var(--color-app-border)] shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-app-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[var(--color-app-text)] mb-2">No products found</h3>
                <p className="text-sm text-[var(--color-app-text-muted)] mb-6 max-w-sm">
                  {search ? "We couldn't find anything matching your search." : "Your inventory is currently empty. Add your first product to start tracking."}
                </p>
                {!search && <Button variant="primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>Add your first product</Button>}
              </div>
            ) : (
              <Table columns={columns} rows={tableRows} className="border-0 rounded-none rounded-b-xl" />
            )}
          </div>
        </Card>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} title="Add New Product">
        {productForm}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title="Edit Product">
        {productForm}
      </Modal>
    </PageContainer>
  );
}
