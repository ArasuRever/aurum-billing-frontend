//
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const api = {
  // --- VENDORS ---
  addVendor: (data) => axios.post(`${API_URL}/vendors/add`, data),
  searchVendor: (q) => axios.get(`${API_URL}/vendors/search?q=${q}`),
  updateVendor: (id, data) => axios.put(`${API_URL}/vendors/${id}`, data),
  
  // Agents
  addAgent: (formData) => axios.post(`${API_URL}/vendors/add-agent`, formData),
  getVendorAgents: (id) => axios.get(`${API_URL}/vendors/${id}/agents`),
  updateAgent: (id, formData) => axios.put(`${API_URL}/vendors/agent/${id}`, formData),
  deleteAgent: (id) => axios.delete(`${API_URL}/vendors/agent/${id}`),

  vendorTransaction: (data) => axios.post(`${API_URL}/vendors/transaction`, data),
  getVendorTransactions: (id) => axios.get(`${API_URL}/vendors/${id}/transactions`),

  // --- INVENTORY ---
  addInventory: (formData) => axios.post(`${API_URL}/inventory/add`, formData),
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
  // Added timestamp to prevent caching
  getShops: () => axios.get(`${API_URL}/shops/list?t=${Date.now()}`),
  getShopDetails: (id) => axios.get(`${API_URL}/shops/${id}`),
  updateShop: (id, data) => axios.put(`${API_URL}/shops/${id}`, data),
  
  // NEW: Delete Shop
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
  
  // Master Items
  getMasterItems: () => axios.get(`${API_URL}/settings/items`),
  addMasterItem: (data) => axios.post(`${API_URL}/settings/items`, data), 
  addMasterItemsBulk: (data) => axios.post(`${API_URL}/settings/items/bulk`, data), 
  updateMasterItem: (id, data) => axios.put(`${API_URL}/settings/items/${id}`, data), 
  deleteMasterItem: (id) => axios.delete(`${API_URL}/settings/items/${id}`),

  // --- LEDGER & FINANCE ---
  getLedgerStats: () => axios.get(`${API_URL}/ledger/stats`),
  getLedgerHistory: () => axios.get(`${API_URL}/ledger/history`),
  addExpense: (data) => axios.post(`${API_URL}/ledger/expense`, data),
  adjustBalance: (data) => axios.post(`${API_URL}/ledger/adjust`, data),

  // (Short list of existing methods to ensure context is maintained)
  addVendor: (data) => axios.post(`${API_URL}/vendors/add`, data),
  searchVendor: (q) => axios.get(`${API_URL}/vendors/search?q=${q}`),
  updateVendor: (id, data) => axios.put(`${API_URL}/vendors/${id}`, data),
  addAgent: (formData) => axios.post(`${API_URL}/vendors/add-agent`, formData),
  getVendorAgents: (id) => axios.get(`${API_URL}/vendors/${id}/agents`),
  updateAgent: (id, formData) => axios.put(`${API_URL}/vendors/agent/${id}`, formData),
  deleteAgent: (id) => axios.delete(`${API_URL}/vendors/agent/${id}`),
  vendorTransaction: (data) => axios.post(`${API_URL}/vendors/transaction`, data),
  getVendorTransactions: (id) => axios.get(`${API_URL}/vendors/${id}/transactions`),
  addInventory: (formData) => axios.post(`${API_URL}/inventory/add`, formData),
  getInventory: () => axios.get(`${API_URL}/inventory/list`),
  getVendorInventory: (id) => axios.get(`${API_URL}/inventory/vendor/${id}`),
  updateInventory: (id, data) => axios.put(`${API_URL}/inventory/update/${id}`, data),
  deleteInventory: (id) => axios.delete(`${API_URL}/inventory/${id}`),
  searchBillingItem: (q) => axios.get(`${API_URL}/billing/search-item?q=${q}`),
  createBill: (data) => axios.post(`${API_URL}/billing/create-bill`, data),
  deleteBill: (id) => axios.delete(`${API_URL}/billing/delete/${id}`),
  getBillHistory: (search) => axios.get(`${API_URL}/billing/history`, { params: { search } }),
  addBalancePayment: (data) => axios.post(`${API_URL}/billing/add-payment`, data),
  getInvoiceDetails: (invoiceId) => axios.get(`${API_URL}/billing/invoice/${invoiceId}`),
  returnItem: (data) => axios.post(`${API_URL}/billing/return-item`, data),
  processReturn: (data) => axios.post(`${API_URL}/billing/process-return`, data),
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
  searchCustomer: (query) => axios.get(`${API_URL}/customers/search?q=${query}`),
  getCustomers: () => axios.get(`${API_URL}/customers/list`),
  getCustomerDetails: (phone) => axios.get(`${API_URL}/customers/details/${phone}`),
  addCustomer: (data) => axios.post(`${API_URL}/customers/add`, data),
  updateCustomer: (id, data) => axios.put(`${API_URL}/customers/update/${id}`, data),
  getRecycleBin: () => axios.get(`${API_URL}/customers/recycle-bin`),
  softDeleteCustomer: (id) => axios.delete(`${API_URL}/customers/soft-delete/${id}`),
  restoreCustomer: (id) => axios.put(`${API_URL}/customers/restore/${id}`),
  permanentDeleteCustomer: (id) => axios.delete(`${API_URL}/customers/permanent/${id}`),
  getDailyRates: () => axios.get(`${API_URL}/settings/rates`),
  updateDailyRate: (data) => axios.post(`${API_URL}/settings/rates`, data),
  getMasterItems: () => axios.get(`${API_URL}/settings/items`),
  addMasterItem: (data) => axios.post(`${API_URL}/settings/items`, data), 
  addMasterItemsBulk: (data) => axios.post(`${API_URL}/settings/items/bulk`, data), 
  updateMasterItem: (id, data) => axios.put(`${API_URL}/settings/items/${id}`, data), 
  deleteMasterItem: (id) => axios.delete(`${API_URL}/settings/items/${id}`),

  // --- LEDGER ENDPOINTS ---
  getLedgerStats: () => axios.get(`${API_URL}/ledger/stats`),
  // UPDATED: Accepts search param
  getLedgerHistory: (search) => axios.get(`${API_URL}/ledger/history`, { params: { search } }),
  addExpense: (data) => axios.post(`${API_URL}/ledger/expense`, data),
  adjustBalance: (data) => axios.post(`${API_URL}/ledger/adjust`, data),
};