// AI Proposal Pro - Modal Functions
// Funciones para crear y gestionar el modal de propuestas

// Mostrar modal con estado de carga
function showProposalModal(jobData) {
  // Remover modal anterior si existe
  const existingModal = document.getElementById('ai-proposal-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.id = 'ai-proposal-modal-overlay';
  overlay.className = 'ai-proposal-modal-overlay';

  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'ai-proposal-modal';
  modal.innerHTML = `
    <div class="ai-proposal-modal-header">
      <div class="ai-proposal-modal-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        AI-Generated Proposal
      </div>
      <button class="ai-proposal-modal-close" id="ai-modal-close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    
    <div class="ai-proposal-modal-body">
      <!-- Loading state -->
      <div class="ai-proposal-loading" id="ai-modal-loading">
        <div class="ai-proposal-spinner"></div>
        <div class="ai-proposal-loading-text">Generating personalized proposal...</div>
      </div>
      
      <!-- Error state -->
      <div class="ai-proposal-error" id="ai-modal-error" style="display: none;">
        <div class="ai-proposal-error-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Error generating proposal
        </div>
        <div class="ai-proposal-error-message" id="ai-modal-error-message"></div>
      </div>
      
      <!-- Success state -->
      <div class="ai-proposal-content" id="ai-modal-content">
        <h3 class="ai-proposal-job-title" id="ai-modal-job-title"></h3>
        
        <div class="ai-proposal-section-title">Your Proposal</div>
        <div class="ai-proposal-text" id="ai-modal-proposal-text"></div>
        
        <div class="ai-proposal-stats">
          <div class="ai-proposal-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span><strong id="ai-modal-word-count">0</strong> words</span>
          </div>
          <div class="ai-proposal-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span id="ai-modal-timestamp"></span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="ai-proposal-modal-footer">
      <button class="ai-proposal-btn ai-proposal-btn-secondary" id="ai-modal-regenerate">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Regenerate
      </button>
      <button class="ai-proposal-btn ai-proposal-btn-primary" id="ai-modal-copy">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy Proposal
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Event listeners
  document.getElementById('ai-modal-close').addEventListener('click', closeProposalModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeProposalModal();
    }
  });

  // Escape key para cerrar
  document.addEventListener('keydown', handleEscapeKey);

  return overlay;
}

// Manejar respuesta del background
function handleProposalResponse(response) {
  const loadingEl = document.getElementById('ai-modal-loading');
  const errorEl = document.getElementById('ai-modal-error');
  const contentEl = document.getElementById('ai-modal-content');

  if (!loadingEl || !errorEl || !contentEl) return;

  // Ocultar loading
  loadingEl.style.display = 'none';

  if (response.success && response.proposal) {
    // Mostrar propuesta
    errorEl.style.display = 'none';
    contentEl.classList.add('visible');

    chrome.storage.local.get(['lastJobData'], (result) => {
      if (result.lastJobData) {
        document.getElementById('ai-modal-job-title').textContent = result.lastJobData.title || 'Upwork Job';
      }
    });

    document.getElementById('ai-modal-proposal-text').textContent = response.proposal;

    // Contar palabras
    const wordCount = response.proposal.split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('ai-modal-word-count').textContent = wordCount;

    // Timestamp
    const now = new Date();
    document.getElementById('ai-modal-timestamp').textContent = now.toLocaleTimeString();

    // Event listeners para botones
    document.getElementById('ai-modal-copy').addEventListener('click', () => copyProposal(response.proposal));
    document.getElementById('ai-modal-regenerate').addEventListener('click', regenerateProposal);

  } else {
    // Mostrar error
    contentEl.classList.remove('visible');
    errorEl.style.display = 'block';
    document.getElementById('ai-modal-error-message').textContent = response.error || 'Unknown error';
  }
}

// Copiar propuesta al portapapeles
function copyProposal(proposal) {
  navigator.clipboard.writeText(proposal).then(() => {
    const btn = document.getElementById('ai-modal-copy');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

    // Mostrar mensaje flotante
    showCopiedMessage();

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
    }, 2000);
  }).catch(err => {
    console.error('Error al copiar:', err);
    alert('Error al copiar al portapapeles');
  });
}

// Mostrar mensaje de "copiado"
function showCopiedMessage() {
  const message = document.createElement('div');
  message.className = 'ai-proposal-copied';
  message.textContent = '✓ Proposal copied to clipboard';
  document.body.appendChild(message);

  setTimeout(() => {
    message.remove();
  }, 2000);
}

// Regenerar propuesta
function regenerateProposal() {
  chrome.storage.local.get(['lastJobData'], (result) => {
    if (result.lastJobData) {
      // Volver a mostrar loading
      const loadingEl = document.getElementById('ai-modal-loading');
      const contentEl = document.getElementById('ai-modal-content');
      const errorEl = document.getElementById('ai-modal-error');

      loadingEl.style.display = 'block';
      contentEl.classList.remove('visible');
      errorEl.style.display = 'none';

      // Enviar nueva solicitud
      chrome.runtime.sendMessage(
        { action: 'generateProposal', jobData: result.lastJobData },
        handleProposalResponse
      );
    }
  });
}

// Cerrar modal
function closeProposalModal() {
  const overlay = document.getElementById('ai-proposal-modal-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      document.removeEventListener('keydown', handleEscapeKey);
    }, 300);
  }
}

// Manejar tecla Escape
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeProposalModal();
  }
}

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showProposalModal,
    handleProposalResponse,
    closeProposalModal
  };
}
