// DEMO DATA for Phase 1 Demo Mode
export const DEMO_ROLES = [
  { id: 'role-1', name: 'ADMIN', description: 'System Administrator' },
  { id: 'role-2', name: 'INVENTORY_MANAGER', description: 'Inventory Manager' },
  { id: 'role-3', name: 'WAREHOUSE_SUPERVISOR', description: 'Warehouse Supervisor' },
  { id: 'role-4', name: 'WAREHOUSE_STAFF', description: 'Warehouse Staff' }
];

export const DEMO_USERS = [
  { id: 'usr-1', first_name: 'Fine', last_name: 'Stock Admin', email: 'admin@finestock.demo', role: DEMO_ROLES[0], is_active: true, created_at: '2023-10-01T00:00:00Z' },
  { id: 'usr-2', first_name: 'Jane', last_name: 'Manager', email: 'jane@finestock.demo', role: DEMO_ROLES[1], is_active: true, created_at: '2023-10-02T00:00:00Z' },
  { id: 'usr-3', first_name: 'John', last_name: 'Supervisor', email: 'john@finestock.demo', role: DEMO_ROLES[2], is_active: true, created_at: '2023-10-03T00:00:00Z' },
  { id: 'usr-4', first_name: 'Bob', last_name: 'Staff', email: 'bob@finestock.demo', role: DEMO_ROLES[3], is_active: true, created_at: '2023-10-04T00:00:00Z' }
];

export const DEMO_CATEGORIES = [
  { id: 'cat-1', name: 'Electronics', description: 'Electronic items' },
  { id: 'cat-2', name: 'Accessories', description: 'Computer accessories' },
  { id: 'cat-3', name: 'Office Supplies', description: 'General office supplies' },
  { id: 'cat-4', name: 'Hardware', description: 'IT Hardware' },
  { id: 'cat-5', name: 'Packaging', description: 'Packaging materials' },
  { id: 'cat-6', name: 'Safety Equipment', description: 'Warehouse safety equipment' }
];

export const DEMO_UOMS = [
  { id: 'uom-1', name: 'Piece', abbreviation: 'pcs' },
  { id: 'uom-2', name: 'Box', abbreviation: 'box' },
  { id: 'uom-3', name: 'Set', abbreviation: 'set' },
  { id: 'uom-4', name: 'Kilogram', abbreviation: 'kg' },
  { id: 'uom-5', name: 'Litre', abbreviation: 'L' }
];

export const DEMO_PRODUCTS = [
  { id: 'prod-1', sku: 'ELEC-WKB-001', name: 'Wireless Keyboard', category: DEMO_CATEGORIES[0], uom: DEMO_UOMS[0], reorder_point: 20, reorder_quantity: 50, is_active: true, current_stock: 8, status: 'Critical' },
  { id: 'prod-2', sku: 'ACC-USBC-002', name: 'USB-C Cable', category: DEMO_CATEGORIES[1], uom: DEMO_UOMS[0], reorder_point: 30, reorder_quantity: 100, is_active: true, current_stock: 14, status: 'Low Stock' },
  { id: 'prod-3', sku: 'OFF-LST-003', name: 'Laptop Stand', category: DEMO_CATEGORIES[2], uom: DEMO_UOMS[0], reorder_point: 25, reorder_quantity: 50, is_active: true, current_stock: 74, status: 'Healthy' },
  { id: 'prod-4', sku: 'SCAN-BAR-004', name: 'Barcode Scanner', category: DEMO_CATEGORIES[3], uom: DEMO_UOMS[0], reorder_point: 15, reorder_quantity: 20, is_active: true, current_stock: 6, status: 'Critical' },
  { id: 'prod-5', sku: 'PRINT-THERM-005', name: 'Thermal Printer', category: DEMO_CATEGORIES[3], uom: DEMO_UOMS[0], reorder_point: 25, reorder_quantity: 30, is_active: true, current_stock: 11, status: 'Low Stock' },
  { id: 'prod-6', sku: 'ELEC-MON-006', name: '27" IPS Monitor', category: DEMO_CATEGORIES[0], uom: DEMO_UOMS[0], reorder_point: 10, reorder_quantity: 20, is_active: true, current_stock: 45, status: 'Healthy' },
  { id: 'prod-7', sku: 'ACC-MOU-007', name: 'Ergonomic Mouse', category: DEMO_CATEGORIES[1], uom: DEMO_UOMS[0], reorder_point: 15, reorder_quantity: 40, is_active: true, current_stock: 32, status: 'Healthy' },
  { id: 'prod-8', sku: 'OFF-CH-008', name: 'Office Chair', category: DEMO_CATEGORIES[2], uom: DEMO_UOMS[0], reorder_point: 5, reorder_quantity: 10, is_active: true, current_stock: 18, status: 'Healthy' },
  { id: 'prod-9', sku: 'PKG-BOX-009', name: 'Corrugated Box Large', category: DEMO_CATEGORIES[4], uom: DEMO_UOMS[1], reorder_point: 100, reorder_quantity: 500, is_active: true, current_stock: 450, status: 'Healthy' },
  { id: 'prod-10', sku: 'PKG-TP-010', name: 'Packing Tape', category: DEMO_CATEGORIES[4], uom: DEMO_UOMS[1], reorder_point: 50, reorder_quantity: 200, is_active: true, current_stock: 120, status: 'Healthy' },
  { id: 'prod-11', sku: 'SAF-GLV-011', name: 'Safety Gloves', category: DEMO_CATEGORIES[5], uom: DEMO_UOMS[2], reorder_point: 30, reorder_quantity: 100, is_active: true, current_stock: 22, status: 'Critical' },
  { id: 'prod-12', sku: 'SAF-HLM-012', name: 'Hard Hat', category: DEMO_CATEGORIES[5], uom: DEMO_UOMS[0], reorder_point: 20, reorder_quantity: 50, is_active: true, current_stock: 65, status: 'Healthy' }
];

