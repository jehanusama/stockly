export const mockOrders = [
  {
    id: "o1",
    customer_id: "c1",
    order_date: "2023-10-01T10:30:00Z",
    discount_type: "none",
    discount_value: 0,
    subtotal: 150.00,
    total_cost: 90.00,
    final_total: 150.00,
    final_profit: 60.00,
    items: [
      { product_id: "p2", quantity: 2, sale_price: 75.00, cost_price: 45.00, line_total: 150.00, line_profit: 60.00 }
    ]
  },
  {
    id: "o2",
    customer_id: "c2",
    order_date: "2023-10-03T14:15:00Z",
    discount_type: "fixed",
    discount_value: 20.00,
    subtotal: 125.00,
    total_cost: 75.00,
    final_total: 105.00,
    final_profit: 30.00,
    items: [
      { product_id: "p1", quantity: 5, sale_price: 25.00, cost_price: 15.00, line_total: 125.00, line_profit: 50.00 }
    ]
  },
  {
    id: "o3",
    customer_id: "c4",
    order_date: "2023-10-05T09:45:00Z",
    discount_type: "percentage",
    discount_value: 10, // 10%
    subtotal: 290.00, // p6 (250) + p3 (40)
    total_cost: 172.50, // p6 (150) + p3 (22.50)
    final_total: 261.00, // 290 - 29 (10%)
    final_profit: 88.50, // 261 - 172.50
    items: [
      { product_id: "p6", quantity: 1, sale_price: 250.00, cost_price: 150.00, line_total: 250.00, line_profit: 100.00 },
      { product_id: "p3", quantity: 1, sale_price: 40.00, cost_price: 22.50, line_total: 40.00, line_profit: 17.50 }
    ]
  },
  {
    id: "o4",
    customer_id: "c3",
    order_date: "2023-10-07T11:20:00Z",
    discount_type: "none",
    discount_value: 0,
    subtotal: 120.00,
    total_cost: 67.50,
    final_total: 120.00,
    final_profit: 52.50,
    items: [
      { product_id: "p3", quantity: 3, sale_price: 40.00, cost_price: 22.50, line_total: 120.00, line_profit: 52.50 }
    ]
  },
  {
    id: "o5",
    customer_id: "c1",
    order_date: "2023-10-10T16:00:00Z",
    discount_type: "fixed",
    discount_value: 10.00,
    subtotal: 100.00, // p5(20 * 2 = 40) + p4(60 * 1 = 60)
    total_cost: 59.00, // p5(12 * 2 = 24) + p4(35 * 1 = 35)
    final_total: 90.00,
    final_profit: 31.00,
    items: [
      { product_id: "p5", quantity: 2, sale_price: 20.00, cost_price: 12.00, line_total: 40.00, line_profit: 16.00 },
      { product_id: "p4", quantity: 1, sale_price: 60.00, cost_price: 35.00, line_total: 60.00, line_profit: 25.00 }
    ]
  },
  {
    id: "o6",
    customer_id: "c5",
    order_date: "2023-10-12T13:10:00Z",
    discount_type: "none",
    discount_value: 0,
    subtotal: 240.00,
    total_cost: 140.00,
    final_total: 240.00,
    final_profit: 100.00,
    items: [
      { product_id: "p4", quantity: 4, sale_price: 60.00, cost_price: 35.00, line_total: 240.00, line_profit: 100.00 }
    ]
  }
];
