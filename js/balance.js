// Stock Balance Management Application

let items = [];
let stockData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    loadStockData();
    setupEventListeners();
});

// Load items from localStorage
function loadItems() {
    items = Storage.get('items') || [];
    populateItemSelect();
}

// Load stock data from localStorage
function loadStockData() {
    stockData = Storage.get('stockData') || [];
    renderStockTable();
}

// Populate item select dropdown
function populateItemSelect() {
    const select = document.getElementById('stockItemName');
    select.innerHTML = '<option value="">Select an item</option>';
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (${item.unit})`;
        select.appendChild(option);
    });
}

// Render stock table
function renderStockTable() {
    const tbody = document.getElementById('balanceTableBody');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No items found. Please add items in Manage Items page first.</td></tr>';
        return;
    }
    
    // Create a map of stock data by item ID
    const stockMap = {};
    stockData.forEach(stock => {
        stockMap[stock.itemId] = stock;
    });
    
    tbody.innerHTML = items.map(item => {
        const stock = stockMap[item.id];
        const currentStock = stock ? stock.quantity : 0;
        const lastUpdated = stock ? formatDate(new Date(stock.lastUpdated)) : 'Never';
        
        return `
            <tr data-item-id="${item.id}">
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td class="stock-quantity ${currentStock <= 0 ? 'low-stock' : currentStock <= 10 ? 'medium-stock' : ''}">
                    ${currentStock.toFixed(2)} ${item.unit}
                </td>
                <td>${lastUpdated}</td>
                <td>
                    <button class="btn-edit" onclick="updateStock(${item.id})">Update</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update stock (global function)
window.updateStock = function(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const stock = stockData.find(s => s.itemId === itemId);
    
    document.getElementById('stockModalTitle').textContent = 'Update Stock';
    document.getElementById('stockItemId').value = itemId;
    document.getElementById('stockItemName').value = itemId;
    document.getElementById('stockQuantity').value = stock ? stock.quantity : 0;
    document.getElementById('stockOperation').value = 'set';
    
    showStockModal();
}

// Add new stock entry
function addStock() {
    document.getElementById('stockModalTitle').textContent = 'Add Stock';
    document.getElementById('stockForm').reset();
    document.getElementById('stockItemId').value = '';
    document.getElementById('stockItemName').value = '';
    document.getElementById('stockQuantity').value = '';
    document.getElementById('stockOperation').value = 'set';
    showStockModal();
}

// Save stock (add or update)
function saveStock(e) {
    e.preventDefault();
    
    const itemId = parseInt(document.getElementById('stockItemId').value);
    const quantity = parseFloat(document.getElementById('stockQuantity').value);
    const operation = document.getElementById('stockOperation').value;
    
    if (!itemId || isNaN(quantity) || quantity < 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
        alert('Item not found.');
        return;
    }
    
    // Find existing stock entry
    const existingStockIndex = stockData.findIndex(s => s.itemId === itemId);
    let newQuantity;
    
    if (operation === 'set') {
        newQuantity = quantity;
    } else if (operation === 'add') {
        const currentStock = existingStockIndex !== -1 ? stockData[existingStockIndex].quantity : 0;
        newQuantity = currentStock + quantity;
    } else if (operation === 'subtract') {
        const currentStock = existingStockIndex !== -1 ? stockData[existingStockIndex].quantity : 0;
        newQuantity = Math.max(0, currentStock - quantity);
    }
    
    const stockEntry = {
        itemId: itemId,
        itemName: item.name,
        quantity: newQuantity,
        lastUpdated: new Date().toISOString()
    };
    
    if (existingStockIndex !== -1) {
        stockData[existingStockIndex] = stockEntry;
    } else {
        stockData.push(stockEntry);
    }
    
    Storage.set('stockData', stockData);
    renderStockTable();
    closeStockModal();
    
    alert(`Stock updated successfully! Current stock: ${newQuantity.toFixed(2)} ${item.unit}`);
}

// Show stock modal
function showStockModal() {
    const modal = document.getElementById('stockModal');
    modal.classList.add('show');
}

// Close stock modal
function closeStockModal() {
    const modal = document.getElementById('stockModal');
    modal.classList.remove('show');
    document.getElementById('stockForm').reset();
}

// Setup event listeners
function setupEventListeners() {
    // Update stock button
    document.getElementById('updateStockBtn').addEventListener('click', addStock);
    
    // Form submit
    document.getElementById('stockForm').addEventListener('submit', saveStock);
    
    // Cancel button
    document.getElementById('cancelStockBtn').addEventListener('click', closeStockModal);
    
    // Close modal on X click
    document.querySelector('#stockModal .close').addEventListener('click', closeStockModal);
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('stockModal');
        if (e.target === modal) {
            closeStockModal();
        }
    });
    
    // Update stock when item is selected
    document.getElementById('stockItemName').addEventListener('change', (e) => {
        const itemId = parseInt(e.target.value);
        if (itemId) {
            const stock = stockData.find(s => s.itemId === itemId);
            document.getElementById('stockItemId').value = itemId;
            document.getElementById('stockQuantity').value = stock ? stock.quantity : 0;
        }
    });
}