export const DEMO_WAREHOUSES = [
  { id: 'wh-1', name: 'Chennai Main Warehouse', code: 'CHN-MAIN', city: 'Chennai', is_active: true, locations_count: 5, stock_units: 8420, utilization: 75, status: 'Healthy' },
  { id: 'wh-2', name: 'Bangalore Warehouse', code: 'BLR-01', city: 'Bangalore', is_active: true, locations_count: 3, stock_units: 4680, utilization: 62, status: 'Healthy' },
  { id: 'wh-3', name: 'Coimbatore Warehouse', code: 'CBE-01', city: 'Coimbatore', is_active: true, locations_count: 2, stock_units: 2940, utilization: 48, status: 'Healthy' },
  { id: 'wh-4', name: 'Hyderabad Warehouse', code: 'HYD-01', city: 'Hyderabad', is_active: true, locations_count: 2, stock_units: 2410, utilization: 55, status: 'Attention' }
];

export const DEMO_LOCATIONS = [
  { id: 'loc-1', warehouse: DEMO_WAREHOUSES[0], name: 'CHN-A-01', zone: 'A', rack: '01', shelf: '01' },
  { id: 'loc-2', warehouse: DEMO_WAREHOUSES[0], name: 'CHN-A-02', zone: 'A', rack: '02', shelf: '01' },
  { id: 'loc-3', warehouse: DEMO_WAREHOUSES[0], name: 'CHN-B-01', zone: 'B', rack: '01', shelf: '01' },
  { id: 'loc-4', warehouse: DEMO_WAREHOUSES[0], name: 'CHN-B-02', zone: 'B', rack: '02', shelf: '01' },
  { id: 'loc-5', warehouse: DEMO_WAREHOUSES[0], name: 'CHN-C-01', zone: 'C', rack: '01', shelf: '01' },
  { id: 'loc-6', warehouse: DEMO_WAREHOUSES[1], name: 'BLR-A-01', zone: 'A', rack: '01', shelf: '01' },
  { id: 'loc-7', warehouse: DEMO_WAREHOUSES[1], name: 'BLR-A-02', zone: 'A', rack: '02', shelf: '01' },
  { id: 'loc-8', warehouse: DEMO_WAREHOUSES[1], name: 'BLR-B-01', zone: 'B', rack: '01', shelf: '01' },
  { id: 'loc-9', warehouse: DEMO_WAREHOUSES[2], name: 'CBE-A-01', zone: 'A', rack: '01', shelf: '01' },
  { id: 'loc-10', warehouse: DEMO_WAREHOUSES[2], name: 'CBE-B-01', zone: 'B', rack: '01', shelf: '01' },
  { id: 'loc-11', warehouse: DEMO_WAREHOUSES[3], name: 'HYD-A-01', zone: 'A', rack: '01', shelf: '01' },
  { id: 'loc-12', warehouse: DEMO_WAREHOUSES[3], name: 'HYD-B-01', zone: 'B', rack: '01', shelf: '01' }
];

