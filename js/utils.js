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

const formatPlainAmount = (amount) => {
    return roundToTwo(Number(amount) || 0).toFixed(2);
};

// Format date
const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

// Format quantity for display
const formatQuantityDisplay = (qty, unit = '') => {
    const value = Number(qty);
    if (!Number.isFinite(value)) {
        return unit ? `0 ${unit}` : '0';
    }
    if (value === 0.5) return unit ? `1/2 ${unit}` : '1/2';
    if (value === 0.25) return unit ? `1/4 ${unit}` : '1/4';
    if (value === 0.75) return unit ? `3/4 ${unit}` : '3/4';
    if (Number.isInteger(value)) {
        return unit ? `${value} ${unit}` : `${value}`;
    }
    const formatted = value.toFixed(3).replace(/\.?0+$/, '');
    return unit ? `${formatted} ${unit}` : formatted;
};

const BILL_SEQUENCE_KEY = 'nextBillSequence';

const extractSequenceFromBillNumber = (billNumber) => {
    if (typeof billNumber !== 'string') return null;
    const match = billNumber.match(/(\d+)/);
    if (!match) return null;
    const sequence = parseInt(match[1], 10);
    return Number.isFinite(sequence) ? sequence : null;
};

const getBillSequenceValue = (billData = {}) => {
    if (typeof billData.sequence === 'number' && Number.isFinite(billData.sequence)) {
        return billData.sequence;
    }
    const derived = extractSequenceFromBillNumber(billData.billNumber);
    if (derived !== null) {
        billData.sequence = derived;
    }
    return derived;
};

const getNextBillIdentifiers = () => {
    const storedNext = Storage.get(BILL_SEQUENCE_KEY);
    const billsInStorage = Storage.get('bills') || [];
    let nextSequence = Number.isInteger(storedNext) && storedNext > 0 ? storedNext : null;

    if (nextSequence === null) {
        const maxSequence = billsInStorage.reduce((max, bill) => {
            const seq = getBillSequenceValue({ ...bill });
            return seq && seq > max ? seq : max;
        }, 0);
        nextSequence = maxSequence + 1;
    }

    Storage.set(BILL_SEQUENCE_KEY, nextSequence + 1);

    return {
        sequence: nextSequence,
        billNumber: `BILL-${String(nextSequence).padStart(3, '0')}`
    };
};

const getBillFileName = (billData, suffix = '') => {
    const sequence = getBillSequenceValue(billData);
    const sequenceLabel = sequence !== null && sequence !== undefined
        ? sequence
        : (billData.billNumber ? billData.billNumber.replace(/\s+/g, '_') : 'UNKNOWN');
    const formattedSequence = typeof sequenceLabel === 'number' || /^\d+$/.test(sequenceLabel)
        ? String(sequenceLabel).padStart(2, '0')
        : sequenceLabel;

    const base = `MALLIGAI_BISMI_BILL_${formattedSequence}`;
    return suffix ? `${base}_${suffix}` : base;
};

