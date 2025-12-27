import React from 'react';
import Barcode from 'react-barcode';

// This component receives a list of items and renders them as printable tags
const BarcodePrintComponent = React.forwardRef(({ items, shopName }, ref) => {
  return (
    <div ref={ref} className="p-2">
      <style>
        {`
          @media print {
            @page {
              size: auto; 
              margin: 0mm; 
            }
            body {
              background-color: white;
            }
            .tag-container {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}
      </style>
      
      <div className="d-flex flex-wrap gap-3 justify-content-start">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="tag-container border border-dark d-flex align-items-center bg-white"
            style={{
                width: '50mm',      // Standard small tag width
                height: '25mm',     // Standard height
                padding: '2px',
                overflow: 'hidden',
                borderRadius: '2px',
                pageBreakInside: 'avoid'
            }}
          >
            {/* Left Side: Text Details */}
            <div style={{width: '60%', fontSize: '8px', lineHeight: '1.1'}} className="fw-bold text-dark ps-1">
                <div className="text-uppercase text-truncate">{shopName || 'AURUM'}</div>
                <div className="text-truncate mt-1" style={{fontSize: '9px'}}>{item.item_name}</div>
                <div className="d-flex justify-content-between mt-1">
                    <span>Gr: {item.gross_weight}</span>
                    <span>{item.metal_type === 'GOLD' ? '916' : 'Slv'}</span>
                </div>
                <div>MC: {item.making_charges}</div>
            </div>

            {/* Right Side: Barcode */}
            <div style={{width: '40%'}} className="d-flex flex-column align-items-center justify-content-center">
                <Barcode 
                    value={item.barcode || '0000'} 
                    width={1} 
                    height={25} 
                    fontSize={8} 
                    displayValue={false} 
                    margin={0}
                />
                <div style={{fontSize: '8px', marginTop:'2px'}}>{item.barcode}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default BarcodePrintComponent;