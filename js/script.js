// Nomor WhatsApp CS (format 62xxxxxxxxxxx)
const BUSINESS_WA_NUMBER = '6281234567890';

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

// Helper: format rupiah
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

// ===== Pembayaran =====
let selectedMethod = 'bank_transfer';
let createdPayment = null;

const customerIdInput = document.getElementById('customerIdInput');
const checkCustomerBtn = document.getElementById('checkCustomerBtn');
const customerInfo = document.getElementById('customerInfo');
const custName = document.getElementById('custName');
const custPackage = document.getElementById('custPackage');
const custExpiry = document.getElementById('custExpiry');
const custStatus = document.getElementById('custStatus');
const createPaymentBtn = document.getElementById('createPaymentBtn');
const instructionsWrap = document.getElementById('paymentInstructions');
const instructionsContent = document.getElementById('instructionsContent');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
const receiptSection = document.getElementById('receiptSection');

const receiptPaymentId = document.getElementById('rcptPaymentId');
const receiptCustomerId = document.getElementById('rcptCustomerId');
const receiptCustomerName = document.getElementById('rcptCustomerName');
const receiptPackage = document.getElementById('rcptPackage');
const receiptMethod = document.getElementById('rcptMethod');
const receiptAmount = document.getElementById('rcptAmount');
const receiptPaidAt = document.getElementById('rcptPaidAt');
const receiptNewExpiry = document.getElementById('rcptNewExpiry');
const rcptExtraRow = document.getElementById('rcptExtraRow');
const rcptExtraLabel = document.getElementById('rcptExtraLabel');
const rcptExtraValue = document.getElementById('rcptExtraValue');
const rcptQr = document.getElementById('rcptQr');
const printReceiptBtn = document.getElementById('printReceiptBtn');
const downloadJsonLink = document.getElementById('downloadJsonLink');
const downloadQrLink = document.getElementById('downloadQrLink');

const apiBase = '';

// Tab switch
document.querySelectorAll('.method-tabs .tab')?.forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.method-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isBank = tab.dataset.tab === 'bank';
    selectedMethod = isBank ? 'bank_transfer' : (document.querySelector('input[name="ewallet"]:checked')?.value || 'ovo');
    document.getElementById('panel-bank').classList.toggle('active', isBank);
    document.getElementById('panel-ewallet').classList.toggle('active', !isBank);
    updateCreateButtonState();
  });
});

// ewallet change
document.querySelectorAll('input[name="ewallet"]').forEach(r => {
  r.addEventListener('change', () => {
    if (document.querySelector('.method-tabs .tab[data-tab="ewallet"]').classList.contains('active')) {
      selectedMethod = r.value;
      updateCreateButtonState();
    }
  });
});

function updateCreateButtonState() {
  createPaymentBtn.disabled = !customerInfo || customerInfo.hidden;
}

checkCustomerBtn?.addEventListener('click', async () => {
  const id = customerIdInput.value.trim();
  if (!id) { alert('Masukkan ID pelanggan'); return; }
  try {
    const res = await fetch(`${apiBase}/api/customers/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('ID tidak ditemukan');
    const data = await res.json();
    customerInfo.hidden = false;
    custName.textContent = data.name;
    custPackage.textContent = data.package;
    const d = new Date(data.expiresAt);
    custExpiry.textContent = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    custStatus.textContent = data.status;
    custStatus.className = `badge ${data.status === 'AKTIF' ? 'ok' : 'expired'}`;
    updateCreateButtonState();
  } catch (e) {
    customerInfo.hidden = true;
    alert('Pelanggan tidak ditemukan');
  }
});

createPaymentBtn?.addEventListener('click', async () => {
  const id = customerIdInput.value.trim();
  if (!id) { alert('Masukkan ID pelanggan'); return; }
  try {
    const res = await fetch(`${apiBase}/api/payments/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: id, method: selectedMethod })
    });
    if (!res.ok) throw new Error('Gagal membuat pembayaran');
    const data = await res.json();
    createdPayment = data;
    renderInstructions(data);
    instructionsWrap.hidden = false;
    document.getElementById('pembayaran')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    alert('Gagal membuat pembayaran');
  }
});

