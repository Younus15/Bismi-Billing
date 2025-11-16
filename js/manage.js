// Item Management Application

let items = [];
let editingItemId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    setupEventListeners();
    
    // Listen for storage sync events
    window.addEventListener('storageSync', () => {
        loadItems();
        renderItemsTable();
    });
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'lastSync') {
            loadItems();
            renderItemsTable();
        }
    });
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
    document.getElementById('itemImageUrl').value = '';
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
    document.getElementById('itemImageUrl').value = item.imageUrl || '';
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
    const imageUrl = document.getElementById('itemImageUrl').value.trim();
    
    if (!name || storeRate < 0 || purchaseRate < 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    const itemData = {
        name,
        unit,
        storeRate,
        purchaseRate,
        profitMargin: storeRate - purchaseRate
    };
    
    // Add imageUrl only if provided
    if (imageUrl) {
        itemData.imageUrl = imageUrl;
    }
    
    if (itemId) {
        // Update existing item
        const index = items.findIndex(i => i.id === parseInt(itemId));
        if (index !== -1) {
            items[index] = {
                id: parseInt(itemId),
                ...itemData
            };
            // Remove imageUrl if it was cleared
            if (!imageUrl && items[index].imageUrl) {
                delete items[index].imageUrl;
            }
        }
    } else {
        // Add new item
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        items.push({
            id: newId,
            ...itemData
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

// Variables for bill upload
let extractedRates = {};
let ocrText = '';

// Setup event listeners
function setupEventListeners() {
    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', addItem);
    
    // Initialize items button
    document.getElementById('initializeItemsBtn').addEventListener('click', initializeDefaultItemsHandler);
    
    // Upload bill button
    document.getElementById('uploadBillBtn').addEventListener('click', showUploadBillModal);
    
    // Bill image input change
    document.getElementById('billImageInput').addEventListener('change', handleBillImageSelect);
    
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
        const uploadModal = document.getElementById('uploadBillModal');
        if (e.target === uploadModal) {
            closeUploadBillModal();
        }
    });
}

// Show upload bill modal
function showUploadBillModal() {
    const modal = document.getElementById('uploadBillModal');
    modal.classList.add('show');
    resetUploadBillModal();
}

// Close upload bill modal (global function)
window.closeUploadBillModal = function() {
    const modal = document.getElementById('uploadBillModal');
    modal.classList.remove('show');
    resetUploadBillModal();
}

// Reset upload bill modal
function resetUploadBillModal() {
    document.getElementById('billImageInput').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('ocrResults').style.display = 'none';
    document.getElementById('processBillBtn').disabled = true;
    document.getElementById('updateRatesBtn').style.display = 'none';
    extractedRates = {};
    ocrText = '';
}

// Handle bill image selection
function handleBillImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const processBtn = document.getElementById('processBillBtn');
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            processBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file.');
        event.target.value = '';
    }
}

