import React, { useEffect, useState, useRef } from 'react';
import { Container, Table, Button, Form, InputGroup, Badge, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FaTrash, FaEye, FaSearch, FaFileInvoiceDollar, FaUndo, FaPrint } from 'react-icons/fa';
import InvoiceTemplate from '../components/InvoiceTemplate';

// --- PRINT CSS (Matches Billing.jsx) ---
const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { 
      position: absolute; 
      left: 0; 
      top: 0; 
      width: 100%; 
      margin: 0; 
      padding: 0; 
      background: white; 
      color: black; 
    }
    .btn-close, .modal-footer, .no-print { display: none !important; }
  }
`;

const BillHistory = () => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [bills, setBills] = useState([]);
    const [filteredBills, setFilteredBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [businessProfile, setBusinessProfile] = useState(null);

    // Invoice View State
    const [selectedBillData, setSelectedBillData] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Delete Modal State
    const [showNeighbourModal, setShowNeighbourModal] = useState(false);
    const [billToDelete, setBillToDelete] = useState(null);
    const [restoreMode, setRestoreMode] = useState('REVERT_DEBT'); 

    // --- INJECT PRINT STYLES ---
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = printStyles;
        document.head.appendChild(styleSheet);
        return () => document.head.removeChild(styleSheet);
    }, []);

    useEffect(() => {
        fetchHistory();
        api.getBusinessSettings()
           .then(res => setBusinessProfile(res.data))
           .catch(console.error);
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
            fetchHistory(); 
        } catch (err) {
            console.error(err);
            alert("Failed to delete bill: " + (err.response?.data?.error || err.message));
        }
    };

    // --- VIEW INVOICE ---
    const handleViewInvoice = async (bill) => {
        try {
            setLoading(true);
            const res = await api.getInvoiceDetails(bill.id); 
            const { sale, items, exchangeItems } = res.data;

            const formattedItems = items.map(item => ({
                item_name: item.item_name,
                gross_weight: item.sold_weight, 
                rate: item.sold_rate,
                total: item.total_item_price,
                wastage_percent: item.making_charges_collected || 0,
                hsn_code: item.hsn_code,
                item_id: item.item_id 
            }));

            const formattedExchange = (exchangeItems || []).map(ex => ({
                name: ex.item_name,
                gross_weight: ex.gross_weight,
                less_weight: ex.less_weight,
                net_weight: ex.net_weight,
                rate: ex.rate,
                total: ex.total_amount
            }));

            const formattedData = {
                invoice_id: sale.invoice_number,
                date: sale.created_at || sale.invoice_date,
                customer: {
                    name: sale.customer_name,
                    phone: sale.customer_phone,
                    address: sale.customer_address || '', 
                    gstin: sale.cust_gstin || ''
                },
                items: formattedItems,
                totals: {
                    grossTotal: parseFloat(sale.gross_total || 0),
                    cgst: parseFloat(sale.cgst_amount || 0),
                    sgst: parseFloat(sale.sgst_amount || 0),
                    totalDiscount: parseFloat(sale.discount || 0),
                    exchangeTotal: parseFloat(sale.exchange_total || 0),
                    netPayable: parseFloat(sale.final_amount || 0)
                },
                includeGST: sale.is_gst_bill,
                exchangeItems: formattedExchange,
                type: 'TAX INVOICE'
            };

            setSelectedBillData(formattedData);
            setShowInvoiceModal(true);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert("Could not load invoice details");
        }
    };

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
                                    <td>{new Date(bill.created_at).toLocaleDateString('en-IN')}</td>
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
                                        <Button 
                                            variant="outline-warning" 
                                            size="sm" 
                                            className="me-2" 
                                            title="Return / Exchange"
                                            onClick={() => navigate(`/billing/return?saleId=${bill.invoice_number || bill.id}`)}
                                        >
                                            <FaUndo />
                                        </Button>

                                        <Button 
                                            variant="outline-info" 
                                            size="sm" 
                                            className="me-2" 
                                            title="View Invoice"
                                            onClick={() => handleViewInvoice(bill)}
                                        >
                                            <FaEye />
                                        </Button>

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
                    <Modal.Title>Invoice Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: '#e9ecef', overflow: 'hidden' }}>
                    {selectedBillData && (
                        <div className="d-flex justify-content-center" style={{transform: 'scale(0.85)', transformOrigin: 'top center'}}>
                            <div className="shadow-lg">
                                <InvoiceTemplate 
                                    data={selectedBillData} 
                                    businessProfile={businessProfile} 
                                />
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Close</Button>
                    {/* Changed to window.print() */}
                    <Button variant="primary" onClick={() => window.print()}>
                        <FaPrint className="me-2"/> Print Invoice
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* --- NEIGHBOUR RESTORE MODAL --- */}
            <Modal show={showNeighbourModal} onHide={() => setShowNeighbourModal(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>⚠ Void Bill & Restore Stock</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="fw-bold">Are you sure you want to void this bill?</p>
                    <p className="text-muted small">
                        Items will be added back to inventory. Please select how to handle Neighbour/B2B items:
                    </p>
                    <Form.Group className="mb-3">
                        <div className="d-flex flex-column gap-2">
                            <Form.Check 
                                type="radio"
                                id="mode-revert"
                                label={<span><strong>Revert Debt (Recommended)</strong> <br/><small className="text-muted">Item goes back to neighbour. We assume the sale never happened. Debt is removed.</small></span>}
                                name="restoreMode"
                                checked={restoreMode === 'REVERT_DEBT'}
                                onChange={() => setRestoreMode('REVERT_DEBT')}
                            />
                            <Form.Check 
                                type="radio"
                                id="mode-own"
                                label={<span><strong>Take Ownership</strong> <br/><small className="text-muted">Item becomes OUR stock. We keep the debt (we owe them money).</small></span>}
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