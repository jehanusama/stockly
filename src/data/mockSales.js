export const mockSales = [
  {
    id: "s1",
    customer_id: "c1",
    product_id: "p2",
    quantity: 2,
    sale_price: 75.00,
    total_price: 150.00,
    profit: 60.00, // (75 - 45) * 2
    sale_date: "2023-10-01T10:30:00Z"
  },
  {
    id: "s2",
    customer_id: "c2",
    product_id: "p1",
    quantity: 5,
    sale_price: 25.00,
    total_price: 125.00,
    profit: 50.00, // (25 - 15) * 5
    sale_date: "2023-10-03T14:15:00Z"
  },
  {
    id: "s3",
    customer_id: "c4",
    product_id: "p6",
    quantity: 1,
    sale_price: 250.00,
    total_price: 250.00,
    profit: 100.00, // (250 - 150) * 1
    sale_date: "2023-10-05T09:45:00Z"
  },
  {
    id: "s4",
    customer_id: "c3",
    product_id: "p3",
    quantity: 3,
    sale_price: 40.00,
    total_price: 120.00,
    profit: 52.50, // (40 - 22.50) * 3
    sale_date: "2023-10-07T11:20:00Z"
  },
  {
    id: "s5",
    customer_id: "c1",
    product_id: "p5",
    quantity: 2,
    sale_price: 20.00,
    total_price: 40.00,
    profit: 16.00, // (20 - 12) * 2
    sale_date: "2023-10-10T16:00:00Z"
  },
  {
    id: "s6",
    customer_id: "c5",
    product_id: "p4",
    quantity: 4,
    sale_price: 60.00,
    total_price: 240.00,
    profit: 100.00, // (60 - 35) * 4
    sale_date: "2023-10-12T13:10:00Z"
  }
];