// Process bill image with OCR
window.processBillImage = async function() {
    const fileInput = document.getElementById('billImageInput');
    const file = fileInput.files[0];
    if (!file) return;
    
    const progressDiv = document.getElementById('ocrProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const resultsDiv = document.getElementById('ocrResults');
    const extractedTextArea = document.getElementById('extractedText');
    const processBtn = document.getElementById('processBillBtn');
    
    progressDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    processBtn.disabled = true;
    
    try {
        progressText.textContent = 'Loading OCR engine...';
        progressBar.style.width = '10%';
        
        // Initialize Tesseract
        const { createWorker } = Tesseract;
        const worker = await createWorker('eng');
        
        progressText.textContent = 'Recognizing text from image...';
        progressBar.style.width = '30%';
        
        // Perform OCR with progress updates
        const { data: { text } } = await worker.recognize(file, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const progress = Math.min(95, 30 + (m.progress * 0.65));
                    progressBar.style.width = progress + '%';
                    progressText.textContent = `Recognizing... ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        
        // Terminate worker
        await worker.terminate();
        
        progressBar.style.width = '70%';
        progressText.textContent = 'Parsing rates...';
        
        ocrText = text;
        extractedTextArea.value = text;
        
        // Parse rates from text
        extractedRates = parseRatesFromText(text);
        
        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';
        
        // Display matched items
        displayMatchedItems();
        
        resultsDiv.style.display = 'block';
        document.getElementById('updateRatesBtn').style.display = 'inline-block';
        
    } catch (error) {
        console.error('OCR Error:', error);
        alert('Error processing image: ' + error.message);
        progressDiv.style.display = 'none';
        processBtn.disabled = false;
    }
}

// Parse rates from OCR text
function parseRatesFromText(text) {
    const extractedRates = {};
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Load current items for matching
    const currentItems = Storage.get('items') || [];
    
    // Common patterns to look for:
    // 1. Item name followed by rate (e.g., "PALM OIL 1200" or "PALM.OIL 1200")
    // 2. Item name and rate in same line
    // 3. Rate numbers (typically 3-4 digits)
    
    lines.forEach((line, lineIndex) => {
        const upperLine = line.toUpperCase();
        
        // Try to match each item
        currentItems.forEach(item => {
            const itemName = item.name.toUpperCase();
            const itemNameVariations = [
                itemName,
                itemName.replace(/\./g, ' '),
                itemName.replace(/\s+/g, ''),
                itemName.replace(/[^A-Z0-9]/g, '')
            ];
            
            // Check if line contains item name
            const containsItemName = itemNameVariations.some(variation => {
                // Check for partial matches (at least 4 characters)
                if (variation.length >= 4) {
                    return upperLine.includes(variation.substring(0, Math.min(8, variation.length)));
                }
                return false;
            });
            
            if (containsItemName) {
                // Extract rate from line (look for numbers)
                const rateMatches = line.match(/\d+\.?\d*/g);
                if (rateMatches && rateMatches.length > 0) {
                    // Take the largest number (likely the rate)
                    const foundRates = rateMatches.map(m => parseFloat(m)).filter(n => n > 0 && n < 100000);
                    if (foundRates.length > 0) {
                        const rate = Math.max(...foundRates);
                        // Only update if we haven't found a rate for this item or if this rate seems more reasonable
                        if (!extractedRates[item.name] || (rate > 10 && rate < 10000)) {
                            extractedRates[item.name] = rate;
                        }
                    }
                }
            }
        });
        
        // Also try to find standalone rates that might be purchase rates
        // Look for patterns like "RATE: 1200" or "PRICE: 1200" or just numbers
        const ratePattern = /(?:RATE|PRICE|COST|AMOUNT|₹|RS\.?)\s*:?\s*(\d+\.?\d*)/gi;
        const rateMatch = line.match(ratePattern);
        if (rateMatch) {
            rateMatch.forEach(match => {
                const numMatch = match.match(/\d+\.?\d*/);
                if (numMatch) {
                    const rate = parseFloat(numMatch[0]);
                    // Try to associate with nearby item names
                    const nearbyItem = currentItems.find(item => {
                        const itemName = item.name.toUpperCase();
                        // Check 2 lines before and after
                        for (let i = Math.max(0, lineIndex - 2); i <= Math.min(lines.length - 1, lineIndex + 2); i++) {
                            if (lines[i].toUpperCase().includes(itemName.substring(0, Math.min(6, itemName.length)))) {
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    if (nearbyItem && (!extractedRates[nearbyItem.name] || rate > 10)) {
                        extractedRates[nearbyItem.name] = rate;
                    }
                }
            });
        }
    });
    
    return extractedRates;
}

// Display matched items
function displayMatchedItems() {
    const matchedDiv = document.getElementById('matchedItems');
    const currentItems = Storage.get('items') || [];
    
    if (Object.keys(extractedRates).length === 0) {
        matchedDiv.innerHTML = '<p style="color: #e74c3c;">No rates found. Please ensure the bill image is clear and contains item names and rates.</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="background: #f0f0f0;"><th style="padding: 8px; text-align: left;">Item Name</th><th style="padding: 8px; text-align: left;">Current Purchase Rate</th><th style="padding: 8px; text-align: left;">Extracted Rate</th></tr>';
    
    let matchCount = 0;
    currentItems.forEach(item => {
        if (extractedRates[item.name]) {
            matchCount++;
            const newRate = extractedRates[item.name];
            const currentRate = item.purchaseRate;
            const isDifferent = Math.abs(newRate - currentRate) > 0.01;
            
            html += `<tr style="border-bottom: 1px solid #ddd; ${isDifferent ? 'background: #fff3cd;' : ''}">`;
            html += `<td style="padding: 8px;">${item.name}</td>`;
            html += `<td style="padding: 8px;">${formatCurrency(currentRate)}</td>`;
            html += `<td style="padding: 8px; font-weight: bold; color: ${isDifferent ? '#27ae60' : '#666'};">${formatCurrency(newRate)}</td>`;
            html += `</tr>`;
        }
    });
    
    html += '</table>';
    
    if (matchCount === 0) {
        html = '<p style="color: #e74c3c;">No matching items found. The extracted text may not match your item names.</p>';
        html += '<p style="color: #666; font-size: 0.9em; margin-top: 10px;">Please review the extracted text above and manually update rates if needed.</p>';
    } else {
        html += `<p style="margin-top: 15px; color: #27ae60; font-weight: bold;">Found ${matchCount} matching item(s). Click "Update Purchase Rates" to apply changes.</p>`;
    }
    
    matchedDiv.innerHTML = html;
}

// Update purchase rates (global function)
window.updatePurchaseRates = function() {
    if (Object.keys(extractedRates).length === 0) {
        alert('No rates to update.');
        return;
    }
    
    const currentItems = Storage.get('items') || [];
    let updateCount = 0;
    
    currentItems.forEach(item => {
        if (extractedRates[item.name]) {
            const newRate = extractedRates[item.name];
            if (newRate > 0 && newRate !== item.purchaseRate) {
                item.purchaseRate = newRate;
                item.profitMargin = item.storeRate - item.purchaseRate;
                updateCount++;
            }
        }
    });
    
    if (updateCount > 0) {
        Storage.set('items', currentItems);
        renderItemsTable();
        alert(`Successfully updated purchase rates for ${updateCount} item(s)!`);
        closeUploadBillModal();
    } else {
        alert('No rates were updated. All rates may already be up to date.');
    }
}

