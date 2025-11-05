// Item Management Application

let items = [];
let editingItemId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    setupEventListeners();
});

// Load items from localStorage
function loadItems() {
    items = Storage.get('items') || [];
    renderItemsTable();
}

// Render items table
function renderItemsTable() {
    const tbody = document.getElementById('itemsTableBody');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No items found. Click "Initialize Default Items" to add items.</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => {
        const profitMargin = item.storeRate - item.purchaseRate;
        return `
            <tr data-id="${item.id}">
                <td>${item.name}</td>
                <td>${item.unit}</td>
                <td class="editable-rate" data-field="storeRate" data-item-id="${item.id}">
                    <span class="rate-display">${formatCurrency(item.storeRate)}</span>
                    <input type="number" class="rate-input" value="${item.storeRate}" step="0.01" min="0" style="display: none;">
                </td>
                <td class="editable-rate" data-field="purchaseRate" data-item-id="${item.id}">
                    <span class="rate-display">${formatCurrency(item.purchaseRate)}</span>
                    <input type="number" class="rate-input" value="${item.purchaseRate}" step="0.01" min="0" style="display: none;">
                </td>
                <td class="profit-margin" data-item-id="${item.id}">${formatCurrency(profitMargin)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editItem(${item.id})">Edit Full</button>
                        <button class="btn-delete" onclick="deleteItem(${item.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for inline editing
    setupInlineEditing();
}

// Setup inline editing for rates
function setupInlineEditing() {
    const editableCells = document.querySelectorAll('.editable-rate');
    
    editableCells.forEach(cell => {
        const display = cell.querySelector('.rate-display');
        const input = cell.querySelector('.rate-input');
        
        // Double click to edit
        display.addEventListener('dblclick', () => {
            display.style.display = 'none';
            input.style.display = 'block';
            input.focus();
            input.select();
        });
        
        // Save on blur (when user clicks away)
        input.addEventListener('blur', () => {
            saveInlineRate(cell);
        });
        
        // Save on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveInlineRate(cell);
            }
        });
    });
}

// Save inline rate edit
function saveInlineRate(cell) {
    const display = cell.querySelector('.rate-display');
    const input = cell.querySelector('.rate-input');
    const field = cell.dataset.field;
    const itemId = parseInt(cell.dataset.itemId);
    const newValue = parseFloat(input.value);
    
    if (isNaN(newValue) || newValue < 0) {
        alert('Please enter a valid positive number.');
        input.value = items.find(i => i.id === itemId)[field];
        display.style.display = 'block';
        input.style.display = 'none';
        return;
    }
    
    // Update item
    const item = items.find(i => i.id === itemId);
    if (item) {
        item[field] = newValue;
        item.profitMargin = item.storeRate - item.purchaseRate;
        
        // Save to localStorage
        Storage.set('items', items);
        
        // Update display
        display.textContent = formatCurrency(newValue);
        display.style.display = 'block';
        input.style.display = 'none';
        
        // Update profit margin in the same row
        const row = cell.closest('tr');
        const profitCell = row.querySelector('.profit-margin');
        if (profitCell) {
            profitCell.textContent = formatCurrency(item.profitMargin);
        }
        
        // Visual feedback
        cell.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            cell.style.backgroundColor = '';
        }, 1000);
    }
}

// Add new item
function addItem() {
    editingItemId = null;
    document.getElementById('modalTitle').textContent = 'Add Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    updateProfitDisplay();
    showItemModal();
}

// Edit item (global function)
window.editItem = function(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    editingItemId = itemId;
    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemUnit').value = item.unit;
    document.getElementById('storeRate').value = item.storeRate;
    document.getElementById('purchaseRate').value = item.purchaseRate;
    updateProfitDisplay();
    showItemModal();
}

// Delete item (global function)
window.deleteItem = function(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
        items = items.filter(i => i.id !== itemId);
        Storage.set('items', items);
        renderItemsTable();
    }
}

// Save item (add or update)
function saveItem(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const storeRate = parseFloat(document.getElementById('storeRate').value);
    const purchaseRate = parseFloat(document.getElementById('purchaseRate').value);
    
    if (!name || storeRate < 0 || purchaseRate < 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    if (itemId) {
        // Update existing item
        const index = items.findIndex(i => i.id === parseInt(itemId));
        if (index !== -1) {
            items[index] = {
                id: parseInt(itemId),
                name,
                unit,
                storeRate,
                purchaseRate,
                profitMargin: storeRate - purchaseRate
            };
        }
    } else {
        // Add new item
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        items.push({
            id: newId,
            name,
            unit,
            storeRate,
            purchaseRate,
            profitMargin: storeRate - purchaseRate
        });
    }
    
    Storage.set('items', items);
    renderItemsTable();
    closeItemModal();
}

// Initialize default items
function initializeDefaultItemsHandler() {
    if (items.length > 0) {
        if (!confirm('This will replace all existing items with default items. Continue?')) {
            return;
        }
    }
    
    items = initializeDefaultItems();
    Storage.set('items', items);
    renderItemsTable();
    alert('Default items initialized successfully!');
}

// Update profit margin display
function updateProfitDisplay() {
    const storeRate = parseFloat(document.getElementById('storeRate').value) || 0;
    const purchaseRate = parseFloat(document.getElementById('purchaseRate').value) || 0;
    const profit = storeRate - purchaseRate;
    document.getElementById('profitMarginDisplay').textContent = formatCurrency(profit);
}

// Show item modal
function showItemModal() {
    const modal = document.getElementById('itemModal');
    modal.classList.add('show');
}

// Close item modal
function closeItemModal() {
    const modal = document.getElementById('itemModal');
    modal.classList.remove('show');
    editingItemId = null;
    document.getElementById('itemForm').reset();
}

// Setup event listeners
function setupEventListeners() {
    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', addItem);
    
    // Initialize items button
    document.getElementById('initializeItemsBtn').addEventListener('click', initializeDefaultItemsHandler);
    
    // Form submit
    document.getElementById('itemForm').addEventListener('submit', saveItem);
    
    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', closeItemModal);
    
    // Close modal on X click
    document.querySelector('#itemModal .close').addEventListener('click', closeItemModal);
    
    // Update profit display on rate change
    document.getElementById('storeRate').addEventListener('input', updateProfitDisplay);
    document.getElementById('purchaseRate').addEventListener('input', updateProfitDisplay);
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('itemModal');
        if (e.target === modal) {
            closeItemModal();
        }
    });
}

