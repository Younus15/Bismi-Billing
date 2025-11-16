// Main Billing Application

let cart = [];
let items = [];
let filteredItems = [];
let stockData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    loadStockData();
    loadCart();
    setupEventListeners();
    setupSearch();
});

// Load items from localStorage
function loadItems() {
    items = Storage.get('items') || [];
    
    // If no items, initialize with defaults
    if (items.length === 0) {
        items = initializeDefaultItems();
    }
    
    renderItems();
}

// Load stock data from localStorage
function loadStockData() {
    stockData = Storage.get('stockData') || [];
}

// Render items grid
function renderItems(searchTerm = '') {
    const itemsGrid = document.getElementById('itemsGrid');
    
    if (items.length === 0) {
        itemsGrid.innerHTML = '<p>No items available. Please add items in Manage Items page.</p>';
        return;
    }
    
    // Create a map of stock data by item ID for quick lookup
    const stockMap = {};
    stockData.forEach(stock => {
        stockMap[stock.itemId] = stock;
    });
    
    // Filter items based on search term (show all items, not filtered by stock)
    if (searchTerm.trim() === '') {
        filteredItems = items;
    } else {
        const searchLower = searchTerm.toLowerCase();
        filteredItems = items.filter(item => 
            item.name.toLowerCase().includes(searchLower)
        );
    }
    
    if (filteredItems.length === 0) {
        itemsGrid.innerHTML = '<p>No items found matching your search.</p>';
        return;
    }
    
    // Get item image based on Tamil/English item name
    // Using actual product image URLs provided by user
    const getItemImage = (itemName) => {
        const name = itemName.toUpperCase();
        
        // Product-specific image URLs provided by user
        if (name.includes('PALM.OIL') || name.includes('PALM OIL')) {
            return 'https://content3.jdmagicbox.com/v2/comp/chennai/q2/044pxx44.xx44.100831150545.u1q2/catalogue/zion-oil-mill-madipakkam-chennai-coconut-oil-retailers-4xhsqk.jpg';
        } else if (name.includes('PATTAI-1')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTw050gxB1lIsVp04FwWxZocZV2YmsFLnhJcA&s';
        } else if (name.includes('PATTAI-2')) {
            return 'https://d1sl07a7h3d3fr.cloudfront.net/common/master/pattai_50gm.jpg';
        } else if (name.includes('ELLACHI')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyZQ5HvIpo0wSdIkU-EX3jZ00UCpjqbtVQrw&s';
        } else if (name.includes('KRAMBU')) {
            return 'https://shivaruthraexports.com/wp-content/uploads/2021/11/Cloves3.jpg';
        } else if (name.includes('AJINOMOTO')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQV91sds0r3mXqWhJeRUk3zLmCZYPn4cvW4xw&s';
        } else if (name.includes('VELLEM')) {
            // Jaggery (Vellam) image
            return 'https://nalamfoodscoimbatore.com/wp-content/uploads/2022/08/vellam.jpeg';
        } else if (name.includes('ROCK SALT')) {
            return 'https://cholaa.in/wp-content/uploads/2020/08/rocksaltcrystal-600x600.jpg';
        } else if (name.includes('CHILLI')) {
            return 'https://m.media-amazon.com/images/I/81eNgB1oJoL._AC_UF894,1000_QL80_.jpg';
        } else if (name.includes('CHICKEN')) {
            return 'https://m.media-amazon.com/images/I/616S788g46L._AC_UF894,1000_QL80_.jpg';
        } else if (name.includes('MUTTON')) {
            return 'https://m.media-amazon.com/images/I/71yjnNV9bUL._AC_UF350,350_QL80_.jpg';
        } else if (name.includes('PULLI')) {
            return 'https://fullofplants.com/wp-content/uploads/2023/05/what-is-tamarind-and-how-to-use-it-complete-guide-thumb-3.jpg';
        } else if (name.includes('WHITE.ELLU') || (name.includes('ELLU') && !name.includes('VELLEM'))) {
            return 'https://kingnqueenz.com/cdn/shop/products/whitesesameseedstillelluveluthathuonlinelongnqueenz_2048x.jpg?v=1666942225';
        } else if (name.includes('KADUGU')) {
            return 'https://daivikorganic.com/cdn/shop/products/3_1783c2bd-581b-4f02-a1ce-4f51a740cab1.png?v=1670417933';
        } else if (name.includes('JEERAM')) {
            return 'https://kuzhalisupermarket.com/wp-content/uploads/2023/05/unnamed-2.jpg';
        } else if (name.includes('VENTHAIYAM')) {
            return 'https://daivikorganic.com/cdn/shop/products/4_0afd354c-9d45-4104-aa3a-813dc7ed5c86_600x.png?v=1670416925';
        } else if (name.includes('MILAGU')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYsZEjJoNqFAni--Euykl9ZImxjUrvY-f0Ig&s';
        } else if (name.includes('MYSORE PARUPPU')) {
            return 'https://m.media-amazon.com/images/I/41181y59fVL._AC_UF350,350_QL80_.jpg';
        } else if (name.includes('SIRU PARUPPU')) {
            return 'https://viha.online/cdn/shop/products/siruparupu_1080x.jpg?v=1619966867';
        } else if (name.includes('THOORAM PARUPPU')) {
            return 'https://v-myharvest-dev.blr1.vultrobjects.com/2025/03/70fd24b4-f480-4637-aeb3-fe9fb29119cc.webp';
        } else if (name.includes('PARUPPU')) {
            return 'https://m.media-amazon.com/images/I/41181y59fVL._AC_UF350,350_QL80_.jpg'; // Default lentils
        } else if (name.includes('APPALAM')) {
            return 'https://aachifoods.com/cdn/shop/files/applam-appalam.webp?v=1756875842&width=1445';
        } else if (name.includes('KESARI')) {
            return 'https://5.imimg.com/data5/SELLER/Default/2020/9/CK/PC/JY/24447027/tiger-kesari-food-colour.jpg';
        } else if (name.includes('MEAL MAKER')) {
            return 'https://m.media-amazon.com/images/I/51-0ZfQo91L.jpg';
        } else if (name.includes('VINEGAR')) {
            return 'https://www.tastynibbles.in/cdn/shop/products/vinegar500ml2.jpg?v=1716581495';
        } else if (name.includes('VERKADALAI')) {
            return 'https://organicpositive.in/wp-content/uploads/2022/07/groundnut-peanut-organic-verkadalai-chennai-1_batcheditor_fotor.jpg';
        } else if (name.includes('TURMERIC') || name.includes('TURME')) {
            return 'https://m.media-amazon.com/images/I/71eYFtuTdTL.jpg';
        } else if (name.includes('GARAM MASALA') || name.includes('GARAM')) {
            return 'https://www.bbassets.com/media/uploads/p/l/40248540_1-sakthi-garam-masala.jpg';
        } else if (name.includes('SAMBAR') && name.includes('POWDER')) {
            return 'https://img.thecdn.in/271829/1672307948475_SKU-0576_0.jpeg?width=600&format=webp';
        } else if (name.includes('RASAM') && name.includes('POWDER')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNLXL1Rk693Kg829ThUNLwla-QmPntJesKtQ&s';
        } else if (name.includes('PEPPER') && name.includes('POWDER')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvdbt9AHIyv7JFAvpp_Aw6h7Xye46MujWpkQ&s';
        } else if (name.includes('MALLI') && name.includes('POWDER')) {
            return 'https://m.media-amazon.com/images/I/71uyrktjLhL.jpg';
        } else if (name.includes('GUNDU') && name.includes('MILAGAI')) {
            return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuj2gr5Qr3vMT3ZDxOgAhqThTH9SK0fv2ZqQ&s';
        }
        
        // Default fallback
        return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=300&fit=crop';
    };
    
    itemsGrid.innerHTML = filteredItems.map(item => {
        // Check if item has custom imageUrl first, otherwise use getItemImage function
        const imageUrl = item.imageUrl || getItemImage(item.name);
        const stock = stockMap[item.id];
        const currentStock = stock ? stock.quantity : 0;
        const stockColor = currentStock <= 0 ? '#e74c3c' : (currentStock <= 10 ? '#f39c12' : '#27ae60');
        
        // Check if item is in cart
        const cartItem = cart.find(c => c.id === item.id);
        const cartQuantity = cartItem ? cartItem.quantity : 0;
        const showControls = cartQuantity > 0.01;
        
        return `
        <div class="item-card" data-id="${item.id}" style="cursor: pointer;" onclick="if(!event.target.closest('.item-quantity-controls') && !event.target.closest('button') && !event.target.closest('input')) { addToCart(${item.id}); }">
            <img src="${imageUrl}" alt="${item.name}" class="item-image" loading="lazy" style="cursor: pointer;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150/27ae60/ffffff?text=' + encodeURIComponent('${item.name.substring(0,10)}')">
            <h3>${item.name}</h3>
            <div class="rate">${formatCurrency(item.storeRate)}</div>
            <div class="unit">per ${item.unit}</div>
            <div class="stock-info" style="font-size: 0.85em; color: ${stockColor}; margin-top: 5px; font-weight: 500;">
                Stock: ${currentStock.toFixed(2)} ${item.unit}
            </div>
            ${showControls ? `
            <div class="item-quantity-controls" style="margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <button class="qty-btn-minus" onclick="event.stopPropagation(); updateItemQuantityInCard(${item.id}, -0.25)" style="width: 28px; height: 28px; border: 1px solid #27ae60; background: white; color: #27ae60; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#27ae60'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#27ae60'">-</button>
                <input type="number" 
                       class="item-qty-input" 
                       id="itemQty_${item.id}"
                       value="${cartQuantity.toFixed(2).replace(/\.?0+$/, '')}" 
                       min="0.01" 
                       step="0.01" 
                       style="width: 70px; text-align: center; border: 1px solid #27ae60; border-radius: 4px; padding: 4px; font-size: 14px;"
                       onchange="updateCartQuantityFromCard(${item.id})"
                       onclick="event.stopPropagation();"
                       onfocus="event.stopPropagation();">
                <button class="qty-btn-plus" onclick="event.stopPropagation(); updateItemQuantityInCard(${item.id}, 0.25)" style="width: 28px; height: 28px; border: 1px solid #27ae60; background: white; color: #27ae60; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#27ae60'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#27ae60'">+</button>
            </div>
            ` : ''}
        </div>
    `;
    }).join('');
}

