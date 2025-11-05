// Utility Functions

// localStorage helpers
const Storage = {
    get: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    
    set: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    
    remove: (key) => {
        localStorage.removeItem(key);
    },
    
    clear: () => {
        localStorage.clear();
    }
};

// Format currency
const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
};

// Format date
const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

// Generate bill number
const generateBillNumber = () => {
    const bills = Storage.get('bills') || [];
    const billCount = bills.length + 1;
    return `BILL-${String(billCount).padStart(3, '0')}`;
};

// Get date range for filters
const getDateRange = (filter) => {
    const today = new Date();
    let startDate, endDate;
    
    switch(filter) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay());
            endDate = new Date(today);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
        default:
            startDate = null;
            endDate = null;
    }
    
    return { startDate, endDate };
};

// Generate Customer PDF (for customer - shows only Grand Total)
const generateCustomerPDF = (billData) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Store name and header
    doc.setFontSize(20);
    doc.text('BISMI DEPARTMENT STORE', 105, 20, { align: 'center' });
    
    // Store address and contact
    doc.setFontSize(10);
    doc.text('Puzhuthivakkam, Chennai', 105, 28, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Bill Number: ${billData.billNumber}`, 20, 40);
    doc.text(`Date: ${billData.date}`, 20, 47);
    
    // Line separator
    doc.line(20, 53, 190, 53);
    
    // Items table
    let yPos = 63;
    doc.setFontSize(10);
    
    // Table header
    doc.setFillColor(46, 204, 113);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Item', 22, yPos + 5);
    doc.text('Qty', 80, yPos + 5);
    doc.text('Rate', 110, yPos + 5);
    doc.text('Amount', 140, yPos + 5);
    
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    
    // Items
    billData.items.forEach(item => {
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }
        
        // Format quantity for display
        const formatQty = (qty) => {
            if (qty === 0.5) return '1/2';
            if (qty === 0.25) return '1/4';
            if (qty === 0.75) return '3/4';
            if (qty % 1 === 0) return qty.toString();
            return qty.toFixed(3).replace(/\.?0+$/, '');
        };
        
        doc.text(item.name.substring(0, 30), 22, yPos + 5);
        doc.text(`${formatQty(item.quantity)} ${item.unit}`, 80, yPos + 5);
        doc.text(formatCurrency(item.storeRate), 110, yPos + 5);
        doc.text(formatCurrency(item.amount), 140, yPos + 5);
        
        yPos += 7;
    });
    
    // Totals
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Grand Total:', 120, yPos);
    doc.text(formatCurrency(billData.totalAmount), 170, yPos);
    doc.setFont(undefined, 'normal');
    
    // Contact Information
    yPos += 15;
    doc.setFontSize(10);
    doc.text('Contact:', 20, yPos);
    yPos += 7;
    doc.text('Mohamed Younus: 9600008264', 20, yPos);
    yPos += 7;
    doc.text('Rhiswan: 9962156036', 20, yPos);
    
    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });
    
    // Save PDF
    doc.save(`Customer-Bill-${billData.billNumber}-${billData.date}.pdf`);
};

// Generate Internal PDF (for records - shows all details)
const generateInternalPDF = (billData) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Store name and header
    doc.setFontSize(20);
    doc.text('BISMI DEPARTMENT STORE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('(Internal Record)', 105, 27, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Bill Number: ${billData.billNumber}`, 20, 38);
    doc.text(`Date: ${billData.date}`, 20, 45);
    
    // Line separator
    doc.line(20, 51, 190, 51);
    
    // Items table
    let yPos = 61;
    doc.setFontSize(9);
    
    // Table header
    doc.setFillColor(46, 204, 113);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Item', 22, yPos + 5);
    doc.text('Qty', 70, yPos + 5);
    doc.text('Rate', 95, yPos + 5);
    doc.text('Amount', 120, yPos + 5);
    doc.text('Cost', 145, yPos + 5);
    doc.text('Profit', 165, yPos + 5);
    
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    
    // Items
    billData.items.forEach(item => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        
        // Format quantity for display
        const formatQty = (qty) => {
            if (qty === 0.5) return '1/2';
            if (qty === 0.25) return '1/4';
            if (qty === 0.75) return '3/4';
            if (qty % 1 === 0) return qty.toString();
            return qty.toFixed(3).replace(/\.?0+$/, '');
        };
        
        doc.text(item.name.substring(0, 25), 22, yPos + 5);
        doc.text(`${formatQty(item.quantity)} ${item.unit}`, 70, yPos + 5);
        doc.text(formatCurrency(item.storeRate), 95, yPos + 5);
        doc.text(formatCurrency(item.amount), 120, yPos + 5);
        doc.text(formatCurrency(item.cost), 145, yPos + 5);
        doc.text(formatCurrency(item.profit), 165, yPos + 5);
        
        yPos += 7;
    });
    
    // Totals
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.text('Total Selling Amount:', 120, yPos);
    doc.text(formatCurrency(billData.totalAmount), 170, yPos);
    yPos += 7;
    
    doc.text('Total Purchase Cost:', 120, yPos);
    doc.text(formatCurrency(billData.totalCost), 170, yPos);
    yPos += 7;
    
    doc.setFontSize(12);
    doc.setTextColor(46, 204, 113);
    doc.text('Total Profit:', 120, yPos);
    doc.text(formatCurrency(billData.profit), 170, yPos);
    
    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Internal Record - Do not share with customer', 105, 280, { align: 'center' });
    
    // Save PDF
    doc.save(`Internal-Bill-${billData.billNumber}-${billData.date}.pdf`);
};

