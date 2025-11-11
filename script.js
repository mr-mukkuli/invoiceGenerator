const { jsPDF } = window.jspdf;

let invoiceData = {
    subtotal: 0,
    tax: 0,
    total: 0
};

let uploadedLogo = null;

const currencySymbols = {
    'ZMW': 'K',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'ZAR': 'R'
};

const templateColors = {
    modern: { primary: [37, 99, 235], secondary: [22, 163, 74] },
    classic: { primary: [22, 163, 74], secondary: [37, 99, 235] },
    elegant: { primary: [147, 51, 234], secondary: [236, 72, 153] }
};

function initializeInvoiceNumber() {
    const lastInvoiceNum = localStorage.getItem('lastInvoiceNumber') || 0;
    const newInvoiceNum = parseInt(lastInvoiceNum) + 1;
    const invoiceField = document.getElementById('invoiceNumber');
    const invoiceNumStr = `INV-${String(newInvoiceNum).padStart(4, '0')}`;
    invoiceField.value = invoiceNumStr;
    invoiceField.defaultValue = invoiceNumStr;
}

function setDefaultDates() {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    document.getElementById('invoiceDate').valueAsDate = today;
    document.getElementById('dueDate').valueAsDate = dueDate;
}

function getCurrencySymbol() {
    const currency = document.getElementById('currency').value;
    return currencySymbols[currency] || 'K';
}

function formatCurrency(amount) {
    const symbol = getCurrencySymbol();
    return `${symbol} ${amount.toFixed(2)}`;
}

function initializeDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
}

function saveBusinessPreset() {
    const preset = {
        name: document.getElementById('businessName').value,
        email: document.getElementById('businessEmail').value,
        address: document.getElementById('businessAddress').value
    };
    localStorage.setItem('businessPreset', JSON.stringify(preset));
    alert('Business details saved!');
}

function loadBusinessPreset() {
    const preset = localStorage.getItem('businessPreset');
    if (preset) {
        const data = JSON.parse(preset);
        document.getElementById('businessName').value = data.name;
        document.getElementById('businessEmail').value = data.email;
        document.getElementById('businessAddress').value = data.address;
    } else {
        alert('No saved business details found.');
    }
}

function saveClientPreset() {
    const preset = {
        name: document.getElementById('clientName').value,
        email: document.getElementById('clientEmail').value,
        address: document.getElementById('clientAddress').value
    };
    
    const presets = JSON.parse(localStorage.getItem('clientPresets') || '[]');
    const clientName = preset.name;
    
    const existingIndex = presets.findIndex(p => p.name === clientName);
    if (existingIndex >= 0) {
        presets[existingIndex] = preset;
    } else {
        presets.push(preset);
    }
    
    localStorage.setItem('clientPresets', JSON.stringify(presets));
    alert(`Client details for "${clientName}" saved!`);
}

function loadClientPreset() {
    const presets = JSON.parse(localStorage.getItem('clientPresets') || '[]');
    if (presets.length === 0) {
        alert('No saved client details found.');
        return;
    }
    
    const names = presets.map((p, i) => `${i + 1}. ${p.name}`).join('\\n');
    const choice = prompt(`Select a client:\\n${names}\\n\\nEnter number:`);
    
    if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < presets.length) {
            const data = presets[index];
            document.getElementById('clientName').value = data.name;
            document.getElementById('clientEmail').value = data.email;
            document.getElementById('clientAddress').value = data.address;
        }
    }
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedLogo = e.target.result;
            localStorage.setItem('uploadedLogo', uploadedLogo);
        };
        reader.readAsDataURL(file);
    }
}

function loadSavedLogo() {
    const saved = localStorage.getItem('uploadedLogo');
    if (saved) {
        uploadedLogo = saved;
    }
}

function addLineItem() {
    const container = document.getElementById('lineItemsContainer');
    
    const lineItem = document.createElement('div');
    lineItem.className = 'line-item';
    lineItem.innerHTML = `
        <input type="text" class="item-description" placeholder="Description" required>
        <input type="number" class="item-quantity" min="1" value="1" placeholder="Qty" required>
        <input type="number" class="item-rate" min="0" step="0.01" placeholder="Rate" required>
        <input type="text" class="item-amount" readonly value="0.00" placeholder="Amount">
        <button type="button" class="btn-remove">×</button>
    `;
    
    container.appendChild(lineItem);
    updateRemoveButtons();
    attachLineItemListeners(lineItem);
}