export const DEMO_INVENTORY = [
  { id: 'inv-1', product: DEMO_PRODUCTS[0], location: DEMO_LOCATIONS[0], quantity: 8, reserved_quantity: 0 },
  { id: 'inv-2', product: DEMO_PRODUCTS[1], location: DEMO_LOCATIONS[1], quantity: 14, reserved_quantity: 2 },
  { id: 'inv-3', product: DEMO_PRODUCTS[2], location: DEMO_LOCATIONS[2], quantity: 74, reserved_quantity: 10 },
  { id: 'inv-4', product: DEMO_PRODUCTS[3], location: DEMO_LOCATIONS[3], quantity: 6, reserved_quantity: 1 },
  { id: 'inv-5', product: DEMO_PRODUCTS[4], location: DEMO_LOCATIONS[5], quantity: 11, reserved_quantity: 4 },
  { id: 'inv-6', product: DEMO_PRODUCTS[5], location: DEMO_LOCATIONS[6], quantity: 45, reserved_quantity: 5 },
  { id: 'inv-7', product: DEMO_PRODUCTS[6], location: DEMO_LOCATIONS[7], quantity: 32, reserved_quantity: 2 },
  { id: 'inv-8', product: DEMO_PRODUCTS[7], location: DEMO_LOCATIONS[8], quantity: 18, reserved_quantity: 3 },
  { id: 'inv-9', product: DEMO_PRODUCTS[8], location: DEMO_LOCATIONS[9], quantity: 450, reserved_quantity: 50 },
  { id: 'inv-10', product: DEMO_PRODUCTS[9], location: DEMO_LOCATIONS[10], quantity: 120, reserved_quantity: 10 },
  { id: 'inv-11', product: DEMO_PRODUCTS[10], location: DEMO_LOCATIONS[11], quantity: 22, reserved_quantity: 2 },
  { id: 'inv-12', product: DEMO_PRODUCTS[11], location: DEMO_LOCATIONS[0], quantity: 65, reserved_quantity: 5 }
];

export const DEMO_ACTIVITY = [
  { id: 'act-1', time: '08:42', action: 'Stock received', product: 'Wireless Keyboard', qty: '+120 units', warehouse: 'Chennai Main Warehouse', status: 'Completed' },
  { id: 'act-2', time: '08:15', action: 'Stock transferred', product: 'USB-C Cable', qty: '-40 units', warehouse: 'Chennai → Bangalore', status: 'In Transit' },
  { id: 'act-3', time: '07:50', action: 'Stock adjustment', product: 'Barcode Scanner', qty: '+5 units', warehouse: 'Chennai Main Warehouse', status: 'Completed' },
  { id: 'act-4', time: '07:22', action: 'Stock received', product: 'Thermal Printer', qty: '+30 units', warehouse: 'Hyderabad Warehouse', status: 'Completed' },
  { id: 'act-5', time: '06:55', action: 'Stock issued', product: 'Laptop Stand', qty: '-18 units', warehouse: 'Bangalore Warehouse', status: 'Completed' }
];

export const DEMO_MOVEMENT = [
  { day: 'Monday', received: 420, issued: 260 },
  { day: 'Tuesday', received: 510, issued: 310 },
  { day: 'Wednesday', received: 380, issued: 295 },
  { day: 'Thursday', received: 620, issued: 340 },
  { day: 'Friday', received: 450, issued: 380 },
  { day: 'Saturday', received: 290, issued: 210 },
  { day: 'Sunday', received: 360, issued: 270 }
];

export const DEMO_DASHBOARD_SUMMARY = {
  total_products: 128,
  active_products: 116,
  total_warehouses: 4,
  total_locations: 36,
  total_stock_units: 18450,
  low_stock_products: 12,
  out_of_stock_products: 3,
  active_users: 24,
  physical_stock: 18450,
  reserved_stock: 2180,
  available_stock: 16270,
  inventory_accuracy: 96.8,
  stock_status: {
    healthy: 92,
    low: 12,
    critical: 5,
    out: 3
  }
};

