// Reports Application

let bills = [];
let filteredBills = [];
let salesProfitChart = null;
let dailySalesChart = null;
let profitCostChart = null;
let editingBill = null;
let editingBillOriginal = null;
let items = [];
let stockData = [];
const DEFAULT_TIMESTAMP_HOUR = 12;

const toInputDateValue = (displayDate) => {
    if (!displayDate || typeof displayDate !== 'string') return '';
    const [day, month, year] = displayDate.split('-');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const toDisplayDateValue = (inputDateValue) => {
    if (!inputDateValue || typeof inputDateValue !== 'string') return '';
    const [year, month, day] = inputDateValue.split('-');
    if (!year || !month || !day) return '';
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
};

const getTimestampFromBillDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') {
        return new Date().toISOString();
    }

    const [day, month, year] = dateString.split('-').map(part => parseInt(part, 10));
    if (!day || !month || !year) {
        return new Date().toISOString();
    }

    const date = new Date(year, month - 1, day, DEFAULT_TIMESTAMP_HOUR, 0, 0, 0);
    return date.toISOString();
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    loadStockData();
    loadBills();
    setupEventListeners();
    applyFilter('month'); // Default to current month
    initializeCharts();
    renderStockBalance();
    
    // Listen for storage sync events
    window.addEventListener('storageSync', () => {
        loadItems();
        loadStockData();
        loadBills();
        renderStockBalance();
    });
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'lastSync') {
            loadItems();
            loadStockData();
            loadBills();
            renderStockBalance();
        }
    });
});

// Load items from localStorage
function loadItems() {
    items = Storage.get('items') || [];
}

// Load stock data from localStorage
function loadStockData() {
    stockData = Storage.get('stockData') || [];
}

// Load bills from localStorage
function loadBills() {
    const storedBills = Storage.get('bills') || [];
    const { normalizedBills, changed } = normalizeBills(storedBills);

    if (changed) {
        Storage.set('bills', normalizedBills);
    }

    bills = normalizedBills;
    filteredBills = bills;
    renderReports();
    updateSummary();
}

