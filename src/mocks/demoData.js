// Synthetic demo fixtures only. These are not live shop, rider or customer records.
export const demoShops = [
  { id: 'shop-1', name: 'Sharma General Store', area: 'Indirapuram' },
  { id: 'shop-2', name: 'Fresh Basket Kirana', area: 'Niti Khand' },
  { id: 'shop-3', name: 'Daily Needs Corner', area: 'Vaibhav Khand' },
];

export const demoRiders = [
  { id: 'rider-1', name: 'Rider 01', capacity: 10, status: 'Available' },
  { id: 'rider-2', name: 'Rider 02', capacity: 8, status: 'Available' },
];

export const demoOrders = [
  { id: 'KP-1001', shopId: 'shop-1', shopName: 'Sharma General Store', customerLabel: 'Customer A · Indirapuram', load: 2, status: 'pending', createdLabel: '09:10 AM' },
  { id: 'KP-1002', shopId: 'shop-2', shopName: 'Fresh Basket Kirana', customerLabel: 'Customer B · Niti Khand', load: 1, status: 'pending', createdLabel: '09:18 AM' },
  { id: 'KP-1003', shopId: 'shop-1', shopName: 'Sharma General Store', customerLabel: 'Customer C · Indirapuram', load: 3, status: 'planned', createdLabel: '09:24 AM' },
  { id: 'KP-1004', shopId: 'shop-3', shopName: 'Daily Needs Corner', customerLabel: 'Customer D · Vaibhav Khand', load: 1, status: 'pending', createdLabel: '09:31 AM' },
  { id: 'KP-1005', shopId: 'shop-2', shopName: 'Fresh Basket Kirana', customerLabel: 'Customer E · Niti Khand', load: 2, status: 'delivered', createdLabel: '08:42 AM' },
];

export const demoPlan = {
  pooled: {
    routes: [
      {
        riderId: 'rider-1',
        orderIds: ['KP-1001', 'KP-1002', 'KP-1003'],
        stops: [
          { id: 'stop-1', label: 'Sharma General Store', type: 'pickup', etaMin: 0 },
          { id: 'stop-2', label: 'Customer A · Indirapuram', type: 'delivery', etaMin: 8 },
          { id: 'stop-3', label: 'Fresh Basket Kirana', type: 'pickup', etaMin: 14 },
          { id: 'stop-4', label: 'Customer B · Niti Khand', type: 'delivery', etaMin: 22 },
          { id: 'stop-5', label: 'Customer C · Indirapuram', type: 'delivery', etaMin: 29 },
        ],
        distanceKm: 4.8,
        durationMin: 29,
        cost: 78.4,
      },
      {
        riderId: 'rider-2',
        orderIds: ['KP-1004'],
        stops: [
          { id: 'stop-6', label: 'Daily Needs Corner', type: 'pickup', etaMin: 0 },
          { id: 'stop-7', label: 'Customer D · Vaibhav Khand', type: 'delivery', etaMin: 12 },
        ],
        distanceKm: 2.1,
        durationMin: 12,
        cost: 56.8,
      },
    ],
    totalCost: 135.2,
  },
  solo: { totalCost: 192, routes: [] },
  savings: { amount: 56.8, percent: 29.58, perShop: [] },
  meta: { algorithm: 'synthetic-demo', fallbackUsed: true, warnings: ['Illustrative synthetic data; not a live optimisation result.'] },
};
