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
  
  // NEW: Balance Payments
  addBalancePayment: (data) => axios.post(`${API_URL}/billing/add-payment`, data),

  // --- SHOPS (B2B) ---
  addShop: (data) => axios.post(`${API_URL}/shops/add`, data),
  getShops: () => axios.get(`${API_URL}/shops/list`),
  getShopDetails: (id) => axios.get(`${API_URL}/shops/${id}`),
  updateShop: (id, data) => axios.put(`${API_URL}/shops/${id}`, data),
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
  
  // NEW: Customer Deletion & Restore
  getRecycleBin: () => axios.get(`${API_URL}/customers/recycle-bin`),
  softDeleteCustomer: (id) => axios.delete(`${API_URL}/customers/soft-delete/${id}`),
  restoreCustomer: (id) => axios.put(`${API_URL}/customers/restore/${id}`),
  permanentDeleteCustomer: (id) => axios.delete(`${API_URL}/customers/permanent/${id}`),

  // --- RETURNS ---
  getInvoiceDetails: (invoiceId) => axios.get(`${API_URL}/billing/invoice/${invoiceId}`),
  returnItem: (data) => axios.post(`${API_URL}/billing/return-item`, data),
};