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
  
  // Agents
  addAgent: (formData) => axios.post(`${API_URL}/vendors/add-agent`, formData),
  getVendorAgents: (id) => axios.get(`${API_URL}/vendors/${id}/agents`),
  updateAgent: (id, formData) => axios.put(`${API_URL}/vendors/agent/${id}`, formData),
  deleteAgent: (id) => axios.delete(`${API_URL}/vendors/agent/${id}`),
  vendorTransaction: (data) => axios.post(`${API_URL}/vendors/transaction`, data),
  getVendorTransactions: (id) => axios.get(`${API_URL}/vendors/${id}/transactions`),

  // --- INVENTORY ---
  addInventory: (formData) => axios.post(`${API_URL}/inventory/add`, formData),
  addBatchInventory: (data) => axios.post(`${API_URL}/inventory/batch-add`, data),
  getInventory: () => axios.get(`${API_URL}/inventory/list`),
  getVendorInventory: (id) => axios.get(`${API_URL}/inventory/vendor/${id}`),
  updateInventory: (id, data) => axios.put(`${API_URL}/inventory/update/${id}`, data),
  deleteInventory: (id) => axios.delete(`${API_URL}/inventory/${id}`),

  // --- BILLING ---
  searchBillingItem: (q) => axios.get(`${API_URL}/billing/search-item?q=${q}`),
  createBill: (data) => axios.post(`${API_URL}/billing/create-bill`, data),
  deleteBill: (id) => axios.delete(`${API_URL}/billing/delete/${id}`),
  getBillHistory: (search) => axios.get(`${API_URL}/billing/history`, { params: { search } }),
  addBalancePayment: (data) => axios.post(`${API_URL}/billing/add-payment`, data),
  getInvoiceDetails: (invoiceId) => axios.get(`${API_URL}/billing/invoice/${invoiceId}`),
  returnItem: (data) => axios.post(`${API_URL}/billing/return-item`, data),
  processReturn: (data) => axios.post(`${API_URL}/billing/process-return`, data),

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

  // --- SETTINGS (UPDATED) ---
  getDailyRates: () => axios.get(`${API_URL}/settings/rates`),
  updateDailyRate: (data) => axios.post(`${API_URL}/settings/rates`, data),
  
  // NEW: Dynamic Product Types (Tabs)
  getProductTypes: () => axios.get(`${API_URL}/settings/types`),
  addProductType: (data) => axios.post(`${API_URL}/settings/types`, data),
  updateProductType: (id, data) => axios.put(`${API_URL}/settings/types/${id}`, data),
  deleteProductType: (id) => axios.delete(`${API_URL}/settings/types/${id}`),

  // Existing Master Items
  getMasterItems: () => axios.get(`${API_URL}/settings/items`),
  addMasterItemsBulk: (data) => axios.post(`${API_URL}/settings/items/bulk`, data), 
  updateMasterItem: (id, data) => axios.put(`${API_URL}/settings/items/${id}`, data), 
  deleteMasterItem: (id) => axios.delete(`${API_URL}/settings/items/${id}`),

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
  
  // --- REFINERY (NEW) ---
  getRefineryBatches: () => axios.get(`${API_URL}/refinery/batches`),
  getPendingScrap: (metalType) => axios.get(`${API_URL}/refinery/pending-scrap?metal_type=${metalType}`),
  createRefineryBatch: (data) => axios.post(`${API_URL}/refinery/create-batch`, data),
  // Note: This one handles file upload, so we don't set headers manually here usually, but keeping strict for safety
  receiveRefinedGold: (formData) => axios.post(`${API_URL}/refinery/receive-refined`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  useRefinedStock: (data) => axios.post(`${API_URL}/refinery/use-stock`, data),
};