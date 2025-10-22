// Nomor WhatsApp CS (format 62xxxxxxxxxxx)
const BUSINESS_WA_NUMBER = '6281234567890';

// Database pelanggan simulasi (dalam implementasi nyata, ini akan dari server/API)
const customerDatabase = {
  'SPN001234': {
    id: 'SPN001234',
    name: 'Ahmad Wijaya',
    currentPackage: 'Family 50 Mbps',
    activeUntil: '2025-11-15',
    phone: '081234567890',
    address: 'Jl. Merdeka No. 123, Jakarta'
  },
  'SPN001235': {
    id: 'SPN001235',
    name: 'Siti Nurhaliza',
    currentPackage: 'Basic 20 Mbps',
    activeUntil: '2025-10-28',
    phone: '081234567891',
    address: 'Jl. Sudirman No. 456, Bandung'
  },
  'SPN001236': {
    id: 'SPN001236',
    name: 'Budi Santoso',
    currentPackage: 'Pro 100 Mbps',
    activeUntil: '2025-12-01',
    phone: '081234567892',
    address: 'Jl. Gatot Subroto No. 789, Surabaya'
  }
};

// State management untuk pembayaran
let paymentState = {
  customer: null,
  selectedPackage: null,
  paymentMethod: null,
  transactionId: null,
  amount: 0
};

// Scroll reveal
const revealElements = document.querySelectorAll('.reveal');
const onScroll = () => {
  const threshold = window.innerHeight * 0.9;
  for (const el of revealElements) {
    const rect = el.getBoundingClientRect();
    if (rect.top < threshold) el.classList.add('visible');
  }
};
document.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('load', onScroll);

// Interaksi tombol paket -> autofill paket di form
const packageButtons = document.querySelectorAll('.select-package');
const packageSelect = document.getElementById('package');
for (const btn of packageButtons) {
  btn.addEventListener('click', () => {
    const value = btn.getAttribute('data-package');
    if (packageSelect) {
      packageSelect.value = value;
      packageSelect.dispatchEvent(new Event('change'));
      document.getElementById('pemasangan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// Form pemasangan -> kirim ke WhatsApp
const installForm = document.getElementById('installForm');
installForm?.addEventListener('submit', (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const selectedPackage = document.getElementById('package').value.trim();
  const schedule = document.getElementById('schedule').value.trim();
  const note = document.getElementById('note').value.trim();

  if (!fullName || !phone || !address || !selectedPackage) {
    alert('Mohon lengkapi data wajib.');
    return;
  }

  // Normalisasi nomor WA: terima 08xxxxxxxxxx atau 62xxxxxxxxxx
  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '62' + normalizedPhone.slice(1);
  }

  const message = [
    `Halo SpaceNet, saya ingin pemasangan WiFi.`,
    `Nama: ${fullName}`,
    `No. WA: ${normalizedPhone}`,
    `Alamat: ${address}`,
    `Paket: ${selectedPackage}`,
    schedule ? `Jadwal: ${schedule}` : null,
    note ? `Catatan: ${note}` : null,
  ].filter(Boolean).join('\n');

  const encoded = encodeURIComponent(message);
  const targetNumber = BUSINESS_WA_NUMBER;
  const waUrl = `https://wa.me/${targetNumber}?text=${encoded}`;
  window.open(waUrl, '_blank');
});

// Microinteraction: ripple pada tombol
document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('.btn');
  if (!button) return;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ===== PAYMENT SYSTEM =====

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function addMonthToDate(dateString) {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
}

function generateTransactionId() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `TRX${timestamp.slice(-6)}${random}`;
}

// Step navigation
function showStep(stepId) {
  document.querySelectorAll('.payment-step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById(stepId).classList.add('active');
}

// Step 1: Customer verification
const customerForm = document.getElementById('customerForm');
customerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const customerId = document.getElementById('customerId').value.trim().toUpperCase();
  
  if (!customerId) {
    alert('Mohon masukkan ID Pelanggan');
    return;
  }
  
  // Show loading state
  submitBtn.classList.add('loading');
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Check customer in database
  const customer = customerDatabase[customerId];
  
  if (!customer) {
    submitBtn.classList.remove('loading');
    alert('ID Pelanggan tidak ditemukan. Silakan periksa kembali ID Anda.');
    return;
  }
  
  // Save customer data
  paymentState.customer = customer;
  
  // Populate customer info
  document.getElementById('customerName').textContent = customer.name;
  document.getElementById('customerIdDisplay').textContent = customer.id;
  document.getElementById('currentPackage').textContent = customer.currentPackage;
  document.getElementById('activeUntil').textContent = formatDate(customer.activeUntil);
  
  submitBtn.classList.remove('loading');
  showStep('step-package');
});

// Step 2: Package selection
const packageForm = document.getElementById('packageForm');
packageForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedPackageInput = document.querySelector('input[name="package"]:checked');
  
  if (!selectedPackageInput) {
    alert('Mohon pilih paket perpanjangan');
    return;
  }
  
  const packageName = selectedPackageInput.value;
  const packagePrice = parseInt(selectedPackageInput.dataset.price);
  
  paymentState.selectedPackage = packageName;
  paymentState.amount = packagePrice;
  
  // Update payment summary
  const packageNames = {
    'Basic': 'Basic 20 Mbps',
    'Family': 'Family 50 Mbps',
    'Pro': 'Pro 100 Mbps'
  };
  
  document.getElementById('selectedPackageName').textContent = packageNames[packageName];
  document.getElementById('totalAmount').textContent = formatCurrency(packagePrice);
  
  showStep('step-payment');
});