const roundToTwo = (value) => {
    const num = Number(value) || 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const sanitiseBillItems = (items = []) => {
    return items.map(item => {
        const quantity = Number(item.quantity) || 0;
        const storeRate = Number(item.storeRate) || 0;
        const purchaseRate = Number(item.purchaseRate) || 0;
        const amount = item.amount !== undefined ? Number(item.amount) : storeRate * quantity;
        const cost = item.cost !== undefined ? Number(item.cost) : purchaseRate * quantity;
        const profit = item.profit !== undefined ? Number(item.profit) : amount - cost;

        return {
            ...item,
            quantity,
            storeRate,
            purchaseRate,
            amount: roundToTwo(amount),
            cost: roundToTwo(cost),
            profit: roundToTwo(profit)
        };
    });
};

const rebuildBillTotals = (billData) => {
    const items = sanitiseBillItems(billData.items || []);
    const totals = items.reduce((acc, item) => {
        acc.totalAmount += item.amount;
        acc.totalCost += item.cost;
        acc.totalProfit += item.profit;
        return acc;
    }, { totalAmount: 0, totalCost: 0, totalProfit: 0 });

    return {
        ...billData,
        items,
        totalAmount: roundToTwo(totals.totalAmount),
        totalCost: roundToTwo(totals.totalCost),
        profit: roundToTwo(totals.totalProfit)
    };
};

const calculateAdaptiveRowHeight = (itemCount, tableTop, reservedSpace, pageHeight, baseRowHeight = 7, minRowHeight = 3.5) => {
    if (itemCount <= 0) {
        return baseRowHeight;
    }

    const maxTableHeight = Math.max(40, pageHeight - tableTop - reservedSpace);
    const requiredHeight = itemCount * baseRowHeight;

    if (requiredHeight <= maxTableHeight) {
        return baseRowHeight;
    }

    const adapted = maxTableHeight / itemCount;
    return Math.max(minRowHeight, adapted);
};

// Generate bill number
const generateBillNumber = () => {
    const { billNumber } = getNextBillIdentifiers();
    return billNumber;
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
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const { width, height } = doc.internal.pageSize;
    const leftMargin = 20;
    const rightMargin = 20;
    const tableTop = 63;
    const reservedSpace = 90;
    const sanitisedBill = rebuildBillTotals(billData);
    const items = sanitisedBill.items || [];

    // Adaptive sizing
    const baseRowHeight = 7;
    const minRowHeight = 3.5;
    const rowHeight = calculateAdaptiveRowHeight(items.length, tableTop, reservedSpace, height, baseRowHeight, minRowHeight);
    const fontScale = rowHeight / baseRowHeight;
    const tableFontSize = Math.max(7, 10 * fontScale);
    const headerFontSize = Math.max(10, tableFontSize + 1);
    const headerHeight = Math.max(rowHeight, 8);
    const tableWidth = width - leftMargin - rightMargin;
    const baselineOffset = rowHeight * 0.6;

    // Header
    doc.setFontSize(20);
    doc.text('BISMI DEPARTMENT STORE', width / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Puzhuthivakkam, Chennai', width / 2, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Bill Number: ${sanitisedBill.billNumber}`, leftMargin, 40);
    doc.text(`Date: ${sanitisedBill.date}`, leftMargin, 47);

    doc.line(leftMargin, 53, width - rightMargin, 53);

    const columns = [
        { label: 'Item', width: 72, align: 'left', padding: 2, render: (item) => item.name.substring(0, 50) },
        { label: 'Qty', width: 35, align: 'center', padding: 0, render: (item) => formatQuantityDisplay(item.quantity, item.unit) },
        { label: 'Rate', width: 31, align: 'right', padding: 2, render: (item) => formatPlainAmount(item.storeRate) },
        { label: 'Amount', width: 32, align: 'right', padding: 2, render: (item) => formatPlainAmount(item.amount) }
    ];

    let yPos = tableTop;

    // Table header
    doc.setFillColor(46, 204, 113);
    doc.rect(leftMargin, yPos, tableWidth, headerHeight, 'F');
    doc.setFontSize(headerFontSize);
    doc.setTextColor(255, 255, 255);

    let xCursor = leftMargin;
    columns.forEach(col => {
        const textX = col.align === 'left'
            ? xCursor + col.padding
            : col.align === 'center'
                ? xCursor + (col.width / 2)
                : xCursor + col.width - col.padding;
        doc.text(col.label, textX, yPos + headerHeight / 2 + headerFontSize * 0.35, { align: col.align });
        xCursor += col.width;
    });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(tableFontSize);

    // Table rows
    yPos += headerHeight;
    items.forEach(item => {
        xCursor = leftMargin;
        columns.forEach(col => {
            const cellValue = col.render(item);
            const textX = col.align === 'left'
                ? xCursor + col.padding
                : col.align === 'center'
                    ? xCursor + (col.width / 2)
                    : xCursor + col.width - col.padding;
            doc.text(String(cellValue), textX, yPos + baselineOffset - (rowHeight - tableFontSize) / 2, { align: col.align });
            xCursor += col.width;
        });
        yPos += rowHeight;
    });

    doc.line(leftMargin, yPos, width - rightMargin, yPos);

    // Totals
    yPos += 6;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Grand Total:', width - rightMargin - 45, yPos, { align: 'right' });
    doc.text(`Rs ${formatPlainAmount(sanitisedBill.totalAmount)}`, width - rightMargin, yPos, { align: 'right' });
    doc.setFont(undefined, 'normal');

    // Contact Information
    doc.setFontSize(10);
    doc.text('Contact:', leftMargin, yPos + 15);
    doc.text('Mohamed Younus: 9600008264', leftMargin, yPos + 22);
    doc.text('Rhiswan: 9962156036', leftMargin, yPos + 29);

    doc.setFontSize(10);
    doc.text('Thank you for your business!', width / 2, height - 20, { align: 'center' });

    const fileName = getBillFileName(sanitisedBill, 'CUSTOMER');
    doc.save(`${fileName}.pdf`);
};

// Generate Internal PDF (for records - shows all details)
const generateInternalPDF = (billData) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const { width, height } = doc.internal.pageSize;
    const leftMargin = 20;
    const rightMargin = 20;
    const tableTop = 61;
    const reservedSpace = 80;
    const sanitisedBill = rebuildBillTotals(billData);
    const items = sanitisedBill.items || [];

    const baseRowHeight = 7;
    const minRowHeight = 3.5;
    const rowHeight = calculateAdaptiveRowHeight(items.length, tableTop, reservedSpace, height, baseRowHeight, minRowHeight);
    const fontScale = rowHeight / baseRowHeight;
    const tableFontSize = Math.max(7, 9 * fontScale);
    const headerFontSize = Math.max(10, tableFontSize + 1);
    const headerHeight = Math.max(rowHeight, 8);
    const tableWidth = width - leftMargin - rightMargin;
    const baselineOffset = rowHeight * 0.6;

    doc.setFontSize(20);
    doc.text('BISMI DEPARTMENT STORE', width / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('(Internal Record)', width / 2, 27, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Bill Number: ${sanitisedBill.billNumber}`, leftMargin, 38);
    doc.text(`Date: ${sanitisedBill.date}`, leftMargin, 45);

    doc.line(leftMargin, 51, width - rightMargin, 51);

    const columns = [
        { label: 'Item', width: 60, align: 'left', padding: 2, render: (item) => item.name.substring(0, 45) },
        { label: 'Qty', width: 20, align: 'center', padding: 0, render: (item) => formatQuantityDisplay(item.quantity, item.unit) },
        { label: 'Rate', width: 25, align: 'right', padding: 2, render: (item) => formatPlainAmount(item.storeRate) },
        { label: 'Amount', width: 25, align: 'right', padding: 2, render: (item) => formatPlainAmount(item.amount) },
        { label: 'Cost', width: 20, align: 'right', padding: 2, render: (item) => formatPlainAmount(item.cost) },
        { label: 'Profit', width: 20, align: 'right', padding: 2, render: (item) => formatPlainAmount(item.profit) }
    ];

    let yPos = tableTop;

    doc.setFillColor(46, 204, 113);
    doc.rect(leftMargin, yPos, tableWidth, headerHeight, 'F');
    doc.setFontSize(headerFontSize);
    doc.setTextColor(255, 255, 255);

    let xCursor = leftMargin;
    columns.forEach(col => {
        const textX = col.align === 'left'
            ? xCursor + col.padding
            : col.align === 'center'
                ? xCursor + (col.width / 2)
                : xCursor + col.width - col.padding;
        doc.text(col.label, textX, yPos + headerHeight / 2 + headerFontSize * 0.35, { align: col.align });
        xCursor += col.width;
    });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(tableFontSize);

    yPos += headerHeight;
    items.forEach(item => {
        xCursor = leftMargin;
        columns.forEach(col => {
            const cellValue = col.render(item);
            const textX = col.align === 'left'
                ? xCursor + col.padding
                : col.align === 'center'
                    ? xCursor + (col.width / 2)
                    : xCursor + col.width - col.padding;
            doc.text(String(cellValue), textX, yPos + baselineOffset - (rowHeight - tableFontSize) / 2, { align: col.align });
            xCursor += col.width;
        });
        yPos += rowHeight;
    });

    doc.line(leftMargin, yPos, width - rightMargin, yPos);

    yPos += 6;

    doc.setFontSize(11);
    doc.text('Total Selling Amount:', width - rightMargin - 45, yPos, { align: 'right' });
    doc.text(`Rs ${formatPlainAmount(sanitisedBill.totalAmount)}`, width - rightMargin, yPos, { align: 'right' });
    yPos += 6;

    doc.text('Total Purchase Cost:', width - rightMargin - 45, yPos, { align: 'right' });
    doc.text(`Rs ${formatPlainAmount(sanitisedBill.totalCost)}`, width - rightMargin, yPos, { align: 'right' });
    yPos += 6;

    doc.setFontSize(12);
    doc.setTextColor(46, 204, 113);
    doc.text('Total Profit:', width - rightMargin - 45, yPos, { align: 'right' });
    doc.text(`Rs ${formatPlainAmount(sanitisedBill.profit)}`, width - rightMargin, yPos, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Internal Record - Do not share with customer', width / 2, height - 20, { align: 'center' });

    const fileName = getBillFileName(sanitisedBill, 'INTERNAL');
    doc.save(`${fileName}.pdf`);
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
        { name: 'GARAM MASALA', unit: 'KG', storeRate: 0, purchaseRate: 0 },
        // New items
        { name: 'SAMBAR POWDER', unit: 'KG', storeRate: 0, purchaseRate: 0, imageUrl: 'https://img.thecdn.in/271829/1672307948475_SKU-0576_0.jpeg?width=600&format=webp' },
        { name: 'RASAM POWDER', unit: 'KG', storeRate: 0, purchaseRate: 0, imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNLXL1Rk693Kg829ThUNLwla-QmPntJesKtQ&s' },
        { name: 'PEPPER POWDER', unit: 'KG', storeRate: 0, purchaseRate: 0, imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvdbt9AHIyv7JFAvpp_Aw6h7Xye46MujWpkQ&s' },
        { name: 'MALLI POWDER', unit: 'KG', storeRate: 0, purchaseRate: 0, imageUrl: 'https://m.media-amazon.com/images/I/71uyrktjLhL.jpg' },
        { name: 'GUNDU MILAGAI', unit: 'KG', storeRate: 0, purchaseRate: 0, imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuj2gr5Qr3vMT3ZDxOgAhqThTH9SK0fv2ZqQ&s' }
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
        getNextBillIdentifiers,
        getBillSequenceValue,
        getDateRange,
        generatePDF,
        initializeDefaultItems
    };
}

