import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const axiosInstance = axios.create({ baseURL: API_URL });

export const api = {
  axiosInstance,

  // --- VENDORS ---
  addVendor: (data) => axios.post(`${API_URL}/vendors/add`, data),
  searchVendor: (q) => axios.get(`${API_URL}/vendors/search?q=${q}`),
  updateVendor: (id, data) => axios.put(`${API_URL}/vendors/${id}`, data),
  getVendors: () => axios.get(`${API_URL}/vendors/list`),
  addAgent: (formData) => axios.post(`${API_URL}/vendors/add-agent`, formData),
  getVendorAgents: (id) => axios.get(`${API_URL}/vendors/${id}/agents`),
  updateAgent: (id, formData) => axios.put(`${API_URL}/vendors/agent/${id}`, formData),
  deleteAgent: (id) => axios.delete(`${API_URL}/vendors/agent/${id}`),
  vendorTransaction: (data) => axios.post(`${API_URL}/vendors/transaction`, data),
  getVendorTransactions: (id) => axios.get(`${API_URL}/vendors/${id}/transactions`),
  getVendorSalesHistory: (id) => axios.get(`${API_URL}/vendors/${id}/sales-history`),

  // --- INVENTORY ---
  addInventory: (formData) => axios.post(`${API_URL}/inventory/add`, formData),
  addBatchInventory: (data) => axios.post(`${API_URL}/inventory/batch-add`, data),
  getInventory: () => axios.get(`${API_URL}/inventory/list`),
  getVendorInventory: (id) => axios.get(`${API_URL}/vendors/${id}/inventory`), // Fixed Path mapping
  updateInventory: (id, data) => axios.put(`${API_URL}/inventory/update/${id}`, data),
  deleteInventory: (id) => axios.delete(`${API_URL}/inventory/${id}`),
  searchBillingItem: (q) => axios.get(`${API_URL}/inventory/search?q=${q}`), // Moved here for consistency

  // --- BILLING ---
  createBill: (data) => axios.post(`${API_URL}/billing/create-bill`, data),
  deleteBill: (id) => axios.delete(`${API_URL}/billing/delete/${id}`),
  getBillHistory: (search) => axios.get(`${API_URL}/billing/history`, { params: { search } }),
  addBalancePayment: (data) => axios.post(`${API_URL}/billing/add-payment`, data),
  getInvoiceDetails: (invoiceId) => axios.get(`${API_URL}/billing/invoice/${invoiceId}`),
  returnItem: (data) => axios.post(`${API_URL}/billing/return-item`, data),
  processReturn: (data) => axios.post(`${API_URL}/billing/process-return`, data),

  // --- AUDIT (New Module) ---
  startAudit: (data) => axios.post(`${API_URL}/audit/start`, data),
  scanAuditItem: (data) => axios.post(`${API_URL}/audit/scan`, data),
  getAuditReport: (id) => axios.get(`${API_URL}/audit/${id}/report`),
  finishAudit: (id) => axios.post(`${API_URL}/audit/${id}/finish`),

  // --- SHOPS ---
  addShop: (data) => axios.post(`${API_URL}/shops/add`, data),
  getShops: () => axios.get(`${API_URL}/shops/list?t=${Date.now()}`),
  getShopDetails: (id) => axios.get(`${API_URL}/shops/${id}`),
  updateShop: (id, data) => axios.put(`${API_URL}/shops/${id}`, data),
  deleteShop: (id) => axios.delete(`${API_URL}/shops/${id}`),
  shopTransaction: (data) => axios.post(`${API_URL}/shops/transaction`, data),
  deleteShopTransaction: (id) => axios.delete(`${API_URL}/shops/transaction/${id}`),
  settleShopTransaction: (id) => axios.post(`${API_URL}/shops/settle`, { transaction_id: id }),
  settleShopItem: (data) => axios.post(`${API_URL}/shops/settle-item`, data),
  getShopTransactionHistory: (id) => axios.get(`${API_URL}/shops/payment-history/${id}`),
  updateShopTransaction: (id, data) => axios.put(`${API_URL}/shops/transaction/${id}`, data),

  // --- CUSTOMERS ---
  searchCustomer: (query) => axios.get(`${API_URL}/customers/search?q=${query}`),
  getCustomers: () => axios.get(`${API_URL}/customers/list`),
  getCustomerDetails: (phone) => axios.get(`${API_URL}/customers/details/${phone}`),
  addCustomer: (data) => axios.post(`${API_URL}/customers/add`, data),
  updateCustomer: (id, data) => axios.put(`${API_URL}/customers/update/${id}`, data),
  getRecycleBin: () => axios.get(`${API_URL}/customers/recycle-bin`),
  softDeleteCustomer: (id) => axios.delete(`${API_URL}/customers/soft-delete/${id}`),
  restoreCustomer: (id) => axios.put(`${API_URL}/customers/restore/${id}`),
  permanentDeleteCustomer: (id) => axios.delete(`${API_URL}/customers/permanent/${id}`),

  // --- SETTINGS ---
  getDailyRates: () => axios.get(`${API_URL}/settings/rates`),
  updateDailyRate: (data) => axios.post(`${API_URL}/settings/rates`, data),
  getProductTypes: () => axios.get(`${API_URL}/settings/types`),
  addProductType: (data) => axios.post(`${API_URL}/settings/types`, data),
  updateProductType: (id, data) => axios.put(`${API_URL}/settings/types/${id}`, data),
  deleteProductType: (id) => axios.delete(`${API_URL}/settings/types/${id}`),
  getMasterItems: () => axios.get(`${API_URL}/settings/items`),
  addMasterItemsBulk: (data) => axios.post(`${API_URL}/settings/items/bulk`, data), 
  updateMasterItem: (id, data) => axios.put(`${API_URL}/settings/items/${id}`, data), 
  deleteMasterItem: (id) => axios.delete(`${API_URL}/settings/items/${id}`),

  // --- BUSINESS SETTINGS ---
  getBusinessSettings: () => axios.get(`${API_URL}/settings/business`),
  saveBusinessSettings: (formData) => axios.post(`${API_URL}/settings/business`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // --- LEDGER ---
  getLedgerStats: () => axios.get(`${API_URL}/ledger/stats`),
  getLedgerHistory: (search, date) => axios.get(`${API_URL}/ledger/history`, { params: { search, date } }),
  addExpense: (data) => axios.post(`${API_URL}/ledger/expense`, data),
  adjustBalance: (data) => axios.post(`${API_URL}/ledger/adjust`, data),

  // --- OLD METAL ---
  getOldMetalStats: () => axios.get(`${API_URL}/old-metal/stats`),
  getOldMetalList: () => axios.get(`${API_URL}/old-metal/list`),
  addOldMetalPurchase: (data) => axios.post(`${API_URL}/old-metal/purchase`, data),
  deleteOldMetal: (id) => axios.delete(`${API_URL}/old-metal/${id}`),
  
  // --- REFINERY ---
  getRefineryBatches: () => axios.get(`${API_URL}/refinery/batches`),
  getPendingScrap: (metalType) => axios.get(`${API_URL}/refinery/pending-scrap?metal_type=${metalType}`),
  createRefineryBatch: (data) => axios.post(`${API_URL}/refinery/create-batch`, data),
  
  // NEW: Get Items inside a specific batch
  getBatchItems: (id) => axios.get(`${API_URL}/refinery/batch/${id}/items`),

  receiveRefinedGold: (formData) => axios.post(`${API_URL}/refinery/receive-refined`, formData, { // Assuming JSON, fixed form-data if backend expects JSON
     // headers: { 'Content-Type': 'application/json' } 
     // Note: Backend code for 'receive-refined' used `req.body` directly, so JSON is safer unless you changed it to multer.
     // If backend is pure JSON:
  }),
  // Alternative Receive (JSON) - Safest for current backend code provided earlier:
  receiveRefinedGoldJSON: (data) => axios.post(`${API_URL}/refinery/receive-refined`, data),

  useRefinedStock: (data) => axios.post(`${API_URL}/refinery/use-stock`, data),

  // --- EXTERNAL GST BILLING ---
  getGstHistory: () => axios.get(`${API_URL}/gst/history`),
  getGstBill: (id) => axios.get(`${API_URL}/gst/${id}`),
  createGstBill: (data) => axios.post(`${API_URL}/gst/create`, data),
  updateGstBill: (id, data) => axios.put(`${API_URL}/gst/update/${id}`, data),
  deleteGstBill: (id) => axios.delete(`${API_URL}/gst/${id}`),
};