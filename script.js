'use strict';

// Konfigurasi: ganti dengan nomor WhatsApp admin tujuan (format internasional tanpa +)
// Contoh: '6281234567890'
const adminWhatsAppNumber = '6281234567890';

(function main() {
  const currentYearElement = document.getElementById('year');
  if (currentYearElement) currentYearElement.textContent = new Date().getFullYear().toString();

  // Smooth scroll untuk tombol hero
  document.querySelectorAll('.scroll-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetSelector = link.getAttribute('data-target');
      if (!targetSelector) return;
      const target = document.querySelector(targetSelector);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Pilih paket -> isi select di form dan scroll ke form
  document.querySelectorAll('.choose-package').forEach((button) => {
    button.addEventListener('click', () => {
      const selectedPackage = button.getAttribute('data-package');
      const formSelect = document.getElementById('paket');
      if (formSelect && selectedPackage) {
        formSelect.value = selectedPackage;
        const formSection = document.getElementById('daftar');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Form submit -> buka WhatsApp dengan pesan terformat
  const formElement = document.getElementById('install-form');
  if (formElement) {
    formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = /** @type {HTMLInputElement} */(document.getElementById('nama')).value.trim();
      const userWhatsApp = /** @type {HTMLInputElement} */(document.getElementById('wa')).value.trim();
      const fullAddress = /** @type {HTMLTextAreaElement} */(document.getElementById('alamat')).value.trim();
      const packageSelected = /** @type {HTMLSelectElement} */(document.getElementById('paket')).value;
      const installDate = /** @type {HTMLInputElement} */(document.getElementById('tanggal')).value;
      const notes = /** @type {HTMLTextAreaElement} */(document.getElementById('catatan')).value.trim();

      if (!fullName || !userWhatsApp || !fullAddress || !packageSelected) {
        alert('Mohon lengkapi data wajib (Nama, Nomor WhatsApp, Alamat, Paket).');
        return;
      }

      const formattedDate = installDate ? new Date(installDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

      const messageLines = [
        'Halo Admin OceanNet, saya ingin pemasangan WiFi 🙏',
        '',
        `Nama\t: ${fullName}`,
        `WA\t: ${userWhatsApp}`,
        `Alamat\t: ${fullAddress}`,
        `Paket\t: ${packageSelected}`,
        `Tanggal: ${formattedDate}`,
        notes ? `Catatan: ${notes}` : null,
        '',
        'Dikirim dari Website OceanNet',
      ].filter(Boolean);

      const urlEncodedMessage = encodeURIComponent(messageLines.join('\n'));
      const waUrl = `https://wa.me/${adminWhatsAppNumber}?text=${urlEncodedMessage}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Tombol mengambang WhatsApp
  const floatingWa = document.getElementById('floating-wa');
  if (floatingWa) {
    floatingWa.addEventListener('click', (e) => {
      e.preventDefault();
      const quickMessage = encodeURIComponent('Halo Admin OceanNet, saya ingin bertanya tentang pemasangan WiFi.');
      const waUrl = `https://wa.me/${adminWhatsAppNumber}?text=${quickMessage}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Ripple effect untuk semua tombol yang memiliki kelas .ripple
  document.querySelectorAll('.ripple').forEach((el) => {
    el.addEventListener('pointerdown', (event) => {
      const target = /** @type {HTMLElement} */ (event.currentTarget);
      const rect = target.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty('--ripple-x', `${x}%`);
      target.style.setProperty('--ripple-y', `${y}%`);
      target.classList.add('rippling');
      setTimeout(() => target.classList.remove('rippling'), 400);
    }, { passive: true });
  });

  // Reveal on scroll
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.16 });

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
})();
