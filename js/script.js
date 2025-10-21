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