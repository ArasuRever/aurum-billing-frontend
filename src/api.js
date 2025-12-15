import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const api = {
  // --- VENDORS ---
  addVendor: (data) => axios.post(`${API_URL}/vendors/add`, data),
  searchVendor: (q) => axios.get(`${API_URL}/vendors/search?q=${q}`),
  updateVendor: (id, data) => axios.put(`${API_URL}/vendors/${id}`, data),
  addAgent: (formData) => axios.post(`${API_URL}/vendors/add-agent`, formData),
  vendorTransaction: (data) => axios.post(`${API_URL}/vendors/transaction`, data),
  getVendorAgents: (id) => axios.get(`${API_URL}/vendors/${id}/agents`),
  getVendorTransactions: (id) => axios.get(`${API_URL}/vendors/${id}/transactions`),

  // --- INVENTORY ---
  addInventory: (formData) => axios.post(`${API_URL}/inventory/add`, formData),
  getInventory: () => axios.get(`${API_URL}/inventory/list`),
  getVendorInventory: (id) => axios.get(`${API_URL}/inventory/vendor/${id}`),
  updateInventory: (id, data) => axios.put(`${API_URL}/inventory/update/${id}`, data),
  deleteInventory: (id) => axios.delete(`${API_URL}/inventory/${id}`),

  // --- BILLING ---
  searchBillingItem: (q) => axios.get(`${API_URL}/billing/search-item?q=${q}`),
  createBill: (data) => axios.post(`${API_URL}/billing/create-bill`, data),
};