// Update item quantity in the item card (for items already in cart)
window.updateItemQuantityInCard = function(itemId, change) {
    const cartItem = cart.find(c => c.id === itemId);
    if (!cartItem) return;
    
    const newQuantity = Math.max(0.01, cartItem.quantity + change);
    
    if (newQuantity <= 0.01) {
        // Remove from cart if quantity becomes too small
        removeFromCart(itemId);
        return;
    }
    
    cartItem.quantity = newQuantity;
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to show/hide controls
}

// Update cart quantity from input field in item card
window.updateCartQuantityFromCard = function(itemId) {
    const input = document.getElementById(`itemQty_${itemId}`);
    if (!input) return;
    
    const cartItem = cart.find(c => c.id === itemId);
    if (!cartItem) return;
    
    let value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0.01) {
        // Remove from cart if invalid or too small
        removeFromCart(itemId);
        return;
    }
    
    cartItem.quantity = value;
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update display
}

// Add item to cart (global function for onclick handlers)
window.addToCart = function(itemId, quantity = 1) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(c => c.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            unit: item.unit,
            storeRate: item.storeRate,
            purchaseRate: item.purchaseRate,
            quantity: quantity
        });
    }
    
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display and show controls
}

// Remove item from cart (global function)
window.removeFromCart = function(itemId) {
    cart = cart.filter(c => c.id !== itemId);
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
}