// Step 3: Payment method selection
const paymentForm = document.getElementById('paymentForm');
paymentForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
  
  if (!selectedMethodInput) {
    alert('Mohon pilih metode pembayaran');
    return;
  }
  
  paymentState.paymentMethod = selectedMethodInput.value;
  paymentState.transactionId = generateTransactionId();
  
  // Generate payment details based on method
  generatePaymentDetails(selectedMethodInput.value);
  
  showStep('step-details');
  startPaymentTimer();
});

// Generate payment details
function generatePaymentDetails(method) {
  const paymentInfo = document.getElementById('paymentInfo');
  let detailsHTML = '';
  
  switch (method) {
    case 'bank_transfer':
      detailsHTML = `
        <div class="info-item">
          <span class="label">Bank:</span>
          <span class="value">BCA</span>
        </div>
        <div class="info-item">
          <span class="label">No. Rekening:</span>
          <span class="value">1234567890</span>
        </div>
        <div class="info-item">
          <span class="label">Atas Nama:</span>
          <span class="value">PT SpaceNet Indonesia</span>
        </div>
        <div class="info-item">
          <span class="label">Jumlah:</span>
          <span class="value">${formatCurrency(paymentState.amount)}</span>
        </div>
        <div class="info-item">
          <span class="label">Kode Unik:</span>
          <span class="value">${paymentState.transactionId}</span>
        </div>
      `;
      break;
      
    case 'ovo':
      detailsHTML = `
        <div class="info-item">
          <span class="label">Metode:</span>
          <span class="value">OVO</span>
        </div>
        <div class="info-item">
          <span class="label">No. HP:</span>
          <span class="value">081234567890</span>
        </div>
        <div class="info-item">
          <span class="label">Jumlah:</span>
          <span class="value">${formatCurrency(paymentState.amount)}</span>
        </div>
        <div class="info-item">
          <span class="label">Kode Transaksi:</span>
          <span class="value">${paymentState.transactionId}</span>
        </div>
      `;
      break;
      
    case 'gopay':
      detailsHTML = `
        <div class="info-item">
          <span class="label">Metode:</span>
          <span class="value">GoPay</span>
        </div>
        <div class="info-item">
          <span class="label">No. HP:</span>
          <span class="value">081234567890</span>
        </div>
        <div class="info-item">
          <span class="label">Jumlah:</span>
          <span class="value">${formatCurrency(paymentState.amount)}</span>
        </div>
        <div class="info-item">
          <span class="label">Kode Transaksi:</span>
          <span class="value">${paymentState.transactionId}</span>
        </div>
      `;
      break;
      
    case 'shopeepay':
      detailsHTML = `
        <div class="info-item">
          <span class="label">Metode:</span>
          <span class="value">ShopeePay</span>
        </div>
        <div class="info-item">
          <span class="label">No. HP:</span>
          <span class="value">081234567890</span>
        </div>
        <div class="info-item">
          <span class="label">Jumlah:</span>
          <span class="value">${formatCurrency(paymentState.amount)}</span>
        </div>
        <div class="info-item">
          <span class="label">Kode Transaksi:</span>
          <span class="value">${paymentState.transactionId}</span>
        </div>
      `;
      break;
  }
  
  paymentInfo.innerHTML = detailsHTML;
}

// Payment timer (24 hours countdown)
let paymentTimer;
function startPaymentTimer() {
  const timerDisplay = document.getElementById('paymentTimer');
  let timeLeft = 24 * 60 * 60; // 24 hours in seconds
  
  paymentTimer = setInterval(() => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(paymentTimer);
      timerDisplay.textContent = '00:00:00';
      alert('Waktu pembayaran telah habis. Silakan ulangi proses pembayaran.');
    }
    
    timeLeft--;
  }, 1000);
}

// Confirm payment
const confirmPaymentBtn = document.getElementById('confirmPayment');
confirmPaymentBtn?.addEventListener('click', async () => {
  const confirmed = confirm('Apakah Anda yakin sudah melakukan pembayaran?');
  
  if (!confirmed) return;
  
  // Show loading
  confirmPaymentBtn.classList.add('loading');
  confirmPaymentBtn.disabled = true;
  
  // Simulate payment verification delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clear timer
  if (paymentTimer) {
    clearInterval(paymentTimer);
  }
  
  // Process successful payment
  processSuccessfulPayment();
  
  confirmPaymentBtn.classList.remove('loading');
  confirmPaymentBtn.disabled = false;
});

