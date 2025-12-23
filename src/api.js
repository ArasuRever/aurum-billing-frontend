import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create instance for advanced usage (like Refinery uploads)
const axiosInstance = axios.create({ baseURL: API_URL });

export const api = {
  axiosInstance, // Export instance for direct usage

  // --- VENDORS ---
  addVendor: (data) => axios.post(`${API_URL}/vendors/add`, data),
  searchVendor: (q) => axios.get(`${API_URL}/vendors/search?q=${q}`),
  updateVendor: (id, data) => axios.put(`${API_URL}/vendors/${id}`, data),
  getVendors: () => axios.get(`${API_URL}/vendors/list`), // New helper
  
  // Agents
  addAgent: (formData) => axios.post(`${API_URL}/vendors/add-agent`, formData),
  getVendorAgents: (id) => axios.get(`${API_URL}/vendors/${id}/agents`),
  updateAgent: (id, formData) => axios.put(`${API_URL}/vendors/agent/${id}`, formData),
  deleteAgent: (id) => axios.delete(`${API_URL}/vendors/agent/${id}`),

  vendorTransaction: (data) => axios.post(`${API_URL}/vendors/transaction`, data),
  getVendorTransactions: (id) => axios.get(`${API_URL}/vendors/${id}/transactions`),

  // --- INVENTORY ---
  addInventory: (formData) => axios.post(`${API_URL}/inventory/add`, formData),
  addBatchInventory: (data) => axios.post(`${API_URL}/inventory/batch-add`, data), // NEW: For Batch Stock
  getInventory: () => axios.get(`${API_URL}/inventory/list`),
  getVendorInventory: (id) => axios.get(`${API_URL}/inventory/vendor/${id}`),
  updateInventory: (id, data) => axios.put(`${API_URL}/inventory/update/${id}`, data),
  deleteInventory: (id) => axios.delete(`${API_URL}/inventory/${id}`),

  // --- BILLING & PAYMENTS ---
  searchBillingItem: (q) => axios.get(`${API_URL}/billing/search-item?q=${q}`),
  createBill: (data) => axios.post(`${API_URL}/billing/create-bill`, data),
  deleteBill: (id) => axios.delete(`${API_URL}/billing/delete/${id}`),
  getBillHistory: (search) => axios.get(`${API_URL}/billing/history`, { params: { search } }),
  addBalancePayment: (data) => axios.post(`${API_URL}/billing/add-payment`, data),

  // --- SHOPS (B2B) ---
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

  // --- RETURNS ---
  getInvoiceDetails: (invoiceId) => axios.get(`${API_URL}/billing/invoice/${invoiceId}`),
  returnItem: (data) => axios.post(`${API_URL}/billing/return-item`, data),
  processReturn: (data) => axios.post(`${API_URL}/billing/process-return`, data),

  // --- SETTINGS ---
  getDailyRates: () => axios.get(`${API_URL}/settings/rates`),
  updateDailyRate: (data) => axios.post(`${API_URL}/settings/rates`, data),
  getMasterItems: () => axios.get(`${API_URL}/settings/items`),
  addMasterItem: (data) => axios.post(`${API_URL}/settings/items`, data), 
  addMasterItemsBulk: (data) => axios.post(`${API_URL}/settings/items/bulk`, data), 
  updateMasterItem: (id, data) => axios.put(`${API_URL}/settings/items/${id}`, data), 
  deleteMasterItem: (id) => axios.delete(`${API_URL}/settings/items/${id}`),

  // --- LEDGER & FINANCE ---
  getLedgerStats: () => axios.get(`${API_URL}/ledger/stats`),
  // UPDATED: Now supports search and date params
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
};