// Render stock balance table
function renderStockBalance() {
    const tbody = document.getElementById('stockBalanceTableBody');
    
    if (!tbody) return;
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No items found. Please add items in Manage Items page first.</td></tr>';
        return;
    }
    
    // Create a map of stock data by item ID
    const stockMap = {};
    stockData.forEach(stock => {
        stockMap[stock.itemId] = stock;
    });
    
    // Filter items to show only those with balance > 0
    const itemsWithStock = items.filter(item => {
        const stock = stockMap[item.id];
        const currentStock = stock ? stock.quantity : 0;
        return currentStock > 0;
    });
    
    if (itemsWithStock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No items with stock balance available.</td></tr>';
        return;
    }
    
    // Calculate total value
    let totalValue = 0;
    
    const rows = itemsWithStock.map(item => {
        const stock = stockMap[item.id];
        const currentStock = stock ? stock.quantity : 0;
        const lastUpdated = stock ? formatDate(new Date(stock.lastUpdated)) : 'Never';
        const itemValue = currentStock * item.storeRate;
        totalValue += itemValue;
        
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td class="stock-quantity ${currentStock <= 0 ? 'low-stock' : currentStock <= 10 ? 'medium-stock' : ''}">
                    ${currentStock.toFixed(2)} ${item.unit}
                </td>
                <td>${formatCurrency(item.storeRate)}</td>
                <td>${lastUpdated}</td>
            </tr>
        `;
    }).join('');
    
    // Add total row
    const totalRow = `
        <tr style="background: #f8f9fa; font-weight: bold; border-top: 2px solid #27ae60;">
            <td colspan="3" style="text-align: right; padding-right: 1rem;">Total Value:</td>
            <td style="color: #27ae60; font-size: 1.1em;">${formatCurrency(totalValue)}</td>
            <td></td>
        </tr>
    `;
    
    tbody.innerHTML = rows + totalRow;
}

// Render reports table
function renderReports() {
    const tbody = document.getElementById('reportsTableBody');
    
    if (filteredBills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No bills found for the selected period.</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    const sortedBills = [...filteredBills].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    tbody.innerHTML = sortedBills.map(bill => {
        return `
            <tr>
                <td>
                    <input type="checkbox" class="bill-checkbox" data-bill="${bill.billNumber}" onchange="updateDeleteButton()">
                    ${bill.billNumber}
                </td>
                <td>${bill.date}</td>
                <td>${bill.items.length}</td>
                <td>${formatCurrency(bill.totalAmount)}</td>
                <td>${formatCurrency(bill.totalCost)}</td>
                <td class="profit-cell">${formatCurrency(bill.profit)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-view" onclick="viewBillDetails('${bill.billNumber}')">View</button>
                        <button class="btn-download" onclick="downloadBill('${bill.billNumber}', 'customer')">Customer</button>
                        <button class="btn-download" onclick="downloadBill('${bill.billNumber}', 'internal')">Internal</button>
                        <button class="btn-edit" onclick="openEditBill('${bill.billNumber}')">Edit</button>
                        <button class="btn-delete" onclick="deleteBill('${bill.billNumber}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Show footer if there are bills
    if (sortedBills.length > 0) {
        document.getElementById('reportsTableFooter').style.display = 'table-row';
    }
}

// Update summary cards
function updateSummary() {
    let totalSales = 0;
    let totalProfit = 0;
    
    filteredBills.forEach(bill => {
        totalSales += bill.totalAmount;
        totalProfit += bill.profit;
    });
    
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalProfitReport').textContent = formatCurrency(totalProfit);
    document.getElementById('billsCount').textContent = filteredBills.length;
    
    updateCharts();
}

// Apply filter
function applyFilter(filterType) {
    const { startDate, endDate } = getDateRange(filterType);
    
    if (startDate && endDate) {
        filteredBills = bills.filter(bill => {
            const billDate = new Date(bill.timestamp);
            return billDate >= startDate && billDate <= endDate;
        });
    } else {
        filteredBills = bills;
    }
    
    renderReports();
    updateSummary();
}

// Apply custom date range filter
function applyDateRangeFilter() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
    
    if (startDate && endDate) {
        // Set time to start/end of day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        filteredBills = bills.filter(bill => {
            const billDate = new Date(bill.timestamp);
            return billDate >= startDate && billDate <= endDate;
        });
    } else if (startDate) {
        startDate.setHours(0, 0, 0, 0);
        filteredBills = bills.filter(bill => {
            const billDate = new Date(bill.timestamp);
            return billDate >= startDate;
        });
    } else if (endDate) {
        endDate.setHours(23, 59, 59, 999);
        filteredBills = bills.filter(bill => {
            const billDate = new Date(bill.timestamp);
            return billDate <= endDate;
        });
    } else {
        filteredBills = bills;
    }
    
    renderReports();
    updateSummary();
}