// Process successful payment
function processSuccessfulPayment() {
  const customer = paymentState.customer;
  const newActiveUntil = addMonthToDate(customer.activeUntil);
  
  // Update receipt details
  document.getElementById('transactionId').textContent = paymentState.transactionId;
  document.getElementById('receiptCustomerId').textContent = customer.id;
  
  const packageNames = {
    'Basic': 'Basic 20 Mbps',
    'Family': 'Family 50 Mbps', 
    'Pro': 'Pro 100 Mbps'
  };
  document.getElementById('receiptPackage').textContent = packageNames[paymentState.selectedPackage];
  
  const methodNames = {
    'bank_transfer': 'Transfer Bank',
    'ovo': 'OVO',
    'gopay': 'GoPay',
    'shopeepay': 'ShopeePay'
  };
  document.getElementById('receiptPaymentMethod').textContent = methodNames[paymentState.paymentMethod];
  
  document.getElementById('receiptAmount').textContent = formatCurrency(paymentState.amount);
  document.getElementById('receiptDate').textContent = formatDate(new Date().toISOString());
  document.getElementById('newActiveUntil').textContent = formatDate(newActiveUntil);
  
  // Update customer database (in real implementation, this would be sent to server)
  customerDatabase[customer.id].activeUntil = newActiveUntil;
  
  showStep('step-receipt');
}

// Copy payment info
const copyPaymentInfoBtn = document.getElementById('copyPaymentInfo');
copyPaymentInfoBtn?.addEventListener('click', () => {
  const paymentInfo = document.getElementById('paymentInfo');
  const infoItems = paymentInfo.querySelectorAll('.info-item');
  
  let textToCopy = `Informasi Pembayaran SpaceNet\n\n`;
  infoItems.forEach(item => {
    const label = item.querySelector('.label').textContent;
    const value = item.querySelector('.value').textContent;
    textToCopy += `${label} ${value}\n`;
  });
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = copyPaymentInfoBtn.textContent;
    copyPaymentInfoBtn.textContent = 'Tersalin!';
    setTimeout(() => {
      copyPaymentInfoBtn.textContent = originalText;
    }, 2000);
  });
});

// Download receipt
const downloadReceiptBtn = document.getElementById('downloadReceipt');
downloadReceiptBtn?.addEventListener('click', () => {
  const receiptData = {
    transactionId: paymentState.transactionId,
    customerId: paymentState.customer.id,
    customerName: paymentState.customer.name,
    package: paymentState.selectedPackage,
    paymentMethod: paymentState.paymentMethod,
    amount: paymentState.amount,
    date: new Date().toISOString(),
    newActiveUntil: addMonthToDate(paymentState.customer.activeUntil)
  };
  
  generateReceiptPDF(receiptData);
});

// Generate PDF receipt (simplified version)
function generateReceiptPDF(data) {
  const packageNames = {
    'Basic': 'Basic 20 Mbps',
    'Family': 'Family 50 Mbps',
    'Pro': 'Pro 100 Mbps'
  };
  
  const methodNames = {
    'bank_transfer': 'Transfer Bank',
    'ovo': 'OVO',
    'gopay': 'GoPay',
    'shopeepay': 'ShopeePay'
  };
  
  const receiptContent = `
BUKTI PEMBAYARAN SPACENET
========================

ID Transaksi: ${data.transactionId}
ID Pelanggan: ${data.customerId}
Nama: ${data.customerName}
Paket: ${packageNames[data.package]}
Metode Pembayaran: ${methodNames[data.paymentMethod]}
Jumlah: ${formatCurrency(data.amount)}
Tanggal: ${formatDate(data.date)}
Masa Aktif Baru: ${formatDate(data.newActiveUntil)}

Terima kasih telah menggunakan layanan SpaceNet!
  `;
  
  // Create downloadable text file (in real implementation, use PDF library)
  const blob = new Blob([receiptContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SpaceNet_Receipt_${data.transactionId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Print receipt
const printReceiptBtn = document.getElementById('printReceipt');
printReceiptBtn?.addEventListener('click', () => {
  window.print();
});

// Reset payment process (for testing)
function resetPaymentProcess() {
  paymentState = {
    customer: null,
    selectedPackage: null,
    paymentMethod: null,
    transactionId: null,
    amount: 0
  };
  
  if (paymentTimer) {
    clearInterval(paymentTimer);
  }
  
  document.getElementById('customerId').value = '';
  document.querySelectorAll('input[name="package"]').forEach(input => input.checked = false);
  document.querySelectorAll('input[name="paymentMethod"]').forEach(input => input.checked = false);
  
  showStep('step-customer');
}

// Add reset button functionality (for development/testing)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r' && e.shiftKey) {
    e.preventDefault();
    resetPaymentProcess();
    console.log('Payment process reset');
  }
});