function removeLineItem(lineItem) {
    lineItem.remove();
    updateRemoveButtons();
    calculateTotals();
}

function updateRemoveButtons() {
    const items = document.querySelectorAll('.line-item');
    const removeButtons = document.querySelectorAll('.btn-remove');
    
    removeButtons.forEach((btn, index) => {
        btn.disabled = items.length === 1;
    });
}

function attachLineItemListeners(lineItem) {
    const quantity = lineItem.querySelector('.item-quantity');
    const rate = lineItem.querySelector('.item-rate');
    const removeBtn = lineItem.querySelector('.btn-remove');
    
    quantity.addEventListener('input', () => {
        updateLineItemAmount(lineItem);
        calculateTotals();
    });
    
    rate.addEventListener('input', () => {
        updateLineItemAmount(lineItem);
        calculateTotals();
    });
    
    removeBtn.addEventListener('click', () => removeLineItem(lineItem));
}

function updateLineItemAmount(lineItem) {
    const quantity = parseFloat(lineItem.querySelector('.item-quantity').value) || 0;
    const rate = parseFloat(lineItem.querySelector('.item-rate').value) || 0;
    const amount = quantity * rate;
    
    lineItem.querySelector('.item-amount').value = amount.toFixed(2);
}

function calculateTotals() {
    const lineItems = document.querySelectorAll('.line-item');
    let subtotal = 0;
    
    lineItems.forEach(item => {
        const amount = parseFloat(item.querySelector('.item-amount').value) || 0;
        subtotal += amount;
    });
    
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    invoiceData.subtotal = subtotal;
    invoiceData.tax = tax;
    invoiceData.total = total;
    
    document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);
    document.getElementById('taxDisplay').textContent = formatCurrency(tax);
    document.getElementById('taxRateDisplay').textContent = taxRate.toFixed(2);
    document.getElementById('totalDisplay').textContent = formatCurrency(total);
}

