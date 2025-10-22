const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dayjs = require('dayjs');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, '..', 'data');
const RECEIPT_DIR = path.join(__dirname, '..', 'receipts');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  if (!fs.existsSync(CUSTOMERS_FILE)) fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify({ customers: [] }, null, 2));
  if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, JSON.stringify({ payments: [] }, null, 2));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

ensureFiles();

// Seed example customers if empty
(function seed() {
  const { customers } = readJson(CUSTOMERS_FILE);
  if (!customers || customers.length === 0) {
    const now = dayjs();
    const seedCustomers = [
      { id: 'CUST001', name: 'Budi Santoso', package: 'Basic 20 Mbps', expiresAt: now.add(5, 'day').toISOString() },
      { id: 'CUST002', name: 'Siti Aminah', package: 'Family 50 Mbps', expiresAt: now.subtract(2, 'day').toISOString() },
      { id: 'CUST003', name: 'Andi Wijaya', package: 'Pro 100 Mbps', expiresAt: now.add(15, 'day').toISOString() },
    ];
    writeJson(CUSTOMERS_FILE, { customers: seedCustomers });
  }
})();

function findCustomerById(customerId) {
  const { customers } = readJson(CUSTOMERS_FILE);
  return customers.find(c => c.id.toUpperCase() === customerId.toUpperCase());
}

function extendSubscription(customerId, months) {
  const data = readJson(CUSTOMERS_FILE);
  const customer = data.customers.find(c => c.id.toUpperCase() === customerId.toUpperCase());
  if (!customer) return null;
  const currentExpiry = dayjs(customer.expiresAt);
  const base = currentExpiry.isAfter(dayjs()) ? currentExpiry : dayjs();
  const newExpiry = base.add(months, 'month');
  customer.expiresAt = newExpiry.toISOString();
  writeJson(CUSTOMERS_FILE, data);
  return customer;
}

async function generateReceipt({ paymentId, customer, amount, method, virtualAccount, ewalletRef }) {
  const paidAt = dayjs().toISOString();
  const receipt = {
    paymentId,
    customerId: customer.id,
    customerName: customer.name,
    package: customer.package,
    amount,
    method,
    paidAt,
    newExpiresAt: customer.expiresAt,
    virtualAccount: virtualAccount || null,
    ewalletRef: ewalletRef || null,
  };

  // Generate a compact receipt text for QR
  const receiptText = `Receipt ${paymentId}\n${customer.id} - ${customer.name}\n${customer.package}\nAmount: Rp ${amount.toLocaleString('id-ID')}\nPaid: ${dayjs(paidAt).format('YYYY-MM-DD HH:mm')}\nExpires: ${dayjs(customer.expiresAt).format('YYYY-MM-DD')}`;
  const qrPath = path.join(RECEIPT_DIR, `${paymentId}.png`);
  await QRCode.toFile(qrPath, receiptText, { width: 300 });

  const receiptFile = path.join(RECEIPT_DIR, `${paymentId}.json`);
  fs.writeFileSync(receiptFile, JSON.stringify({ ...receipt, qrImage: path.basename(qrPath) }, null, 2));
  return receipt;
}

app.get('/api/customers/:id', (req, res) => {
  const customer = findCustomerById(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
  res.json({
    id: customer.id,
    name: customer.name,
    package: customer.package,
    expiresAt: customer.expiresAt,
    status: dayjs(customer.expiresAt).isAfter(dayjs()) ? 'AKTIF' : 'KEDALUARSA'
  });
});

// Create a charge (simulated) and return payment instructions
app.post('/api/payments/create', (req, res) => {
  const { customerId, method } = req.body;
  if (!customerId || !method) return res.status(400).json({ error: 'customerId dan method wajib' });

  const customer = findCustomerById(customerId);
  if (!customer) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });

  // Amount based on package (you can adjust mapping)
  const prices = {
    'Basic 20 Mbps': 199000,
    'Family 50 Mbps': 299000,
    'Pro 100 Mbps': 399000,
  };
  const amount = prices[customer.package] || 299000;

  const paymentId = nanoid(10).toUpperCase();
  const createdAt = dayjs().toISOString();
  let instructions = {};

  if (method === 'bank_transfer') {
    // Simulate virtual account number
    const banks = ['BCA', 'BNI', 'BRI', 'MANDIRI'];
    const bank = banks[Math.floor(Math.random() * banks.length)];
    const virtualAccount = `${bank}-${Math.floor(1000000000 + Math.random()*9000000000)}`;
    instructions = { type: 'va', bank, virtualAccount, amount };
  } else if (method === 'ovo' || method === 'gopay' || method === 'shopeepay') {
    // Simulate deeplink string
    const ref = `${method.toUpperCase()}-${Math.floor(100000 + Math.random()*900000)}`;
    instructions = { type: 'ewallet', provider: method, deeplink: `pay://${method}/${ref}`, amount, ref };
  } else {
    return res.status(400).json({ error: 'Metode tidak didukung' });
  }

  const data = readJson(PAYMENTS_FILE);
  data.payments = data.payments || [];
  data.payments.push({ paymentId, customerId, method, amount, createdAt, status: 'PENDING', instructions });
  writeJson(PAYMENTS_FILE, data);

  res.json({ paymentId, customer, amount, method, instructions });
});

// Confirm payment (simulate webhook after user transfers). This will extend subscription.
app.post('/api/payments/confirm', async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: 'paymentId wajib' });
  const data = readJson(PAYMENTS_FILE);
  const payment = (data.payments || []).find(p => p.paymentId === paymentId);
  if (!payment) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  if (payment.status === 'PAID') return res.json({ message: 'Sudah dibayar', payment });

  const customer = extendSubscription(payment.customerId, 1);
  if (!customer) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
  payment.status = 'PAID';
  payment.paidAt = dayjs().toISOString();
  writeJson(PAYMENTS_FILE, data);

  const receipt = await generateReceipt({
    paymentId: payment.paymentId,
    customer,
    amount: payment.amount,
    method: payment.method,
    virtualAccount: payment.instructions.type === 'va' ? payment.instructions.virtualAccount : undefined,
    ewalletRef: payment.instructions.type === 'ewallet' ? payment.instructions.ref : undefined,
  });

  res.json({ message: 'Pembayaran terkonfirmasi', receipt });
});

// Get receipt detail
app.get('/api/receipts/:paymentId', (req, res) => {
  const file = path.join(RECEIPT_DIR, `${req.params.paymentId}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Bukti pembayaran tidak ditemukan' });
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  res.json(data);
});

// Serve QR images
app.use('/receipts', express.static(RECEIPT_DIR));

// Serve frontend statically from project root so API is same-origin
const STATIC_DIR = path.join(__dirname, '..', '..');
app.use(express.static(STATIC_DIR));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