export const DEMO_OPERATIONS = [
  { id: 'OP-2023-1001', type: 'RECEIPT', product: 'Wireless Keyboard', quantity: 120, source: 'Vendor A', destination: 'CHN-MAIN', warehouse: 'Chennai Main Warehouse', created_by: 'Fine Stock Admin', date: '2023-10-01T08:42:00Z', status: 'COMPLETED' },
  { id: 'OP-2023-1002', type: 'TRANSFER', product: 'USB-C Cable', quantity: 40, source: 'CHN-MAIN', destination: 'BLR-01', warehouse: 'Multiple', created_by: 'John Supervisor', date: '2023-10-01T08:15:00Z', status: 'PROCESSING' },
  { id: 'OP-2023-1003', type: 'ADJUSTMENT', product: 'Barcode Scanner', quantity: 5, source: 'N/A', destination: 'CHN-MAIN', warehouse: 'Chennai Main Warehouse', created_by: 'Fine Stock Admin', date: '2023-10-01T07:50:00Z', status: 'COMPLETED' },
  { id: 'OP-2023-1004', type: 'RECEIPT', product: 'Thermal Printer', quantity: 30, source: 'Vendor B', destination: 'HYD-01', warehouse: 'Hyderabad Warehouse', created_by: 'Jane Manager', date: '2023-10-01T07:22:00Z', status: 'COMPLETED' },
  { id: 'OP-2023-1005', type: 'DELIVERY', product: 'Laptop Stand', quantity: 18, source: 'BLR-01', destination: 'Customer X', warehouse: 'Bangalore Warehouse', created_by: 'Bob Staff', date: '2023-10-01T06:55:00Z', status: 'PENDING' },
  { id: 'OP-2023-1006', type: 'DELIVERY', product: '27" IPS Monitor', quantity: 10, source: 'CHN-MAIN', destination: 'Customer Y', warehouse: 'Chennai Main Warehouse', created_by: 'Bob Staff', date: '2023-10-01T10:30:00Z', status: 'DRAFT' },
];

export const DEMO_LEDGER = [
  { id: 'LEDG-001', timestamp: '2023-10-01T08:42:00Z', product: 'Wireless Keyboard', sku: 'ELEC-WKB-001', operation_id: 'OP-2023-1001', type: 'RECEIPT', quantity: 120, before: 8, after: 128, warehouse: 'Chennai Main Warehouse', location: 'CHN-A-01', performed_by: 'Fine Stock Admin', reason: 'PO-9921', reference: 'Vendor A' },
  { id: 'LEDG-002', timestamp: '2023-10-01T08:15:00Z', product: 'USB-C Cable', sku: 'ACC-USBC-002', operation_id: 'OP-2023-1002', type: 'TRANSFER_OUT', quantity: -40, before: 54, after: 14, warehouse: 'Chennai Main Warehouse', location: 'CHN-B-01', performed_by: 'John Supervisor', reason: 'Stock rebalance', reference: 'TR-BLR-01' },
  { id: 'LEDG-003', timestamp: '2023-10-01T07:50:00Z', product: 'Barcode Scanner', sku: 'SCAN-BAR-004', operation_id: 'OP-2023-1003', type: 'ADJUSTMENT_IN', quantity: 5, before: 1, after: 6, warehouse: 'Chennai Main Warehouse', location: 'CHN-C-01', performed_by: 'Fine Stock Admin', reason: 'Found during cycle count', reference: 'CC-2023-10' },
  { id: 'LEDG-004', timestamp: '2023-10-01T07:22:00Z', product: 'Thermal Printer', sku: 'PRINT-THERM-005', operation_id: 'OP-2023-1004', type: 'RECEIPT', quantity: 30, before: 11, after: 41, warehouse: 'Hyderabad Warehouse', location: 'HYD-A-01', performed_by: 'Jane Manager', reason: 'PO-9922', reference: 'Vendor B' },
  { id: 'LEDG-005', timestamp: '2023-10-01T06:55:00Z', product: 'Laptop Stand', sku: 'OFF-LST-003', operation_id: 'OP-2023-1005', type: 'DELIVERY', quantity: -18, before: 92, after: 74, warehouse: 'Bangalore Warehouse', location: 'BLR-B-01', performed_by: 'Bob Staff', reason: 'SO-1045', reference: 'Customer X' },
];
