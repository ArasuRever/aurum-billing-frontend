import React, { useEffect, useState, useRef } from 'react';
import { Container, Table, Button, Form, InputGroup, Row, Col, Badge, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FaTrash, FaEye, FaSearch, FaFileInvoiceDollar, FaUndo } from 'react-icons/fa';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { useReactToPrint } from 'react-to-print';
import { useBusiness } from '../context/BusinessContext';

const BillHistory = () => {
    const { settings } = useBusiness();
    const navigate = useNavigate();
    const [bills, setBills] = useState([]);
    const [filteredBills, setFilteredBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // --- INVOICE PRINTING STATES ---
    const [selectedBill, setSelectedBill] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const componentRef = useRef();

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
        setBillToDelete(bill);
        setShowNeighbourModal(true); 
    };

    const confirmDelete = async () => {
        if (!billToDelete) return;
        try {
            await api.deleteBill(billToDelete.id, restoreMode); 
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
            const res = await api.getInvoiceDetails(bill.id); // Returns { sale, items }
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
            {/* Header & Search */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary fw-bold mb-0">
                    <i className="bi bi-clock-history me-2"></i>Bill History
                </h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={fetchHistory}>Refresh</Button>
                    <InputGroup style={{ maxWidth: '300px' }}>
                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                        <Form.Control
                            placeholder="Search invoice, customer..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </InputGroup>
                </div>
            </div>

            {/* Bill Table */}
            <div className="table-responsive shadow-sm rounded">
                <Table hover className="align-middle mb-0 bg-white">
                    <thead className="bg-light text-secondary">
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th className="text-end">Amount</th>
                            <th className="text-center">Status</th>
                            <th className="text-center" style={{ minWidth: '160px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                        ) : filteredBills.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-4">No bills found.</td></tr>
                        ) : (
                            filteredBills.map(bill => (
                                <tr key={bill.id}>
                                    <td className="fw-bold text-primary">{bill.invoice_number}</td>
                                    <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div>{bill.customer_name}</div>
                                        <small className="text-muted">{bill.customer_phone}</small>
                                    </td>
                                    <td className="text-end fw-bold">₹{parseFloat(bill.final_amount).toLocaleString()}</td>
                                    <td className="text-center">
                                        <Badge bg={bill.payment_status === 'PAID' ? 'success' : 'warning'}>
                                            {bill.payment_status}
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        {/* --- FIXED RETURN BUTTON --- */}
                                        <Button 
                                            variant="outline-warning" 
                                            size="sm" 
                                            className="me-2" 
                                            title="Return / Exchange"
                                            // Updated Path to match App.jsx
                                            onClick={() => navigate(`/billing/return?saleId=${bill.invoice_number || bill.id}`)}
                                        >
                                            <FaUndo />
                                        </Button>

                                        {/* VIEW / PRINT BUTTON */}
                                        <Button 
                                            variant="outline-info" 
                                            size="sm" 
                                            className="me-2" 
                                            title="View Invoice"
                                            onClick={() => handleViewInvoice(bill)}
                                        >
                                            <FaEye />
                                        </Button>

                                        {/* DELETE / VOID BUTTON */}
                                        <Button 
                                            variant="outline-danger" 
                                            size="sm" 
                                            title="Void Bill"
                                            onClick={() => handleDeleteClick(bill)}
                                        >
                                            <FaTrash />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
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
                                business={settings} 
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