// View bill details (global function)
window.viewBillDetails = function(billNumber) {
    const bill = bills.find(b => b.billNumber === billNumber);
    if (!bill) return;
    
    const modal = document.getElementById('billDetailsModal');
    const content = document.getElementById('billDetailsContent');
    
    content.innerHTML = `
        <div class="bill-details">
            <div class="bill-header">
                <h3>${bill.billNumber}</h3>
                <p><strong>Date:</strong> ${bill.date}</p>
            </div>
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Store Rate</th>
                        <th>Purchase Rate</th>
                        <th>Amount</th>
                        <th>Cost</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${bill.items.map(item => {
                        const formatQty = (qty) => {
                            if (qty === 0.5) return '1/2';
                            if (qty === 0.25) return '1/4';
                            if (qty === 0.75) return '3/4';
                            if (qty % 1 === 0) return qty.toString();
                            return qty.toFixed(3).replace(/\.?0+$/, '');
                        };
                        return `
                        <tr>
                            <td>${item.name}</td>
                            <td>${formatQty(item.quantity)} ${item.unit}</td>
                            <td>${formatCurrency(item.storeRate)}</td>
                            <td>${formatCurrency(item.purchaseRate)}</td>
                            <td>${formatCurrency(item.amount)}</td>
                            <td>${formatCurrency(item.cost)}</td>
                            <td class="profit-cell">${formatCurrency(item.profit)}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
            <div class="bill-totals">
                <div class="summary-row">
                    <span>Total Selling Amount:</span>
                    <span>${formatCurrency(bill.totalAmount)}</span>
                </div>
                <div class="summary-row">
                    <span>Total Purchase Cost:</span>
                    <span>${formatCurrency(bill.totalCost)}</span>
                </div>
                <div class="summary-row profit">
                    <span>Total Profit:</span>
                    <span>${formatCurrency(bill.profit)}</span>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

// Close bill details modal
function closeBillDetailsModal() {
    closeModalById('billDetailsModal');
}

// Setup event listeners
function setupEventListeners() {
    // Quick filter buttons
    document.querySelectorAll('.quick-filters button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            applyFilter(filter);
            
            // Update active button
            document.querySelectorAll('.quick-filters button').forEach(b => {
                b.classList.remove('active');
            });
            e.target.classList.add('active');
        });
    });
    
    // Apply date range filter button
    document.getElementById('applyFilter').addEventListener('click', applyDateRangeFilter);
    
    // Close modal buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const targetModal = btn.dataset.closeModal;
            closeModalById(targetModal);
        });
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        ['billDetailsModal', 'editBillModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && e.target === modal) {
                closeModalById(modalId);
            }
        });
    });
    
    // Set default dates
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('startDate').value = firstDayOfMonth.toISOString().split('T')[0];
    document.getElementById('endDate').value = lastDayOfMonth.toISOString().split('T')[0];
    
    // Delete selected button
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedBills);
    
    // Refresh stock data when page becomes visible (e.g., when returning from balance page)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadStockData();
            renderStockBalance();
        }
    });
}

// Delete a single bill
window.deleteBill = function(billNumber) {
    if (confirm(`Are you sure you want to delete bill ${billNumber}? This action cannot be undone.`)) {
        bills = bills.filter(b => b.billNumber !== billNumber);
        Storage.set('bills', bills);
        loadBills();
        applyDateRangeFilter(); // Reapply current filter
        alert('Bill deleted successfully!');
    }
};

// Update delete button visibility
window.updateDeleteButton = function() {
    const checkboxes = document.querySelectorAll('.bill-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (checkboxes.length > 0) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.textContent = `Delete Selected (${checkboxes.length})`;
    } else {
        deleteBtn.style.display = 'none';
    }
};

// Delete selected bills
function deleteSelectedBills() {
    const checkboxes = document.querySelectorAll('.bill-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select bills to delete.');
        return;
    }
    
    const billNumbers = Array.from(checkboxes).map(cb => cb.dataset.bill);
    if (confirm(`Are you sure you want to delete ${billNumbers.length} bill(s)? This action cannot be undone.`)) {
        bills = bills.filter(b => !billNumbers.includes(b.billNumber));
        Storage.set('bills', bills);
        loadBills();
        applyDateRangeFilter(); // Reapply current filter
        alert(`${billNumbers.length} bill(s) deleted successfully!`);
    }
};

function closeModalById(modalId) {
    if (!modalId) return;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }

    if (modalId === 'editBillModal') {
        editingBill = null;
        editingBillOriginal = null;
    }
}

function normalizeBills(rawBills = []) {
    let changed = false;
    const normalizedBills = rawBills.map(bill => {
        if (!bill) return bill;
        const draft = rebuildBillTotals({
            ...bill,
            items: (bill.items || []).map(item => ({ ...item }))
        });

        const sequence = getBillSequenceValue(draft);
        if (sequence !== undefined && sequence !== null && draft.sequence !== sequence) {
            draft.sequence = sequence;
            changed = true;
        }

        const desiredTimestamp = getTimestampFromBillDate(draft.date);
        if (!draft.timestamp || typeof draft.timestamp !== 'string') {
            draft.timestamp = desiredTimestamp;
            changed = true;
        }

        if (draft.timestamp !== desiredTimestamp) {
            draft.timestamp = desiredTimestamp;
            changed = true;
        }

        return draft;
    });

    return { normalizedBills, changed };
}

const recalculateEditItem = (item) => {
    const quantity = Number(item.quantity) || 0;
    const storeRate = Number(item.storeRate) || 0;
    const purchaseRate = Number(item.purchaseRate) || 0;
    const amount = roundToTwo(storeRate * quantity);
    const cost = roundToTwo(purchaseRate * quantity);
    const profit = roundToTwo(amount - cost);

    return {
        ...item,
        quantity,
        storeRate,
        purchaseRate,
        amount,
        cost,
        profit
    };
};

