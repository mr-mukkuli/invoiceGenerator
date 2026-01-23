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
    modern: { primary: [138, 138, 138], secondary: [212, 165, 116] },
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
    document.getElementById('invoiceDate').valueAsDate = today;
}

function getCurrencySymbol() {
    const currency = document.getElementById('currency').value;
    return currencySymbols[currency] || 'K';
}

function formatCurrency(amount) {
    const symbol = getCurrencySymbol();
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol} ${formatted}`;
}

function getOptimalLogoDimensions(origWidth, origHeight, maxWidth = 110, maxHeight = 55) {
    // Calculate aspect ratio
    const ratio = origWidth / origHeight;

    // Determine dimensions based on aspect ratio
    let finalWidth, finalHeight;

    if (ratio > maxWidth / maxHeight) {
        // Image is wider, constrain by width
        finalWidth = maxWidth;
        finalHeight = maxWidth / ratio;
    } else {
        // Image is taller, constrain by height
        finalHeight = maxHeight;
        finalWidth = maxHeight * ratio;
    }

    return { width: finalWidth, height: finalHeight };
}

function initializeDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === null || darkMode === 'true') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateDarkModeIcon(false);
    }
}

function updateDarkModeIcon(isDark) {
    const icon = document.querySelector('.dark-mode-icon');
    icon.textContent = isDark ? '☀️' : '🌙';
    document.getElementById('darkModeToggle').title = isDark ? 'Toggle Light Mode' : 'Toggle Dark Mode';
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeIcon(isDark);
}

function saveBusinessPreset() {
    const preset = {
        name: document.getElementById('businessName').value,
        email: document.getElementById('businessEmail').value,
        address: document.getElementById('businessAddress').value,
        bankDetails: document.getElementById('bankDetails').value
    };
    localStorage.setItem('businessPreset', JSON.stringify(preset));
    alert('Business details saved!');
}

function loadBusinessPreset() {
    const preset = localStorage.getItem('businessPreset');
    if (preset) {
        const data = JSON.parse(preset);
        document.getElementById('businessName').value = data.name || '';
        document.getElementById('businessEmail').value = data.email || '';
        document.getElementById('businessAddress').value = data.address || '';
        document.getElementById('bankDetails').value = data.bankDetails || '';
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
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // Store logo with metadata for auto-sizing
                uploadedLogo = {
                    data: e.target.result,
                    width: img.width,
                    height: img.height
                };
                localStorage.setItem('uploadedLogo', JSON.stringify(uploadedLogo));
                updateLogoRemoveButton();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function loadSavedLogo() {
    const saved = localStorage.getItem('uploadedLogo');
    if (saved) {
        try {
            uploadedLogo = JSON.parse(saved);
        } catch (e) {
            // Handle old format (plain data URL)
            uploadedLogo = {
                data: saved,
                width: 200,
                height: 100
            };
        }
        updateLogoRemoveButton();
    }
}

function removeLogo() {
    uploadedLogo = null;
    localStorage.removeItem('uploadedLogo');
    document.getElementById('logoUpload').value = '';
    updateLogoRemoveButton();
}

function updateLogoRemoveButton() {
    const removeBtn = document.getElementById('removeLogo');
    if (uploadedLogo) {
        removeBtn.classList.remove('hidden');
    } else {
        removeBtn.classList.add('hidden');
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
    const tax = subtotal * (taxRate / (100 + taxRate));
    const total = subtotal - tax;

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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function showPreview() {
    const form = document.getElementById('invoiceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const previewContent = generatePreviewHTML('invoice');
    document.getElementById('previewContent').innerHTML = previewContent;
    document.getElementById('previewModal').classList.add('active');
}

function generatePreviewHTML(documentType = 'invoice') {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = formatDate(document.getElementById('invoiceDate').value);
    const businessName = document.getElementById('businessName').value;
    const businessEmail = document.getElementById('businessEmail').value;
    const businessAddress = document.getElementById('businessAddress').value.replace(/\n/g, '<br>');
    const bankDetails = document.getElementById('bankDetails').value.replace(/\n/g, '<br>');
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientAddress = document.getElementById('clientAddress').value.replace(/\n/g, '<br>');
    const notes = document.getElementById('notes').value.replace(/\n/g, '<br>');
    const lineItems = getLineItemsData();
    const template = document.getElementById('template').value;
    const colors = templateColors[template];

    const primaryColor = `rgb(${colors.primary.join(',')})`;
    const isPaid = documentType === 'receipt';
    const isQuotation = documentType === 'quotation';

    let documentTitle = 'INVOICE';
    let documentLabel = 'Invoice';
    if (isPaid) {
        documentTitle = 'RECEIPT';
        documentLabel = 'Receipt';
    } else if (isQuotation) {
        documentTitle = 'QUOTATION';
        documentLabel = 'Quotation';
    }

    let itemsHTML = lineItems.map(item => `
        <tr>
            <td>${item.description}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatCurrency(item.rate)}</td>
            <td style="text-align: right;">${formatCurrency(item.amount)}</td>
        </tr>
    `).join('');

    const totalLabel = isQuotation ? 'Total Quote Value:' : 'Total Amount Due:';

    // Generate logo HTML with auto-sizing
    let logoHTML = '';
    if (uploadedLogo) {
        let dims = { width: 110, height: 55 };
        if (uploadedLogo.width && uploadedLogo.height) {
            dims = getOptimalLogoDimensions(uploadedLogo.width, uploadedLogo.height);
        }
        const logoSrc = uploadedLogo.data || uploadedLogo;
        logoHTML = `<div style="text-align: center;"><img src="${logoSrc}" class="preview-logo" alt="Logo" style="width: ${dims.width}px; height: ${dims.height}px; object-fit: contain;"></div>`;
    } else {
        logoHTML = '<div></div>';
    }

    return `
        <div class="preview-header" style="border-bottom-color: ${primaryColor};">
            <div>
                <div class="preview-title" style="color: ${primaryColor};">${documentTitle}</div>
                ${isPaid ? '<div style="color: #16a34a; font-weight: 700; font-size: 1rem;">PAID</div>' : ''}
            </div>
            ${logoHTML}
            <div style="text-align: right;">
                <div><strong>${documentLabel} #:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${invoiceDate}</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1rem;">
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
        
        <div style="text-align: right; margin-top: 0.75rem;">
            <div style="margin-bottom: 0.4rem;"><strong>Subtotal (incl. tax):</strong> ${formatCurrency(invoiceData.subtotal)}</div>
            <div style="margin-bottom: 0.4rem; color: #16a34a;"><strong>Tax (${document.getElementById('taxRate').value}%) deduction:</strong> ${formatCurrency(invoiceData.tax)}</div>
            <div style="font-size: 1rem; color: ${primaryColor}; font-weight: 700; border-top: 2px solid ${primaryColor}; padding-top: 0.4rem;">
                <strong>${totalLabel}</strong> ${formatCurrency(invoiceData.total)}
            </div>
        </div>
        
        ${bankDetails && !isQuotation ? `<div class="bank-details-section">
            <div class="preview-label">PAYMENT DETAILS:</div>
            <div>${bankDetails}</div>
        </div>` : ''}
        
        ${notes ? `<div class="preview-section" style="margin-top: 1rem;">
            <div class="preview-label">NOTES:</div>
            <div>${notes}</div>
        </div>` : ''}
        
        <div style="text-align: center; margin-top: 1.5rem; color: #64748b; font-size: 0.65rem;">
            ${isQuotation ? 'Valid for 30 days from date of issue. This is a quotation and not an invoice.' : 'Thank you for your business!'}
        </div>
    `;
}

function generatePDF(documentType = 'invoice') {
    const form = document.getElementById('invoiceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const invoiceNumber = document.getElementById('invoiceNumber').value;
    let fileName = `Invoice_${invoiceNumber}.pdf`;

    if (documentType === 'receipt') {
        fileName = `Receipt_${invoiceNumber}.pdf`;
    } else if (documentType === 'quotation') {
        fileName = `Quotation_${invoiceNumber}.pdf`;
    }

    // Create a temporary div with the preview content
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.style.padding = '20px';
    tempDiv.className = 'preview-invoice';
    tempDiv.innerHTML = generatePreviewHTML(documentType);

    document.body.appendChild(tempDiv);

    html2canvas(tempDiv, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        windowHeight: tempDiv.scrollHeight,
        allowTaint: true
    }).then(canvas => {
        const { jsPDF } = window.jspdf;

        // Calculate the content height and determine page size
        const contentHeight = canvas.height;
        const contentWidth = canvas.width;
        const ratio = contentWidth / contentHeight;

        // A5 landscape is 210 x 148 mm
        // Calculate what height we need if we keep width at 210mm
        const fixedWidth = 210;
        const calculatedHeight = fixedWidth / ratio;

        // Create PDF with dynamic height (but cap it to reasonable size to avoid huge PDFs)
        // If content is small, use A5; if large, grow the page
        let pageFormat;
        let pageWidth, pageHeight;

        if (calculatedHeight <= 148) {
            // Content fits in A5 landscape
            pageWidth = 210;
            pageHeight = 148;
        } else {
            // Content needs more space - use calculated height but maintain landscape orientation
            pageWidth = 210;
            pageHeight = calculatedHeight;
        }

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [pageWidth, pageHeight],
            compress: true
        });

        // Calculate image dimensions to fit the page
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 10; // Leave 5mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add image to PDF
        doc.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);

        doc.save(fileName);
        document.body.removeChild(tempDiv);
    }).catch(err => {
        console.error('PDF generation error:', err);
        if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
        }
    });
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

document.addEventListener('DOMContentLoaded', function () {
    initializeInvoiceNumber();
    setDefaultDates();
    initializeDarkMode();
    loadSavedLogo();
    updateRemoveButtons();

    const initialLineItem = document.querySelector('.line-item');
    attachLineItemListeners(initialLineItem);

    calculateTotals();

    document.getElementById('addLineItem').addEventListener('click', addLineItem);
    document.getElementById('taxRate').addEventListener('input', calculateTotals);
    document.getElementById('currency').addEventListener('change', calculateTotals);

    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    document.getElementById('saveBusinessPreset').addEventListener('click', saveBusinessPreset);
    document.getElementById('loadBusinessPreset').addEventListener('click', loadBusinessPreset);
    document.getElementById('saveClientPreset').addEventListener('click', saveClientPreset);
    document.getElementById('loadClientPreset').addEventListener('click', loadClientPreset);

    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);
    document.getElementById('removeLogo').addEventListener('click', removeLogo);

    document.getElementById('previewInvoice').addEventListener('click', showPreview);
    document.getElementById('generateInvoice').addEventListener('click', () => generatePDF('invoice'));
    document.getElementById('generateQuotation').addEventListener('click', () => generatePDF('quotation'));
    document.getElementById('generateReceipt').addEventListener('click', () => generatePDF('receipt'));
    document.getElementById('generateFromPreview').addEventListener('click', () => {
        document.getElementById('previewModal').classList.remove('active');
        generatePDF('invoice');
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

    document.getElementById('invoiceForm').addEventListener('reset', function () {
        setTimeout(() => {
            localStorage.setItem('lastInvoiceNumber', 0);

            setDefaultDates();
            calculateTotals();
        }, 10);
    });
});
