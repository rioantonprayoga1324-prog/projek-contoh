// Ganti nama di "Hi Name"
const welcomeText = document.getElementById("welcome-text");
let name = prompt("Masukkan nama Anda:");
if (name) {
  welcomeText.textContent = "Hi " + name;
}

// Validasi form Message Us
const form = document.getElementById("contactForm");
form.addEventListener("submit", function(e) {
  e.preventDefault();
  
  let nama = document.getElementById("name").value.trim();
  let email = document.getElementById("email").value.trim();
  let pesan = document.getElementById("message").value.trim();
  
  if (nama === "" || email === "" || pesan === "") {
    alert("Semua field harus diisi!");
  } else {
    alert("Terima kasih, " + nama + "! Pesan Anda sudah terkirim.");
    form.reset();
  }
});