const updateEditRowDisplay = (rowElement, item) => {
    if (!rowElement) return;
    const amountCell = rowElement.querySelector('[data-role="amount"]');
    const costCell = rowElement.querySelector('[data-role="cost"]');
    const profitCell = rowElement.querySelector('[data-role="profit"]');

    if (amountCell) amountCell.textContent = formatCurrency(item.amount);
    if (costCell) costCell.textContent = formatCurrency(item.cost);
    if (profitCell) profitCell.textContent = formatCurrency(item.profit);
};

const updateEditBillMeta = () => {
    if (!editingBill) return;
    const itemsCountEl = document.getElementById('editBillItemsCount');
    const grandTotalEl = document.getElementById('editBillGrandTotal');
    const dateDisplayEl = document.getElementById('editBillDateDisplay');
    const dateInputEl = document.getElementById('editBillDateInput');

    if (itemsCountEl) {
        itemsCountEl.textContent = editingBill.items.length;
    }

    if (grandTotalEl) {
        grandTotalEl.textContent = formatCurrency(editingBill.totalAmount || 0);
    }

    if (dateDisplayEl) {
        dateDisplayEl.textContent = editingBill.date || '';
    }

    if (dateInputEl) {
        dateInputEl.value = toInputDateValue(editingBill.date);
    }
};

const renderEditBillTotals = () => {
    const totalsContainer = document.getElementById('editBillTotals');
    if (!totalsContainer || !editingBill) return;

    const totals = editingBill.items.reduce((acc, item) => {
        acc.amount += item.amount;
        acc.cost += item.cost;
        acc.profit += item.profit;
        return acc;
    }, { amount: 0, cost: 0, profit: 0 });

    editingBill.totalAmount = roundToTwo(totals.amount);
    editingBill.totalCost = roundToTwo(totals.cost);
    editingBill.profit = roundToTwo(totals.profit);

    totalsContainer.innerHTML = `
        <div>
            <span>Total Selling Amount</span>
            <strong>${formatCurrency(editingBill.totalAmount)}</strong>
        </div>
        <div>
            <span>Total Purchase Cost</span>
            <strong>${formatCurrency(editingBill.totalCost)}</strong>
        </div>
        <div>
            <span>Total Profit</span>
            <strong>${formatCurrency(editingBill.profit)}</strong>
        </div>
    `;

    updateEditBillMeta();
};

const renderEditBillRows = () => {
    const tbody = document.getElementById('editBillTableBody');
    const emptyState = document.getElementById('editBillEmptyState');
    if (!tbody || !editingBill) return;

    if (editingBill.items.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        renderEditBillTotals();
        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }

    tbody.innerHTML = editingBill.items.map((item, index) => `
        <tr data-index="${index}">
            <td>${item.name}</td>
            <td>
                <input type="number" step="0.01" min="0" value="${item.quantity}" data-field="quantity">
            </td>
            <td>${item.unit || '-'}</td>
            <td>
                <input type="number" step="0.01" min="0" value="${item.storeRate}" data-field="storeRate">
            </td>
            <td>
                <input type="number" step="0.01" min="0" value="${item.purchaseRate}" data-field="purchaseRate">
            </td>
            <td class="amount" data-role="amount">${formatCurrency(item.amount)}</td>
            <td class="cost" data-role="cost">${formatCurrency(item.cost)}</td>
            <td class="profit profit-cell" data-role="profit">${formatCurrency(item.profit)}</td>
            <td>
                <button type="button" class="remove-row-btn" data-action="remove">Remove</button>
            </td>
        </tr>
    `).join('');

    renderEditBillTotals();
};

const handleEditTableInput = (event) => {
    const target = event.target;
    if (!target.matches('input[data-field]') || !editingBill) return;

    const row = target.closest('tr[data-index]');
    if (!row) return;

    const index = parseInt(row.dataset.index, 10);
    if (Number.isNaN(index)) return;

    const field = target.dataset.field;
    let value = parseFloat(target.value);
    if (Number.isNaN(value) || value < 0) {
        value = 0;
        target.value = value;
    }

    editingBill.items[index][field] = value;
    editingBill.items[index] = recalculateEditItem(editingBill.items[index]);
    updateEditRowDisplay(row, editingBill.items[index]);
    renderEditBillTotals();
};