function getLineItemsData() {
    const lineItems = document.querySelectorAll('.line-item');
    const items = [];
    
    lineItems.forEach(item => {
        items.push({
            description: item.querySelector('.item-description').value,
            quantity: parseFloat(item.querySelector('.item-quantity').value) || 0,
            rate: parseFloat(item.querySelector('.item-rate').value) || 0,
            amount: parseFloat(item.querySelector('.item-amount').value) || 0
        });
    });
    
    return items;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showPreview() {
    const form = document.getElementById('invoiceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const previewContent = generatePreviewHTML(false);
    document.getElementById('previewContent').innerHTML = previewContent;
    document.getElementById('previewModal').classList.add('active');
}

function generatePreviewHTML(isPaid) {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = formatDate(document.getElementById('invoiceDate').value);
    const dueDate = formatDate(document.getElementById('dueDate').value);
    const businessName = document.getElementById('businessName').value;
    const businessEmail = document.getElementById('businessEmail').value;
    const businessAddress = document.getElementById('businessAddress').value.replace(/\\n/g, '<br>');
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientAddress = document.getElementById('clientAddress').value.replace(/\\n/g, '<br>');
    const notes = document.getElementById('notes').value.replace(/\\n/g, '<br>');
    const lineItems = getLineItemsData();
    const template = document.getElementById('template').value;
    const colors = templateColors[template];
    
    const primaryColor = `rgb(${colors.primary.join(',')})`;
    
    let itemsHTML = lineItems.map(item => `
        <tr>
            <td>${item.description}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatCurrency(item.rate)}</td>
            <td style="text-align: right;">${formatCurrency(item.amount)}</td>
        </tr>
    `).join('');
    
    return `
        <div class="preview-header" style="border-bottom-color: ${primaryColor};">
            <div>
                ${uploadedLogo ? `<img src="${uploadedLogo}" class="preview-logo" alt="Logo">` : ''}
                <div class="preview-title" style="color: ${primaryColor};">${isPaid ? 'RECEIPT' : 'INVOICE'}</div>
                ${isPaid ? '<div style="color: #16a34a; font-weight: 700; font-size: 1.25rem;">PAID</div>' : ''}
            </div>
            <div style="text-align: right;">
                <div><strong>${isPaid ? 'Receipt' : 'Invoice'} #:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${invoiceDate}</div>
                ${!isPaid ? `<div><strong>Due Date:</strong> ${dueDate}</div>` : ''}
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
            <div class="preview-section">
                <div class="preview-label">FROM:</div>
                <div><strong>${businessName}</strong></div>
                <div>${businessEmail}</div>
                <div>${businessAddress}</div>
            </div>
            <div class="preview-section">
                <div class="preview-label">BILL TO:</div>
                <div><strong>${clientName}</strong></div>
                <div>${clientEmail}</div>
                <div>${clientAddress}</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="background: ${primaryColor};">Description</th>
                    <th style="background: ${primaryColor}; text-align: center;">Qty</th>
                    <th style="background: ${primaryColor}; text-align: right;">Rate</th>
                    <th style="background: ${primaryColor}; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        
        <div style="text-align: right; margin-top: 1rem;">
            <div style="margin-bottom: 0.5rem;"><strong>Subtotal:</strong> ${formatCurrency(invoiceData.subtotal)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Tax (${document.getElementById('taxRate').value}%):</strong> ${formatCurrency(invoiceData.tax)}</div>
            <div style="font-size: 1.25rem; color: ${primaryColor}; font-weight: 700; border-top: 2px solid ${primaryColor}; padding-top: 0.5rem;">
                <strong>Total:</strong> ${formatCurrency(invoiceData.total)}
            </div>
        </div>
        
        ${notes ? `<div class="preview-section" style="margin-top: 2rem;">
            <div class="preview-label">NOTES:</div>
            <div>${notes}</div>
        </div>` : ''}
        
        <div style="text-align: center; margin-top: 2rem; color: #64748b; font-size: 0.875rem;">
            Thank you for your business!
        </div>
    `;
}

function generatePDF(isPaid = false) {
    const form = document.getElementById('invoiceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const businessName = document.getElementById('businessName').value;
    const businessEmail = document.getElementById('businessEmail').value;
    const businessAddress = document.getElementById('businessAddress').value;
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const notes = document.getElementById('notes').value;
    const lineItems = getLineItemsData();
    const template = document.getElementById('template').value;
    const colors = templateColors[template];
    
    let yPos = margin;
    
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    if (uploadedLogo) {
        try {
            doc.addImage(uploadedLogo, 'PNG', margin, 10, 40, 20);
        } catch (e) {
            console.log('Logo not added:', e);
        }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text(isPaid ? 'RECEIPT' : 'INVOICE', pageWidth - margin - 60, 25);
    
    if (isPaid) {
        doc.setFillColor(...colors.secondary);
        doc.rect(pageWidth - 70, 10, 50, 20, 'F');
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('PAID', pageWidth - 60, 24);
    }
    
    yPos = 50;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('From:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.text(businessName, margin, yPos + 6);
    doc.setFontSize(9);
    doc.text(businessEmail, margin, yPos + 12);
    const businessAddressLines = doc.splitTextToSize(businessAddress, 80);
    doc.text(businessAddressLines, margin, yPos + 18);
    
    const rightColumnX = pageWidth - margin - 80;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(isPaid ? 'Receipt #:' : 'Invoice #:', rightColumnX, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(invoiceNumber, rightColumnX + 30, yPos);
    
    doc.setFont(undefined, 'bold');
    doc.text(isPaid ? 'Payment Date:' : 'Invoice Date:', rightColumnX, yPos + 6);
    doc.setFont(undefined, 'normal');
    doc.text(formatDate(invoiceDate), rightColumnX + 30, yPos + 6);
    
    if (!isPaid) {
        doc.setFont(undefined, 'bold');
        doc.text('Due Date:', rightColumnX, yPos + 12);
        doc.setFont(undefined, 'normal');
        doc.text(formatDate(dueDate), rightColumnX + 30, yPos + 12);
    }
    
    yPos += 35;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.text(clientName, margin, yPos + 6);
    doc.setFontSize(9);
    doc.text(clientEmail, margin, yPos + 12);
    const clientAddressLines = doc.splitTextToSize(clientAddress, 80);
    doc.text(clientAddressLines, margin, yPos + 18);
    
    yPos += 40;
    
    const symbol = getCurrencySymbol();
    const tableData = lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        `${symbol} ${item.rate.toFixed(2)}`,
        `${symbol} ${item.amount.toFixed(2)}`
    ]);
    
    doc.autoTable({
        startY: yPos,
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: colors.primary,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'center', cellWidth: 30 },
            2: { halign: 'right', cellWidth: 40 },
            3: { halign: 'right', cellWidth: 40 }
        },
        styles: {
            fontSize: 9,
            cellPadding: 5
        },
        margin: { left: margin, right: margin }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    const totalsX = pageWidth - margin - 80;
    doc.setFontSize(10);
    
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(formatCurrency(invoiceData.subtotal), pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 7;
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    doc.text(`Tax (${taxRate.toFixed(2)}%):`, totalsX, yPos);
    doc.text(formatCurrency(invoiceData.tax), pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.line(totalsX, yPos - 2, pageWidth - margin, yPos - 2);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Total:', totalsX, yPos + 5);
    doc.text(formatCurrency(invoiceData.total), pageWidth - margin, yPos + 5, { align: 'right' });
    
    if (notes) {
        yPos += 20;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const notesLines = doc.splitTextToSize(notes, pageWidth - (2 * margin));
        doc.text(notesLines, margin, yPos + 6);
    }
    
    const footer = 'Thank you for your business!';
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(footer, pageWidth / 2, footerY, { align: 'center' });
    
    const fileName = isPaid ? `Receipt_${invoiceNumber}.pdf` : `Invoice_${invoiceNumber}.pdf`;
    doc.save(fileName);
}

function newInvoice() {
    const currentInvoiceNum = document.getElementById('invoiceNumber').value;
    const currentNum = parseInt(currentInvoiceNum.split('-')[1]);
    localStorage.setItem('lastInvoiceNumber', currentNum);
    
    initializeInvoiceNumber();
    document.getElementById('invoiceForm').reset();
    setDefaultDates();
    calculateTotals();
}

document.addEventListener('DOMContentLoaded', function() {
    initializeInvoiceNumber();
    setDefaultDates();
    initializeDarkMode();
    loadSavedLogo();
    updateRemoveButtons();
    
    const initialLineItem = document.querySelector('.line-item');
    attachLineItemListeners(initialLineItem);
    
    document.getElementById('addLineItem').addEventListener('click', addLineItem);
    document.getElementById('taxRate').addEventListener('input', calculateTotals);
    document.getElementById('currency').addEventListener('change', calculateTotals);
    
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    
    document.getElementById('saveBusinessPreset').addEventListener('click', saveBusinessPreset);
    document.getElementById('loadBusinessPreset').addEventListener('click', loadBusinessPreset);
    document.getElementById('saveClientPreset').addEventListener('click', saveClientPreset);
    document.getElementById('loadClientPreset').addEventListener('click', loadClientPreset);
    
    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);
    
    document.getElementById('previewInvoice').addEventListener('click', showPreview);
    document.getElementById('generateInvoice').addEventListener('click', () => generatePDF(false));
    document.getElementById('generateReceipt').addEventListener('click', () => generatePDF(true));
    document.getElementById('generateFromPreview').addEventListener('click', () => {
        document.getElementById('previewModal').classList.remove('active');
        generatePDF(false);
    });
    document.getElementById('newInvoice').addEventListener('click', newInvoice);
    
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('previewModal').classList.remove('active');
    });
    document.getElementById('closePreview').addEventListener('click', () => {
        document.getElementById('previewModal').classList.remove('active');
    });
    
    document.getElementById('previewModal').addEventListener('click', (e) => {
        if (e.target.id === 'previewModal') {
            document.getElementById('previewModal').classList.remove('active');
        }
    });
    
    document.getElementById('invoiceForm').addEventListener('reset', function() {
        setTimeout(() => {
            setDefaultDates();
            calculateTotals();
        }, 10);
    });
});
