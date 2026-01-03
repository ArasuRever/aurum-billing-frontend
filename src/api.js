import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const axiosInstance = axios.create({ baseURL: API_URL });

// Auth Interceptor
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

export const api = {
  axiosInstance,

  // --- AUTH & USERS ---
  getLoginConfig: () => axiosInstance.get(`/auth/login-config`),
  login: (creds) => axiosInstance.post(`/auth/login`, creds),
  setupAdmin: (creds) => axiosInstance.post(`/auth/setup`, creds),
  getUsers: () => axiosInstance.get(`/auth/users`),
  addUser: (data) => axiosInstance.post(`/auth/users/add`, data),
  deleteUser: (id) => axiosInstance.delete(`/auth/users/${id}`),
  updateUser: (id, data) => axiosInstance.put(`/auth/users/${id}`, data),

  // --- BACKUP & RESTORE ---
  downloadBackup: () => axiosInstance.get(`/settings/backup`, { responseType: 'blob' }),
  restoreBackup: (file) => {
      const formData = new FormData();
      formData.append('backup_file', file);
      return axiosInstance.post(`/settings/restore`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
  },

  // --- VENDORS ---
  addVendor: (data) => axiosInstance.post(`/vendors/add`, data),
  searchVendor: (q) => axiosInstance.get(`/vendors/search?q=${q}`),
  updateVendor: (id, data) => axiosInstance.put(`/vendors/${id}`, data),
  deleteVendor: (id, stockAction) => axiosInstance.delete(`/vendors/${id}?stock_action=${stockAction}`),
  getVendors: () => axiosInstance.get(`/vendors/list`),
  addAgent: (formData) => axiosInstance.post(`/vendors/add-agent`, formData),
  getVendorAgents: (id) => axiosInstance.get(`/vendors/${id}/agents`),
  updateAgent: (id, formData) => axiosInstance.put(`/vendors/agent/${id}`, formData),
  deleteAgent: (id) => axiosInstance.delete(`/vendors/agent/${id}`),
  vendorTransaction: (data) => axiosInstance.post(`/vendors/transaction`, data),
  getVendorTransactions: (id) => axiosInstance.get(`/vendors/${id}/transactions`),
  getVendorSalesHistory: (id) => axiosInstance.get(`/vendors/${id}/sales-history`),

  // --- INVENTORY ---
  addInventory: (formData) => axiosInstance.post(`/inventory/add`, formData),
  addBatchInventory: (data) => axiosInstance.post(`/inventory/batch-add`, data),
  getInventory: () => axiosInstance.get(`/inventory/list`),
  getVendorInventory: (id) => axiosInstance.get(`/vendors/${id}/inventory`), 
  getOwnInventory: () => axiosInstance.get(`/inventory/own/list`), // NEW
  getOwnSalesHistory: () => axiosInstance.get(`/inventory/own/history`), // NEW
  updateInventory: (id, data) => axiosInstance.put(`/inventory/update/${id}`, data, {
      headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' }
  }),
  deleteInventory: (id) => axiosInstance.delete(`/inventory/${id}`),
  restoreInventoryItem: (id) => axiosInstance.post(`/inventory/restore/${id}`),
  searchBillingItem: (q) => axiosInstance.get(`/inventory/search?q=${q}`), 

  // --- BILLING ---
  createBill: (data) => axiosInstance.post(`/billing/create-bill`, data),
  deleteBill: (id, restoreMode) => axiosInstance.delete(`/billing/delete/${id}?restore_mode=${restoreMode || 'REVERT_DEBT'}`),
  getBillHistory: (search) => axiosInstance.get(`/billing/history`, { params: { search } }),
  addBalancePayment: (data) => axiosInstance.post(`/billing/add-payment`, data),
  getInvoiceDetails: (invoiceId) => axiosInstance.get(`/billing/invoice/${invoiceId}`),
  returnItem: (data) => axiosInstance.post(`/billing/return-item`, data),
  processReturn: (data) => axiosInstance.post(`/billing/process-return`, data),

  // --- AUDIT ---
  startAudit: (data) => axiosInstance.post(`/audit/start`, data),
  scanAuditItem: (data) => axiosInstance.post(`/audit/scan`, data),
  getAuditReport: (id) => axiosInstance.get(`/audit/${id}/report`),
  finishAudit: (id) => axiosInstance.post(`/audit/${id}/finish`),

  // --- SHOPS ---
  addShop: (data) => axiosInstance.post(`/shops/add`, data),
  getShops: () => axiosInstance.get(`/shops/list?t=${Date.now()}`),
  getShopDetails: (id) => axiosInstance.get(`/shops/${id}`),
  updateShop: (id, data) => axiosInstance.put(`/shops/${id}`, data),
  deleteShop: (id) => axiosInstance.delete(`/shops/${id}`),
  shopTransaction: (data) => axiosInstance.post(`/shops/transaction`, data),
  deleteShopTransaction: (id) => axiosInstance.delete(`/shops/transaction/${id}`),
  settleShopTransaction: (id) => axiosInstance.post(`/shops/settle`, { transaction_id: id }),
  settleShopItem: (data) => axiosInstance.post(`/shops/settle-item`, data),
  getShopTransactionHistory: (id) => axiosInstance.get(`/shops/payment-history/${id}`),
  updateShopTransaction: (id, data) => axiosInstance.put(`/shops/transaction/${id}`, data),

  // --- CUSTOMERS ---
  searchCustomer: (query) => axiosInstance.get(`/customers/search?q=${query}`),
  getCustomers: () => axiosInstance.get(`/customers/list`),
  getCustomerDetails: (phone) => axiosInstance.get(`/customers/details/${phone}`),
  addCustomer: (data) => axiosInstance.post(`/customers/add`, data),
  updateCustomer: (id, data) => axiosInstance.put(`/customers/update/${id}`, data),
  getRecycleBin: () => axiosInstance.get(`/customers/recycle-bin`),
  softDeleteCustomer: (id) => axiosInstance.delete(`/customers/soft-delete/${id}`),
  restoreCustomer: (id) => axiosInstance.put(`/customers/restore/${id}`),
  permanentDeleteCustomer: (id) => axiosInstance.delete(`/customers/permanent/${id}`),

  // --- SETTINGS ---
  getDailyRates: () => axiosInstance.get(`/settings/rates`),
  updateDailyRate: (data) => axiosInstance.post(`/settings/rates`, data),
  getProductTypes: () => axiosInstance.get(`/settings/types`),
  addProductType: (data) => axiosInstance.post(`/settings/types`, data),
  updateProductType: (id, data) => axiosInstance.put(`/settings/types/${id}`, data),
  deleteProductType: (id) => axiosInstance.delete(`/settings/types/${id}`),
  getMasterItems: () => axiosInstance.get(`/settings/items`),
  addMasterItemsBulk: (data) => axiosInstance.post(`/settings/items/bulk`, data), 
  updateMasterItem: (id, data) => axiosInstance.put(`/settings/items/${id}`, data), 
  deleteMasterItem: (id) => axiosInstance.delete(`/settings/items/${id}`),
  
  getBusinessSettings: () => axiosInstance.get(`/settings/business`),
  saveBusinessSettings: (formData) => axiosInstance.post(`/settings/business`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // --- LEDGER ---
  getLedgerStats: () => axiosInstance.get(`/ledger/stats`),
  getLedgerHistory: (search, date) => axiosInstance.get(`/ledger/history`, { params: { search, date } }),
  addExpense: (data) => axiosInstance.post(`/ledger/expense`, data),
  adjustBalance: (data) => axiosInstance.post(`/ledger/adjust`, data),

  // --- OLD METAL ---
  getOldMetalStats: () => axiosInstance.get(`/old-metal/stats`),
  getOldMetalList: () => axiosInstance.get(`/old-metal/list`),
  addOldMetalPurchase: (data) => axiosInstance.post(`/old-metal/purchase`, data),
  deleteOldMetal: (id) => axiosInstance.delete(`/old-metal/${id}`),
  
  // --- REFINERY ---
  getRefineryBatches: () => axiosInstance.get(`/refinery/batches`),
  getPendingScrap: (metalType) => axiosInstance.get(`/refinery/pending-scrap?metal_type=${metalType}`),
  createRefineryBatch: (data) => axiosInstance.post(`/refinery/create-batch`, data),
  getBatchItems: (id) => axiosInstance.get(`/refinery/batch/${id}/items`),
  receiveRefinedGold: (formData) => axiosInstance.post(`/refinery/receive-refined`, formData),
  useRefinedStock: (data) => axiosInstance.post(`/refinery/use-stock`, data),

  // --- EXTERNAL GST BILLING ---
  getGstHistory: () => axiosInstance.get(`/gst/history`),
  getGstBill: (id) => axiosInstance.get(`/gst/${id}`),
  createGstBill: (data) => axiosInstance.post(`/gst/create`, data),
  updateGstBill: (id, data) => axiosInstance.put(`/gst/update/${id}`, data),
  deleteGstBill: (id) => axiosInstance.delete(`/gst/${id}`),

  // --- CHIT SCHEMES ---
  createChitPlan: (data) => axiosInstance.post(`/chits/create`, data),
  getActiveChitCustomers: () => axiosInstance.get(`/chits/active-customers`),
  getCustomerChits: (customerId) => axiosInstance.get(`/chits/customer/${customerId}`),
  getChitDetails: (id) => axiosInstance.get(`/chits/details/${id}`),
  payChitInstallment: (data) => axiosInstance.post(`/chits/pay`, data),
  addChitBonus: (id) => axiosInstance.post(`/chits/add-bonus/${id}`),
  closeChitPlan: (id) => axiosInstance.post(`/chits/close/${id}`),
};