// Update quantity by increment/decrement
window.updateQuantity = function(itemId, change) {
    const item = cart.find(c => c.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    item.quantity = newQuantity;
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
}

// Update quantity manually (from input field)
window.updateQuantityManual = function(itemId, value) {
    const item = cart.find(c => c.id === itemId);
    if (!item) return;
    
    const newQuantity = parseFloat(value);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        // Reset to current value if invalid
        const input = document.querySelector(`.quantity-input[data-item-id="${itemId}"]`);
        if (input) input.value = item.quantity;
        return;
    }
    
    if (newQuantity === 0) {
        removeFromCart(itemId);
        return;
    }
    
    item.quantity = newQuantity;
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
}

// Set quantity to specific value (for fraction buttons)
window.setQuantity = function(itemId, quantity) {
    const item = cart.find(c => c.id === itemId);
    if (!item) return;
    
    item.quantity = quantity;
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
}

// Render cart
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Cart is empty. Click items to add them.</p>';
        return;
    }
    
    cartItems.innerHTML = cart.map((item, index) => {
        const amount = item.storeRate * item.quantity;
        const cost = item.purchaseRate * item.quantity;
        const profit = amount - cost;
        const serialNo = index + 1;
        
        // Format quantity display (show fractions for common values)
        const formatQuantity = (qty) => {
            if (qty === 0.5) return '1/2';
            if (qty === 0.25) return '1/4';
            if (qty === 0.75) return '3/4';
            if (qty % 1 === 0) return qty.toString();
            return qty.toFixed(3).replace(/\.?0+$/, '');
        };
        
        return `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-info">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; color: #27ae60; min-width: 25px;">${serialNo}.</span>
                        <h4 style="margin: 0; flex: 1;">${item.name}</h4>
                    </div>
                    <div class="item-details" style="margin-left: 35px;">
                        ${formatCurrency(item.storeRate)} × ${formatQuantity(item.quantity)} ${item.unit}
                        <br>
                        <small>Amount: ${formatCurrency(amount)}</small>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-main-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <input type="number" 
                               class="quantity-input" 
                               value="${item.quantity}" 
                               step="0.25" 
                               min="0" 
                               data-item-id="${item.id}"
                               onchange="updateQuantityManual(${item.id}, this.value)"
                               onblur="updateQuantityManual(${item.id}, this.value)">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="fraction-buttons">
                        <button class="fraction-btn" onclick="setQuantity(${item.id}, 0.25)" title="1/4 ${item.unit}">1/4</button>
                        <button class="fraction-btn" onclick="setQuantity(${item.id}, 0.5)" title="1/2 ${item.unit}">1/2</button>
                        <button class="fraction-btn" onclick="setQuantity(${item.id}, 0.75)" title="3/4 ${item.unit}">3/4</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

// Update summary
function updateSummary() {
    let totalAmount = 0;
    let totalCost = 0;
    
    cart.forEach(item => {
        totalAmount += item.storeRate * item.quantity;
        totalCost += item.purchaseRate * item.quantity;
    });
    
    const totalProfit = totalAmount - totalCost;
    
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
    document.getElementById('totalCost').textContent = formatCurrency(totalCost);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('paymentAmount').textContent = formatCurrency(totalAmount);
}

// Clear cart
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        saveCart();
        renderCart();
        updateSummary();
    }
}

// Save cart to localStorage
function saveCart() {
    Storage.set('cart', cart);
}

// Load cart from localStorage
function loadCart() {
    cart = Storage.get('cart') || [];
    renderCart();
    updateSummary();
}

// Generate and save bill
function generateBill() {
    if (cart.length === 0) {
        alert('Cart is empty. Add items to generate a bill.');
        return;
    }
    
    // Reload stock data to ensure we have the latest
    loadStockData();
    
    const { sequence, billNumber } = getNextBillIdentifiers();
    let totalAmount = 0;
    let totalCost = 0;
    
    const billItems = cart.map(item => {
        const amount = item.storeRate * item.quantity;
        const cost = item.purchaseRate * item.quantity;
        const profit = amount - cost;
        
        totalAmount += amount;
        totalCost += cost;
        
        return {
            id: item.id,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            storeRate: item.storeRate,
            purchaseRate: item.purchaseRate,
            amount: amount,
            cost: cost,
            profit: profit
        };
    });
    
    const billData = {
        sequence,
        billNumber,
        date: formatDate(new Date()),
        items: billItems,
        totalAmount: totalAmount,
        totalCost: totalCost,
        profit: totalAmount - totalCost,
        timestamp: new Date().toISOString()
    };
    
    // Subtract quantities from stock
    for (const cartItem of cart) {
        const stockIndex = stockData.findIndex(s => s.itemId === cartItem.id);
        
        if (stockIndex !== -1) {
            const newQuantity = Math.max(0, stockData[stockIndex].quantity - cartItem.quantity);
            stockData[stockIndex].quantity = newQuantity;
            stockData[stockIndex].lastUpdated = new Date().toISOString();
        } else {
            // If stock entry doesn't exist, create one with negative balance (shouldn't happen, but handle it)
            const item = items.find(i => i.id === cartItem.id);
            if (item) {
                stockData.push({
                    itemId: cartItem.id,
                    itemName: cartItem.name,
                    quantity: 0,
                    lastUpdated: new Date().toISOString()
                });
            }
        }
    }
    
    // Save updated stock data
    Storage.set('stockData', stockData);
    
    // Save bill to localStorage
    const bills = Storage.get('bills') || [];
    bills.push(billData);
    Storage.set('bills', bills);
    
    return billData;
}

// Download Customer PDF (only Grand Total)
function downloadCustomerPDF() {
    if (cart.length === 0) {
        alert('Cart is empty. Add items to generate a bill.');
        return;
    }
    
    const billData = generateBill();
    if (!billData) return; // Stock check failed
    
    generateCustomerPDF(billData);
    
    // Clear cart after generating bill
    cart = [];
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
    
    alert('Customer bill generated and downloaded successfully!');
}

// Download Internal PDF (with all details including profit)
function downloadInternalPDF() {
    if (cart.length === 0) {
        alert('Cart is empty. Add items to generate a bill.');
        return;
    }
    
    const billData = generateBill();
    if (!billData) return; // Stock check failed
    
    generateInternalPDF(billData);
    
    // Clear cart after generating bill
    cart = [];
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
    
    alert('Internal bill generated and downloaded successfully!');
}

// Print bill
function printBill() {
    if (cart.length === 0) {
        alert('Cart is empty. Add items to generate a bill.');
        return;
    }
    
    const billData = generateBill();
    if (!billData) return; // Stock check failed
    
    // Create print window (Customer version - Grand Total only)
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill - ${billData.billNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { color: #27ae60; }
                .header p { margin: 5px 0; }
                .bill-info { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #27ae60; color: white; padding: 10px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .totals { text-align: right; margin-top: 20px; }
                .grand-total { font-size: 1.2em; font-weight: bold; color: #27ae60; }
                .contact-info { margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>BISMI DEPARTMENT STORE</h1>
                <p>Puzhuthivakkam, Chennai</p>
            </div>
            <div class="bill-info">
                <p><strong>Bill Number:</strong> ${billData.billNumber}</p>
                <p><strong>Date:</strong> ${billData.date}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${billData.items.map((item, index) => {
                        const formatQty = (qty) => {
                            if (qty === 0.5) return '1/2';
                            if (qty === 0.25) return '1/4';
                            if (qty === 0.75) return '3/4';
                            if (qty % 1 === 0) return qty.toString();
                            return qty.toFixed(3).replace(/\.?0+$/, '');
                        };
                        return `
                        <tr>
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${item.name}</td>
                            <td>${formatQty(item.quantity)} ${item.unit}</td>
                            <td>${formatCurrency(item.storeRate)}</td>
                            <td>${formatCurrency(item.amount)}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
            <div class="totals">
                <p class="grand-total"><strong>Grand Total:</strong> ${formatCurrency(billData.totalAmount)}</p>
            </div>
            <div class="contact-info">
                <p><strong>Contact:</strong></p>
                <p>Mohamed Younus: 9600008264</p>
                <p>Rhiswan: 9962156036</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <p>Thank you for your business!</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    // Clear cart after printing
    cart = [];
    saveCart();
    renderCart();
    updateSummary();
    renderItems(); // Refresh to update stock display
}

// Show QR code modal
function showQRModal() {
    if (cart.length === 0) {
        alert('Cart is empty. Add items first.');
        return;
    }
    
    const modal = document.getElementById('qrModal');
    modal.classList.add('show');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('qrModal');
    modal.classList.remove('show');
}

// Setup event listeners
function setupEventListeners() {
    // Clear cart button
    document.getElementById('clearCart').addEventListener('click', clearCart);
    
    // Pay now button
    document.getElementById('payNow').addEventListener('click', showQRModal);
    
    // Print bill button
    document.getElementById('printBill').addEventListener('click', printBill);
    
    // Download Customer PDF button
    document.getElementById('downloadCustomerPDF').addEventListener('click', downloadCustomerPDF);
    
    // Download Internal PDF button
    document.getElementById('downloadInternalPDF').addEventListener('click', downloadInternalPDF);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('qrModal');
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Refresh stock data when page becomes visible (e.g., when returning from balance page)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadStockData();
            renderItems();
        }
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (!searchInput || !searchBtn || !clearSearchBtn) return;
    
    // Search function
    const performSearch = () => {
        const searchTerm = searchInput.value.trim();
        renderItems(searchTerm);
        
        // Show/hide clear button
        if (searchTerm.length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
    };
    
    // Search on button click
    searchBtn.addEventListener('click', performSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Real-time search as user types (with debounce)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        renderItems('');
    });
}