const handleEditTableClick = (event) => {
    const target = event.target;
    if (!editingBill) return;

    if (target.dataset.action === 'remove') {
        const row = target.closest('tr[data-index]');
        if (!row) return;
        const index = parseInt(row.dataset.index, 10);
        if (Number.isNaN(index)) return;

        editingBill.items.splice(index, 1);
        renderEditBillRows();
        renderEditBillTotals();
    }
};

const resetEditBillChanges = () => {
    if (!editingBillOriginal) return;
    editingBill = JSON.parse(JSON.stringify(editingBillOriginal));
    renderEditBillRows();
    renderEditBillTotals();
};

const saveEditedBill = (event) => {
    event.preventDefault();
    if (!editingBill) return;

    editingBill.items = editingBill.items.map(item => recalculateEditItem(item));
    renderEditBillTotals();
    editingBill.timestamp = getTimestampFromBillDate(editingBill.date);

    const updatedBill = {
        ...editingBill,
        items: editingBill.items.map(item => ({ ...item }))
    };

    const billIndex = bills.findIndex(b => b.billNumber === updatedBill.billNumber);
    if (billIndex !== -1) {
        bills[billIndex] = updatedBill;
    }

    filteredBills = filteredBills.map(b => b.billNumber === updatedBill.billNumber ? updatedBill : b);
    Storage.set('bills', bills);

    renderReports();
    updateSummary();
    editingBillOriginal = JSON.parse(JSON.stringify(updatedBill));
    closeModalById('editBillModal');
    alert('Bill updated successfully!');
};

const renderEditBillModal = () => {
    const container = document.getElementById('editBillContent');
    if (!container) return;

    if (!editingBill) {
        container.innerHTML = '<p>No bill selected.</p>';
        return;
    }

    const inputDateValue = toInputDateValue(editingBill.date);

    container.innerHTML = `
        <div class="edit-bill-meta">
            <div>
                <span>Bill Number</span>
                <strong id="editBillNumber">${editingBill.billNumber}</strong>
            </div>
            <div>
                <span>Date</span>
                <div class="edit-bill-date-field">
                    <input type="date" id="editBillDateInput" value="${inputDateValue}">
                    <small id="editBillDateDisplay">${editingBill.date}</small>
                </div>
            </div>
            <div>
                <span>Items</span>
                <strong id="editBillItemsCount">${editingBill.items.length}</strong>
            </div>
            <div>
                <span>Grand Total</span>
                <strong id="editBillGrandTotal">${formatCurrency(editingBill.totalAmount)}</strong>
            </div>
        </div>
        <form id="editBillForm">
            <div class="table-wrapper">
                <table class="edit-bill-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                            <th>Store Rate</th>
                            <th>Purchase Rate</th>
                            <th>Amount</th>
                            <th>Cost</th>
                            <th>Profit</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="editBillTableBody"></tbody>
                </table>
            </div>
            <div id="editBillEmptyState" class="edit-bill-empty" style="display: none;">
                No items in this bill. Add items from the billing page if needed.
            </div>
            <div class="edit-bill-totals" id="editBillTotals"></div>
            <div class="edit-bill-actions">
                <button type="button" class="btn-link" id="resetBillChanges">Reset Changes</button>
                <div class="edit-bill-actions-right">
                    <button type="button" class="btn btn-secondary" id="cancelEditBillBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </div>
        </form>
    `;

    const tableBody = document.getElementById('editBillTableBody');
    tableBody.addEventListener('input', handleEditTableInput);
    tableBody.addEventListener('click', handleEditTableClick);

    document.getElementById('resetBillChanges').addEventListener('click', (e) => {
        e.preventDefault();
        resetEditBillChanges();
    });

    document.getElementById('cancelEditBillBtn').addEventListener('click', (e) => {
        e.preventDefault();
        closeModalById('editBillModal');
    });

    document.getElementById('editBillForm').addEventListener('submit', saveEditedBill);
    const dateInputEl = document.getElementById('editBillDateInput');
    if (dateInputEl) {
        dateInputEl.addEventListener('change', handleEditDateChange);
    }

    renderEditBillRows();
};