// Initialize default items from image data
const initializeDefaultItems = () => {
    const defaultItems = [
        // Updated rates from image: RATE = storeRate, DIFF-RATE = purchaseRate
        { name: 'PALM.OIL(1KG)', unit: 'BOX', storeRate: 1200, purchaseRate: 1110 },
        { name: 'PATTAI-1', unit: 'KG', storeRate: 1400, purchaseRate: 450 },
        { name: 'PATTAI-2', unit: 'KG', storeRate: 510, purchaseRate: 260 },
        { name: 'ELLACHI', unit: 'KG', storeRate: 3200, purchaseRate: 2600 },
        { name: 'KRAMBU', unit: 'KG', storeRate: 1200, purchaseRate: 850 },
        { name: 'AJINOMOTO', unit: 'KG', storeRate: 180, purchaseRate: 138 },
        { name: 'VELLEM', unit: 'KG', storeRate: 70, purchaseRate: 65 },
        { name: 'CHILLI-POW-50GM-S', unit: 'KG', storeRate: 240, purchaseRate: 225 },
        { name: 'CHICKEN-POW-50GM-S', unit: 'KG', storeRate: 330, purchaseRate: 285 },
        { name: 'MUTTON-POW-50GM-S', unit: 'KG', storeRate: 430, purchaseRate: 385 },
        { name: 'PULLI', unit: 'KG', storeRate: 185, purchaseRate: 175 },
        { name: 'WHITE.ELLU', unit: 'KG', storeRate: 300, purchaseRate: 200 },
        { name: 'KADUGU', unit: 'KG', storeRate: 120, purchaseRate: 100 },
        { name: 'JEERAM', unit: 'KG', storeRate: 360, purchaseRate: 300 },
        { name: 'VENTHAIYAM', unit: 'KG', storeRate: 110, purchaseRate: 75 },
        { name: 'MILAGU', unit: 'KG', storeRate: 840, purchaseRate: 740 },
        { name: 'MYSORE PARUPPU', unit: 'KG', storeRate: 100, purchaseRate: 0 },
        { name: 'SIRU PARUPPU', unit: 'KG', storeRate: 125, purchaseRate: 0 },
        { name: 'THOORAM PARUPPU', unit: 'KG', storeRate: 120, purchaseRate: 0 },
        { name: 'APPALAM', unit: 'PACKET', storeRate: 50, purchaseRate: 0 },
        { name: 'TIGER KESARI', unit: 'BAG', storeRate: 380, purchaseRate: 0 },
        { name: 'MEAL MAKER', unit: 'KG', storeRate: 110, purchaseRate: 0 },
        { name: 'VINEGAR', unit: 'BOX (12)', storeRate: 25, purchaseRate: 20 },
        { name: 'ROCK SALT', unit: 'KG', storeRate: 17, purchaseRate: 14 },
        // New items
        { name: 'VERKADALAI', unit: 'KG', storeRate: 150, purchaseRate: 134 },
        { name: 'TURMERIC POWDER', unit: 'KG', storeRate: 270, purchaseRate: 233 },
        { name: 'GARAM MASALA', unit: 'KG', storeRate: 0, purchaseRate: 0 }
    ];
    
    // Add IDs and calculate profit margins
    const itemsWithIds = defaultItems.map((item, index) => ({
        id: index + 1,
        ...item,
        profitMargin: item.storeRate - item.purchaseRate
    }));
    
    Storage.set('items', itemsWithIds);
    return itemsWithIds;
};

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Storage,
        formatCurrency,
        formatDate,
        generateBillNumber,
        getDateRange,
        generatePDF,
        initializeDefaultItems
    };
}

