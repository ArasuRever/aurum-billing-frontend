import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Form, InputGroup, Row, Col, Badge, Modal, Alert } from 'react-bootstrap';
import { api } from '../api';
import { FaTrash, FaEye, FaSearch, FaFileInvoiceDollar } from 'react-icons/fa';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { useReactToPrint } from 'react-to-print';
import { useBusiness } from '../context/BusinessContext';

const BillHistory = () => {
    const { settings } = useBusiness();
    const [bills, setBills] = useState([]);
    const [filteredBills, setFilteredBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // --- INVOICE PRINTING STATES ---
    const [selectedBill, setSelectedBill] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const componentRef = React.useRef();

    // --- NEIGHBOUR RESTORE MODAL STATES ---
    const [showNeighbourModal, setShowNeighbourModal] = useState(false);
    const [billToDelete, setBillToDelete] = useState(null);
    const [restoreMode, setRestoreMode] = useState('REVERT_DEBT'); // 'REVERT_DEBT' or 'TAKE_OWNERSHIP'

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.getBillHistory();
            setBills(res.data);
            setFilteredBills(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        const filtered = bills.filter(bill =>
            bill.customer_name?.toLowerCase().includes(term) ||
            bill.invoice_number?.toLowerCase().includes(term) ||
            bill.customer_phone?.includes(term)
        );
        setFilteredBills(filtered);
    };

    // --- DELETE LOGIC ---
    const handleDeleteClick = async (bill) => {
        // 1. Fetch details first to check for Neighbour Items
        try {
            const res = await api.getInvoiceDetails(bill.id);
            const items = res.data.items || [];

            // Check if any item is from NEIGHBOUR (and wasn't just a manual non-inventory item)
            // Note: We need source_type. If your getInvoiceDetails doesn't join inventory, 
            // we rely on the fact that we can't easily check without backend help OR 
            // we assume the backend delete check is enough. 
            // BETTER STRATEGY: The backend 'delete' route returns the logic, but we want UI choice.
            // Let's assume we can fetch item details or check 'item_id' existence.
            
            // To be accurate, we'll optimistically open the modal IF we suspect neighbour items,
            // OR we can just ask the user every time? No, that's annoying.
            // Let's do a quick check:
            
            let hasNeighbourItem = false;
            
            // We need to check the ITEM source. 
            // Since sale_items doesn't store source_type, we have to rely on the backend.
            // However, for this UI, we can try to assume based on your workflow.
            // If you want 100% accuracy, we'd need to fetch full item details.
            
            // For now, let's implement the 'Safe Delete' which handles it on backend, 
            // BUT since you requested the popup, we will ask the user "IF" they know.
            // OR simpler: We fetch the items and check against inventory in the background?
            
            // ACTUAL SOLUTION: We'll assume the user might know, OR we check the API.
            // Since we can't easily check 'source_type' from just sale_items without a join,
            // we will fetch the item details one by one? No, too slow.
            
            // Let's modify the flow: 
            // We'll proceed to delete. If backend sees neighbour items, maybe it could warn us?
            // No, DELETE actions shouldn't "ask" after the fact.
            
            // REVISED STRATEGY: 
            // For this project, we will check items. If any item has a 'neighbour_shop_id' stored (if you added that column to sale_items), it's easy.
            // If not, we will assume standard delete UNLESS the user explicitly uses a "Delete & Manage Stock" button?
            // No, let's stick to your request: Pop up.
            
            // To make this work seamlessly without heavy backend changes for "checking":
            // We will just fetch the full invoice details (which you already have API for).
            // AND we will add a small check on the backend `getInvoiceDetails` to include `source_type` in the items list.
            
            // *Assuming `getInvoiceDetails` returns items with their current inventory source_type*
            // (You might need to update the backend GET route to JOIN inventory_items to get source_type).
            
            // For now, let's assume we proceed. If you want to be safe, we can just show the modal 
            // for ALL deletions, asking "How to handle stock?", but that's tedious.
            
            // Let's try to detect based on current data:
            // Use `api.searchBillingItem` (which is search-item route) or just rely on `items` if they have metadata.
            
            // **TEMPORARY FRONTEND LOGIC**: 
            // We will ask the user for *every* delete if they want to 'Manage Return Options' 
            // or just 'Standard Delete'. 
            // Actually, let's just trigger the modal. It's safer.
            
            setBillToDelete(bill);
            setShowNeighbourModal(true); 

        } catch (err) {
            console.error(err);
            alert("Error checking bill details");
        }
    };

    const confirmDelete = async () => {
        if (!billToDelete) return;
        try {
            await api.deleteBill(billToDelete.id, restoreMode); // Passing restoreMode query param handled in api.js
            setShowNeighbourModal(false);
            setBillToDelete(null);
            fetchHistory(); // Refresh list
        } catch (err) {
            console.error(err);
            alert("Failed to delete bill: " + (err.response?.data?.error || err.message));
        }
    };

    // --- VIEW / PRINT LOGIC ---
    const handleViewInvoice = async (bill) => {
        try {
            setLoading(true);
            const res = await api.getInvoiceDetails(bill.id); // { sale, items }
            setSelectedBill(res.data.sale);
            setInvoiceItems(res.data.items);
            setShowInvoiceModal(true);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert("Could not load invoice details");
        }
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    return (
        <Container fluid className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary fw-bold mb-0">Bill History</h2>
                <InputGroup style={{ maxWidth: '300px' }}>
                    <InputGroup.Text><FaSearch /></InputGroup.Text>
                    <Form.Control
                        placeholder="Search invoice, customer..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </InputGroup>
            </div>

            <div className="table-responsive shadow-sm rounded">
                <Table hover className="align-middle mb-0 bg-white">
                    <thead className="bg-light text-secondary">
                        <tr>
                            <th>Date</th>
                            <th>Invoice #</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th className="text-end">Total</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                        ) : filteredBills.map(bill => (
                            <tr key={bill.id}>
                                <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                                <td className="fw-bold text-primary">{bill.invoice_number}</td>
                                <td>
                                    <div>{bill.customer_name}</div>
                                    <small className="text-muted">{bill.customer_phone}</small>
                                </td>
                                <td>
                                    {/* Show count or first item name if available in listing */}
                                    <Badge bg="secondary">View Details</Badge>
                                </td>
                                <td className="text-end fw-bold">₹{parseFloat(bill.final_amount).toLocaleString()}</td>
                                <td className="text-center">
                                    <Badge bg={bill.payment_status === 'PAID' ? 'success' : 'warning'}>
                                        {bill.payment_status}
                                    </Badge>
                                </td>
                                <td className="text-center">
                                    <Button variant="outline-info" size="sm" className="me-2" onClick={() => handleViewInvoice(bill)}>
                                        <FaEye />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(bill)}>
                                        <FaTrash />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* --- INVOICE VIEW MODAL --- */}
            <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Invoice Details</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: '#f5f5f5' }}>
                    {selectedBill && (
                        <div ref={componentRef}>
                            <InvoiceTemplate 
                                sale={selectedBill} 
                                items={invoiceItems} 
                                business={settings} // Pass business settings for logo/address
                            />
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handlePrint}>Print Invoice</Button>
                </Modal.Footer>
            </Modal>

            {/* --- NEIGHBOUR RESTORE MODAL (SAFE DELETE) --- */}
            <Modal show={showNeighbourModal} onHide={() => setShowNeighbourModal(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>⚠ Void Bill & Restore Stock</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="fw-bold">Are you sure you want to void this bill?</p>
                    <p className="text-muted small">
                        This action will restore items to inventory and remove sales records.
                    </p>
                    
                    <Alert variant="warning" className="mt-3">
                        <FaFileInvoiceDollar className="me-2" />
                        <strong>For Neighbour/Third-Party Items:</strong>
                    </Alert>

                    <Form.Group className="mb-3">
                        <Form.Label>How should we handle the debt?</Form.Label>
                        <div className="d-flex flex-column gap-2">
                            <Form.Check 
                                type="radio"
                                id="mode-revert"
                                label={
                                    <span>
                                        <strong>Revert Debt (Recommended)</strong> <br/>
                                        <small className="text-muted">Item goes back to neighbour. We assume the sale never happened. Debt is removed.</small>
                                    </span>
                                }
                                name="restoreMode"
                                checked={restoreMode === 'REVERT_DEBT'}
                                onChange={() => setRestoreMode('REVERT_DEBT')}
                            />
                            <Form.Check 
                                type="radio"
                                id="mode-own"
                                label={
                                    <span>
                                        <strong>Take Ownership</strong> <br/>
                                        <small className="text-muted">Item becomes OUR stock. We keep the debt (we owe them money).</small>
                                    </span>
                                }
                                name="restoreMode"
                                checked={restoreMode === 'TAKE_OWNERSHIP'}
                                onChange={() => setRestoreMode('TAKE_OWNERSHIP')}
                            />
                        </div>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowNeighbourModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>
                        Confirm Void
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default BillHistory;