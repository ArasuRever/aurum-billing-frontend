import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import JewelryCalculator from '../components/JewelryCalculator';
import { Pie } from 'react-chartjs-2'; // Assumes you install react-chartjs-2 chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCalc, setShowCalc] = useState(false);
    const [rates, setRates] = useState({ 
        'GOLD': 0, 
        'SILVER': 0, 
        'GOLD 999': 0, 
        'SILVER 999': 0 
    });

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.axiosInstance.get('/dashboard'); 
            setData(res.data);
            if (res.data.rates) {
                setRates(prev => ({ ...prev, ...res.data.rates }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateRate = async (type, val) => {
        const newRate = prompt(`Enter new ${type} Rate:`, val);
        if (newRate && !isNaN(newRate)) {
            await api.updateDailyRate({ metal_type: type, rate: newRate });
            setRates(prev => ({ ...prev, [type]: newRate }));
            // alert("Rate Updated!");
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

    // Chart Data Preparation
    const pieData = {
        labels: data?.sales.categories.map(c => c.item_name) || [],
        datasets: [{
            data: data?.sales.categories.map(c => c.sold_count) || [],
            backgroundColor: ['#FFD700', '#C0C0C0', '#cd7f32', '#4bc0c0', '#36a2eb'],
            borderWidth: 1,
        }],
    };

    const goldStock = data?.inventory.summary.find(s => s.metal_type === 'GOLD');
    const silverStock = data?.inventory.summary.find(s => s.metal_type === 'SILVER');

    return (
        <div className="container-fluid pb-5">
            
            {/* A. LIVE TICKER - UPDATED WITH 999 RATES */}
            <div className="card shadow-sm border-0 mb-4 bg-dark text-white">
                <div className="card-body py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div className="d-flex gap-4 flex-wrap">
                        {/* STANDARD GOLD */}
                        <div className="d-flex align-items-center cursor-pointer" onClick={() => updateRate('GOLD', rates['GOLD'])}>
                            <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'40px', height:'40px'}}>Au</div>
                            <div>
                                <small className="d-block text-white-50" style={{fontSize:'0.7rem'}}>GOLD (BOARD)</small>
                                <span className="fw-bold text-warning fs-5">₹{rates['GOLD']}</span> <i className="bi bi-pencil-fill small text-white-50 ms-1" style={{fontSize:'0.6rem'}}></i>
                            </div>
                        </div>

                        <div className="vr bg-secondary d-none d-md-block"></div>

                        {/* STANDARD SILVER */}
                        <div className="d-flex align-items-center cursor-pointer" onClick={() => updateRate('SILVER', rates['SILVER'])}>
                            <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'40px', height:'40px'}}>Ag</div>
                            <div>
                                <small className="d-block text-white-50" style={{fontSize:'0.7rem'}}>SILVER (BOARD)</small>
                                <span className="fw-bold fs-5">₹{rates['SILVER']}</span> <i className="bi bi-pencil-fill small text-white-50 ms-1" style={{fontSize:'0.6rem'}}></i>
                            </div>
                        </div>

                        <div className="vr bg-secondary d-none d-md-block"></div>

                        {/* 999 GOLD BAR */}
                        <div className="d-flex align-items-center cursor-pointer" onClick={() => updateRate('GOLD 999', rates['GOLD 999'])}>
                            <div className="border border-warning text-warning rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'40px', height:'40px'}}>99</div>
                            <div>
                                <small className="d-block text-white-50" style={{fontSize:'0.7rem'}}>GOLD 999 [BAR]</small>
                                <span className="fw-bold text-light fs-5">₹{rates['GOLD 999']}</span> <i className="bi bi-pencil-fill small text-white-50 ms-1" style={{fontSize:'0.6rem'}}></i>
                            </div>
                        </div>

                        <div className="vr bg-secondary d-none d-md-block"></div>

                        {/* 999 SILVER BAR */}
                        <div className="d-flex align-items-center cursor-pointer" onClick={() => updateRate('SILVER 999', rates['SILVER 999'])}>
                            <div className="border border-light text-light rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{width:'40px', height:'40px'}}>99</div>
                            <div>
                                <small className="d-block text-white-50" style={{fontSize:'0.7rem'}}>SILVER 999 [BAR]</small>
                                <span className="fw-bold text-light fs-5">₹{rates['SILVER 999']}</span> <i className="bi bi-pencil-fill small text-white-50 ms-1" style={{fontSize:'0.6rem'}}></i>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span className="badge bg-success bg-opacity-25 text-success border border-success px-3 py-2 rounded-pill">
                            <i className="bi bi-shop me-1"></i> SHOP OPEN
                        </span>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* B. INVENTORY HEALTH */}
                <div className="col-md-8">
                    <div className="row g-3">
                        {/* Gold Stock Card */}
                        <div className="col-md-6">
                            <div className="card shadow-sm border-0 h-100 bg-warning bg-opacity-10">
                                <div className="card-body">
                                    <h6 className="text-muted text-uppercase small fw-bold mb-3">Total Gold Stock</h6>
                                    <div className="d-flex align-items-baseline">
                                        <h2 className="fw-bold text-dark mb-0">{parseFloat(goldStock?.gross || 0).toFixed(2)}</h2>
                                        <small className="text-muted ms-1">grams</small>
                                    </div>
                                    <div className="mt-2 small text-muted">
                                        Pure: <strong>{parseFloat(goldStock?.pure || 0).toFixed(2)}g</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Silver Stock Card */}
                        <div className="col-md-6">
                            <div className="card shadow-sm border-0 h-100 bg-secondary bg-opacity-10">
                                <div className="card-body">
                                    <h6 className="text-muted text-uppercase small fw-bold mb-3">Total Silver Stock</h6>
                                    <div className="d-flex align-items-baseline">
                                        <h2 className="fw-bold text-dark mb-0">{((parseFloat(silverStock?.gross || 0))/1000).toFixed(3)}</h2>
                                        <small className="text-muted ms-1">kg</small>
                                    </div>
                                    <div className="mt-2 small text-muted">
                                        Count: <strong>{silverStock?.count || 0} items</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Alerts Section */}
                        <div className="col-12">
                            <div className="card shadow-sm border-0">
                                <div className="card-header bg-white fw-bold small text-muted">ATTENTION NEEDED</div>
                                <div className="list-group list-group-flush">
                                    {data?.inventory.low_stock.map((item, i) => (
                                        <div key={i} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span><i className="bi bi-exclamation-triangle-fill text-warning me-2"></i> Low Stock: {item.item_name}</span>
                                            <span className="badge bg-light text-dark border">Only {item.quantity} left</span>
                                        </div>
                                    ))}
                                    {parseInt(data?.inventory.stagnant.count) > 0 && (
                                        <div className="list-group-item d-flex justify-content-between align-items-center">
                                            <span><i className="bi bi-hourglass-bottom text-danger me-2"></i> Dead Investment (Older than 6 months)</span>
                                            <span className="badge bg-danger text-white">{data.inventory.stagnant.count} Items ({parseFloat(data.inventory.stagnant.weight).toFixed(2)}g)</span>
                                        </div>
                                    )}
                                    {data?.inventory.low_stock.length === 0 && parseInt(data?.inventory.stagnant.count) === 0 && (
                                        <div className="p-3 text-center text-muted small"><i className="bi bi-check-circle me-1"></i> Inventory is healthy!</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* D. QUICK ACTIONS (Right Column) */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h6 className="fw-bold text-muted small mb-4">QUICK ACTIONS</h6>
                            <div className="d-grid gap-3">
                                <button className="btn btn-success btn-lg fw-bold shadow-sm" onClick={() => navigate('/billing')}>
                                    <div className="d-flex align-items-center justify-content-center">
                                        <i className="bi bi-receipt me-2 fs-4"></i> NEW BILL
                                    </div>
                                </button>
                                <div className="row g-2">
                                    <div className="col-6">
                                        <button className="btn btn-primary w-100 py-3 fw-bold" onClick={() => navigate('/add-stock')}>
                                            <i className="bi bi-box-seam d-block fs-4 mb-1"></i> Add Stock
                                        </button>
                                    </div>
                                    <div className="col-6">
                                        <button className="btn btn-outline-dark w-100 py-3 fw-bold" onClick={() => setShowCalc(true)}>
                                            <i className="bi bi-calculator d-block fs-4 mb-1"></i> Calc
                                        </button>
                                    </div>
                                </div>
                                <button className="btn btn-light border w-100 py-2 fw-bold text-muted" onClick={() => navigate('/ledger')}>
                                    <i className="bi bi-wallet2 me-2"></i> Add Expense
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* C. SALES PULSE */}
                <div className="col-md-8">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white fw-bold small text-muted">TODAY'S PULSE</div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-4 text-center border-end">
                                    <h1 className="fw-bold text-success mb-0">{data?.sales.today_bills}</h1>
                                    <small className="text-muted">Bills Generated</small>
                                </div>
                                <div className="col-md-4 text-center border-end">
                                    <h3 className="fw-bold text-dark mb-0">₹{parseFloat(data?.sales.today_revenue || 0).toLocaleString()}</h3>
                                    <small className="text-muted">Revenue</small>
                                </div>
                                <div className="col-md-4">
                                    <small className="d-block fw-bold text-muted mb-2">Busy Hours</small>
                                    <div className="d-flex align-items-end" style={{height:'40px', gap:'2px'}}>
                                        {[9,10,11,12,13,14,15,16,17,18,19,20].map(h => {
                                            const match = data?.sales.heatmap.find(x => parseInt(x.hour) === h);
                                            const height = match ? Math.min(match.count * 10, 100) : 0;
                                            return (
                                                <div key={h} className="bg-primary opacity-75 rounded-top" 
                                                     style={{width:'100%', height:`${height}%`}} 
                                                     title={`${h}:00 - ${match?.count || 0} bills`}></div>
                                            )
                                        })}
                                    </div>
                                    <div className="d-flex justify-content-between small text-muted" style={{fontSize:'0.6rem'}}>
                                        <span>9am</span><span>8pm</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Selling Categories */}
                <div className="col-md-4">
                     <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white fw-bold small text-muted">TOP CATEGORIES</div>
                        <div className="card-body position-relative">
                            <div style={{height: '200px', width:'100%', display:'flex', justifyContent:'center'}}>
                                {pieData.datasets[0].data.length > 0 ? <Pie data={pieData} /> : <p className="text-muted self-center">No Data</p>}
                            </div>
                        </div>
                     </div>
                </div>

                {/* E. ACTIVITY STREAM */}
                <div className="col-12">
                    <div className="card shadow-sm border-0">
                         <div className="card-header bg-light fw-bold small text-muted">RECENT ACTIVITY</div>
                         <div className="table-responsive">
                             <table className="table table-sm mb-0 align-middle">
                                 <tbody>
                                     {data?.activity.map((log, i) => (
                                         <tr key={i}>
                                             <td style={{width:'50px'}} className="text-center"><i className="bi bi-circle-fill text-secondary" style={{fontSize:'8px'}}></i></td>
                                             <td className="fw-bold text-dark">{log.type}</td>
                                             <td className="text-muted">{log.desc}</td>
                                             <td className="text-end small text-muted">{new Date(log.created_at).toLocaleString()}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showCalc && <JewelryCalculator onClose={() => setShowCalc(false)} goldRate={rates.GOLD} />}
        </div>
    );
}

export default Dashboard;