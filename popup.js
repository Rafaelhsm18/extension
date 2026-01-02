// AI Proposal Pro - Popup Script
// Gestiona la configuración del perfil profesional

// Inicializar ExtensionPay
const extpay = ExtPay('ai-proposal-pro-2026');

// Cargar datos guardados al abrir el popup
document.addEventListener('DOMContentLoaded', function () {
    loadSavedData();

    // Event listeners
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);

    // Verificar estado de pago y mostrar badge
    checkPaymentStatus();
});

// Cargar datos guardados desde chrome.storage.sync
function loadSavedData() {
    chrome.storage.sync.get(['professionalProfile'], function (result) {
        // Cargar perfil profesional
        if (result.professionalProfile) {
            document.getElementById('professionalProfile').value = result.professionalProfile;
        }
    });
}

// Guardar perfil profesional
function saveProfile() {
    const profile = document.getElementById('professionalProfile').value.trim();

    if (!profile) {
        showStatus('saveStatus', '⚠️ Por favor, completa tu perfil profesional', 'error');
        return;
    }

    if (profile.length < 50) {
        showStatus('saveStatus', '⚠️ El perfil debe tener al menos 50 caracteres para generar buenas propuestas', 'error');
        return;
    }

    // Guardar en chrome.storage.sync (se sincroniza entre dispositivos)
    chrome.storage.sync.set({ professionalProfile: profile }, function () {
        if (chrome.runtime.lastError) {
            showStatus('saveStatus', '❌ Error al guardar: ' + chrome.runtime.lastError.message, 'error');
        } else {
            console.log('Perfil profesional guardado:', profile.substring(0, 100) + '...');
            showStatus('saveStatus', '✅ Perfil guardado correctamente', 'success');

            // También enviarlo al background para uso inmediato
            chrome.runtime.sendMessage({
                action: 'saveUserProfile',
                profile: {
                    experience: profile,
                    skills: profile,
                    fullProfile: profile
                }
            });
        }
    });
}

// Mostrar mensaje de estado
function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `save-status ${type}`;
    statusEl.classList.remove('hidden');

    // Ocultar después de 4 segundos si es éxito
    if (type === 'success') {
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 4000);
    }
}

// Verificar estado de pago
function checkPaymentStatus() {
    extpay.getUser().then(user => {
        const header = document.querySelector('header .logo');

        if (user.paid) {
            // Añadir badge premium
            const badge = document.createElement('span');
            badge.className = 'premium-badge';
            badge.textContent = '✨ Premium';
            header.appendChild(badge);

            console.log('Usuario Premium activo desde:', user.paidAt);
        } else {
            // Mostrar banner de upgrade
            const banner = document.createElement('div');
            banner.className = 'upgrade-banner';
            banner.innerHTML = `
        <div class="upgrade-content">
          <span>🔒 Desbloquea propuestas ilimitadas con IA</span>
          <button id="upgradeBtn" class="btn-upgrade">Suscribirme (9.99€/mes)</button>
        </div>
      `;

            document.querySelector('header').after(banner);

            document.getElementById('upgradeBtn').addEventListener('click', () => {
                extpay.openPaymentPage();
            });
        }
    }).catch(error => {
        console.error('Error verificando estado de pago:', error);
    });
}

console.log('AI Proposal Pro popup iniciado');
