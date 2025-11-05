// Reports Application

let bills = [];
let filteredBills = [];
let salesProfitChart = null;
let dailySalesChart = null;
let profitCostChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadBills();
    setupEventListeners();
    applyFilter('month'); // Default to current month
    initializeCharts();
});

// Load bills from localStorage
function loadBills() {
    bills = Storage.get('bills') || [];
    filteredBills = bills;
    renderReports();
    updateSummary();
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
    const modal = document.getElementById('billDetailsModal');
    modal.classList.remove('show');
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
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeBillDetailsModal();
        });
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('billDetailsModal');
        if (e.target === modal) {
            closeBillDetailsModal();
        }
    });
    
    // Set default dates
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('startDate').value = firstDayOfMonth.toISOString().split('T')[0];
    document.getElementById('endDate').value = lastDayOfMonth.toISOString().split('T')[0];
    
    // Delete selected button
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedBills);
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

