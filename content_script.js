// AI Proposal Pro - Content Script
// Detecta páginas de job details en Upwork y añade un botón flotante

(function () {
  'use strict';

  // Inicializar ExtensionPay con Extension ID REAL
  const extpay = ExtPay('ai-proposal-pro-2026');

  // Verificar si ya se inyectó el botón
  if (document.getElementById('ai-proposal-pro-button')) {
    return;
  }

  // Función para detectar si estamos en una página de job details
  function isJobDetailsPage() {
    // Verificar URL o presencia de elementos clave de Upwork
    const url = window.location.href;
    const isJobUrl = url.includes('/jobs/') || url.includes('/ab/proposals/job/') || url.includes('job=~');

    // Verificar que exista contenido de descripción del trabajo (buscamos selectores específicos)
    const jobDescription = document.querySelector('[data-test="job-description"]') ||
      document.querySelector('.air3-description') ||
      document.querySelector('.break') ||
      document.querySelector('.job-description');

    // Si encontramos la descripción, es una página de detalles, independientemente de la URL exacta
    return jobDescription !== null;
  }

  // Función para extraer la descripción del trabajo
  function extractJobDescription() {
    // 1. Intentar encontrar el panel lateral activo (slider)
    const sliderPanel = document.querySelector('.air3-slider-panel');
    const isSliderVisible = sliderPanel && sliderPanel.offsetParent !== null;

    // Definir la base de búsqueda: el panel si es visible, si no el documento entero
    const searchRoot = isSliderVisible ? sliderPanel : document;

    // 2. Extraer Descripción
    const descSelectors = [
      '[data-test="job-description"]',
      '.air3-description',
      '.break',
      '.job-description'
    ];

    let description = '';
    for (const selector of descSelectors) {
      const element = searchRoot.querySelector(selector);
      if (element && (isSliderVisible || element.offsetParent !== null)) {
        description = element.innerText || element.textContent;
        if (description.trim().length > 100) break;
      }
    }

    // 3. Extraer Título
    const titleSelectors = [
      'h1',
      'h2',
      '[data-test="job-title"]',
      '.air3-heading-4'
    ];

    let title = '';
    for (const selector of titleSelectors) {
      const element = searchRoot.querySelector(selector);
      if (element && (isSliderVisible || element.offsetParent !== null)) {
        title = element.innerText || element.textContent;
        if (title.trim().length > 0) break;
      }
    }

    // 4. Extraer Skills
    let skills = '';
    const skillsContainer = searchRoot.querySelector('[data-test="skills-list"]') ||
      searchRoot.querySelector('.air3-token-container');
    if (skillsContainer) {
      skills = skillsContainer.innerText || skillsContainer.textContent;
    }

    return {
      title: title.trim(),
      description: description.trim(),
      skills: skills.trim(),
      url: window.location.href
    };
  }

  // Función para crear el botón flotante
  function createFloatingButton() {
    const button = document.createElement('button');
    button.id = 'ai-proposal-pro-button';
    button.className = 'ai-proposal-pro-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      Generate AI Proposal
    `;

    button.addEventListener('click', handleButtonClick);
    document.body.appendChild(button);

    // Añadir animación de entrada
    setTimeout(() => {
      button.classList.add('visible');
    }, 100);
  }

  // Manejador del clic en el botón
  async function handleButtonClick() {
    const button = document.getElementById('ai-proposal-pro-button');

    // Cambiar el estado del botón a "cargando"
    button.classList.add('loading');
    button.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="31.4 31.4" stroke-dashoffset="0">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
      Checking subscription...
    `;

    try {
      // VALIDACIÓN DE PAGO PRIMERO - Verificación instantánea
      const user = await extpay.getUser();

      if (!user.paid) {
        // User hasn't paid - show message and open payment page
        console.log('User without Premium subscription');

        resetButton();

        showNotification('⚠️ Premium subscription required (€9.99/month). Redirecting to payment page...', 'error');

        // Abrir página de pago inmediatamente
        setTimeout(() => {
          extpay.openPaymentPage();
        }, 500);

        return;
      }

      // User has paid - continue with extraction
      console.log('Premium user verified. Proceeding...');

      button.innerHTML = `
        <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="31.4 31.4" stroke-dashoffset="0">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
        Extracting information...
      `;

      // Extraer la descripción del trabajo
      const jobData = extractJobDescription();

      if (!jobData.description) {
        showNotification('Could not extract job description. Try reloading the page.', 'error');
        resetButton();
        return;
      }

      // Guardar los datos en storage
      chrome.storage.local.set({
        lastJobData: jobData,
        timestamp: Date.now()
      }, function () {
        console.log('Job data saved:', jobData);

        // Crear y mostrar el modal
        showProposalModal(jobData);

        // Enviar mensaje al background para generar propuesta
        chrome.runtime.sendMessage(
          { action: 'generateProposal', jobData: jobData },
          handleProposalResponse
        );

        // Resetear el botón
        resetButton();
      });

    } catch (error) {
      console.error('Error in payment validation:', error);
      resetButton();
      showNotification('Error verifying subscription. Reload the page and try again.', 'error');
    }
  }

  // Función para resetear el botón
  function resetButton() {
    const button = document.getElementById('ai-proposal-pro-button');
    if (button) {
      button.classList.remove('loading');
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        Generar Propuesta con IA
      `;
    }
  }

  // Función para mostrar notificaciones
  function showNotification(message, type = 'info') {
    // Remover notificación anterior si existe
    const existingNotif = document.getElementById('ai-proposal-pro-notification');
    if (existingNotif) {
      existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'ai-proposal-pro-notification';
    notification.className = `ai-proposal-pro-notif ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Mostrar animación
    setTimeout(() => {
      notification.classList.add('visible');
    }, 100);

    // Ocultar después de 4 segundos
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 4000);
  }

  // Inicializar
  function init() {
    if (isJobDetailsPage()) {
      createFloatingButton();
      console.log('AI Proposal Pro: Floating button added');
    }
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Observar cambios de navegación SPA (Upwork usa React)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;

      // Remover botón anterior si existe
      const oldButton = document.getElementById('ai-proposal-pro-button');
      if (oldButton) {
        oldButton.remove();
      }

      // Esperar un poco para que la página cargue
      setTimeout(init, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