const handleEditDateChange = (event) => {
    if (!editingBill) return;
    const value = event.target.value;
    if (!value) return;

    const displayDate = toDisplayDateValue(value);
    if (!displayDate) return;

    editingBill.date = displayDate;
    editingBill.timestamp = getTimestampFromBillDate(displayDate);
    updateEditBillMeta();
};

window.downloadBill = function(billNumber, type) {
    const bill = bills.find(b => b.billNumber === billNumber);
    if (!bill) {
        alert(`Bill ${billNumber} not found.`);
        return;
    }

    const preparedBill = rebuildBillTotals({
        ...bill,
        items: bill.items.map(item => ({ ...item }))
    });

    if (type === 'customer') {
        generateCustomerPDF(preparedBill);
    } else if (type === 'internal') {
        generateInternalPDF(preparedBill);
    } else {
        alert('Invalid download option selected.');
    }
};

window.openEditBill = function(billNumber) {
    const bill = bills.find(b => b.billNumber === billNumber);
    if (!bill) {
        alert(`Bill ${billNumber} not found.`);
        return;
    }

    editingBillOriginal = JSON.parse(JSON.stringify(rebuildBillTotals(bill)));
    editingBill = JSON.parse(JSON.stringify(rebuildBillTotals(bill)));

    renderEditBillModal();

    const modal = document.getElementById('editBillModal');
    if (modal) {
        modal.classList.add('show');
    }
};

// Initialize charts
function initializeCharts() {
    // Sales & Profit Over Time Chart
    const salesProfitCtx = document.getElementById('salesProfitChart');
    if (salesProfitCtx) {
        salesProfitChart = new Chart(salesProfitCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sales',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Profit',
                    data: [],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Daily Sales Chart
    const dailySalesCtx = document.getElementById('dailySalesChart');
    if (dailySalesCtx) {
        dailySalesChart = new Chart(dailySalesCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Sales',
                    data: [],
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Sales: ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Profit vs Cost Chart
    const profitCostCtx = document.getElementById('profitCostChart');
    if (profitCostCtx) {
        profitCostChart = new Chart(profitCostCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Purchase Cost',
                    data: [],
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 1
                }, {
                    label: 'Profit',
                    data: [],
                    backgroundColor: '#27ae60',
                    borderColor: '#229954',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateCharts();
}

// Update charts with filtered data
function updateCharts() {
    if (!salesProfitChart || !dailySalesChart || !profitCostChart) {
        // Charts not initialized yet, skip update
        return;
    }
    
    // Sort bills by date
    const sortedBills = [...filteredBills].sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Prepare data for Sales & Profit Over Time
    const dates = sortedBills.map(bill => bill.date);
    const sales = sortedBills.map(bill => bill.totalAmount);
    const profits = sortedBills.map(bill => bill.profit);
    
    salesProfitChart.data.labels = dates;
    salesProfitChart.data.datasets[0].data = sales;
    salesProfitChart.data.datasets[1].data = profits;
    salesProfitChart.update();
    
    // Prepare data for Daily Sales
    const dailyData = {};
    sortedBills.forEach(bill => {
        if (dailyData[bill.date]) {
            dailyData[bill.date] += bill.totalAmount;
        } else {
            dailyData[bill.date] = bill.totalAmount;
        }
    });
    
    const dailyDates = Object.keys(dailyData).sort();
    const dailySales = dailyDates.map(date => dailyData[date]);
    
    dailySalesChart.data.labels = dailyDates;
    dailySalesChart.data.datasets[0].data = dailySales;
    dailySalesChart.update();
    
    // Prepare data for Profit vs Cost (aggregated)
    const totalCost = filteredBills.reduce((sum, bill) => sum + bill.totalCost, 0);
    const totalProfit = filteredBills.reduce((sum, bill) => sum + bill.profit, 0);
    
    profitCostChart.data.labels = ['Total'];
    profitCostChart.data.datasets[0].data = [totalCost];
    profitCostChart.data.datasets[1].data = [totalProfit];
    profitCostChart.update();
}