function renderInstructions(data) {
  const { instructions, amount } = data;
  if (instructions.type === 'va') {
    instructionsContent.innerHTML = `
      <div class="kv"><span>Bank</span><strong>${instructions.bank}</strong></div>
      <div class="kv"><span>Virtual Account</span><strong>${instructions.virtualAccount} <a class="copy" data-copy="${instructions.virtualAccount}">Salin</a></strong></div>
      <div class="kv"><span>Jumlah</span><strong>${formatRupiah(amount)}</strong></div>
      <p class="muted">Silakan transfer tepat sesuai nominal ke VA di atas.</p>
    `;
  } else if (instructions.type === 'ewallet') {
    instructionsContent.innerHTML = `
      <div class="kv"><span>Provider</span><strong>${instructions.provider.toUpperCase()}</strong></div>
      <div class="kv"><span>Referensi</span><strong>${instructions.ref}</strong></div>
      <div class="kv"><span>Jumlah</span><strong>${formatRupiah(amount)}</strong></div>
      <div class="actions-row"><a href="${instructions.deeplink}" target="_blank" class="btn btn-primary">Buka Aplikasi</a></div>
      <p class="muted">Setelah membayar, klik tombol "Saya Sudah Bayar".</p>
    `;
  }
  // copy handler
  instructionsContent.querySelectorAll('[data-copy]')?.forEach(el => {
    el.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(el.getAttribute('data-copy')); el.textContent = 'Disalin'; setTimeout(()=> el.textContent='Salin', 1200); } catch {}
    });
  });
}

confirmPaymentBtn?.addEventListener('click', async () => {
  if (!createdPayment) return;
  try {
    const res = await fetch(`${apiBase}/api/payments/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: createdPayment.paymentId })
    });
    if (!res.ok) throw new Error('Gagal konfirmasi');
    const { receipt } = await res.json();
    fillReceipt(receipt);
    receiptSection.hidden = false;
    // prepare download links
    downloadJsonLink.href = `/receipts/${createdPayment.paymentId}.json`;
    downloadJsonLink.download = `receipt-${createdPayment.paymentId}.json`;
    downloadQrLink.href = `/receipts/${createdPayment.paymentId}.png`;
    downloadQrLink.download = `receipt-${createdPayment.paymentId}.png`;
    document.getElementById('pembayaran')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    alert('Konfirmasi gagal');
  }
});

function fillReceipt(r) {
  receiptPaymentId.textContent = r.paymentId;
  receiptCustomerId.textContent = r.customerId;
  receiptCustomerName.textContent = r.customerName;
  receiptPackage.textContent = r.package;
  receiptMethod.textContent = r.method === 'bank_transfer' ? 'Transfer Bank (VA)' : r.method.toUpperCase();
  receiptAmount.textContent = formatRupiah(r.amount);
  receiptPaidAt.textContent = new Date(r.paidAt).toLocaleString('id-ID');
  receiptNewExpiry.textContent = new Date(r.newExpiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  if (r.virtualAccount) {
    rcptExtraRow.hidden = false; rcptExtraLabel.textContent = 'Virtual Account'; rcptExtraValue.textContent = r.virtualAccount;
  } else if (r.ewalletRef) {
    rcptExtraRow.hidden = false; rcptExtraLabel.textContent = 'Ref E-Wallet'; rcptExtraValue.textContent = r.ewalletRef;
  } else {
    rcptExtraRow.hidden = true;
  }
  rcptQr.src = `/receipts/${r.paymentId}.png`;
}

printReceiptBtn?.addEventListener('click', () => {
  const content = document.getElementById('receiptCard').outerHTML;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><link rel="stylesheet" href="/css/style.css"></head><body style="padding:20px;">${content}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  win.document.close();
});

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