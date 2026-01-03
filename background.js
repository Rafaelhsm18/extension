// AI Proposal Pro - Background Service Worker
// Manages OpenAI API calls and payment verification

// Importar ExtensionPay (Manifest V3 compatible)
importScripts('ExtPay.js');

const BACKEND_URL = 'https://ai-proposal-backend-api.vercel.app/api/generate-proposal';
const MODEL = 'gpt-4o-mini';

// Inicializar ExtensionPay con el Extension ID REAL
const extpay = ExtPay('ai-proposal-pro-2026');

// Iniciar ExtensionPay
extpay.startBackground();

// Listener para mensajes desde content_script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateProposal') {
        // Verificar estado de pago primero
        checkPaymentAndGenerate(request.jobData)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                console.error('Error:', error);
                sendResponse({
                    success: false,
                    error: error.message || 'Error processing request'
                });
            });
        return true; // Keep the channel open for async response
    }

    if (request.action === 'checkPaymentStatus') {
        extpay.getUser().then(user => {
            sendResponse({
                success: true,
                paid: user.paid,
                user: {
                    paid: user.paid,
                    paidAt: user.paidAt,
                    installedAt: user.installedAt
                }
            });
        }).catch(error => {
            console.error('Error checking payment:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        });
        return true;
    }

    if (request.action === 'openPaymentPage') {
        extpay.openPaymentPage();
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'saveUserProfile') {
        chrome.storage.sync.set({ professionalProfile: request.profile.fullProfile }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'getUserProfile') {
        chrome.storage.sync.get(['professionalProfile'], (result) => {
            sendResponse({ success: true, profile: result.professionalProfile || null });
        });
        return true;
    }
});

// Verificar estado de pago antes de generar propuesta
async function checkPaymentAndGenerate(jobData) {
    try {
        // Obtener información del usuario (estado de pago) con timeout
        const userPromise = extpay.getUser();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout al verificar estado de pago')), 10000)
        );

        const user = await Promise.race([userPromise, timeoutPromise]);

        console.log('Estado de pago verificado:', { paid: user.paid, paidAt: user.paidAt });

        // Si el usuario NO ha pagado, abrir página de pago
        if (!user.paid) {
            console.log('Usuario no ha pagado. Abriendo página de pago...');

            // Abrir página de pago inmediatamente
            extpay.openPaymentPage();

            return {
                success: false,
                needsPayment: true,
                error: 'Premium subscription required (€9.99/month) to generate AI proposals. Complete payment to continue.',
                subscriptionInfo: {
                    price: '9.99 EUR',
                    period: 'monthly',
                    trial: user.trialStartedAt ? true : false
                }
            };
        }

        // Verificar que la suscripción esté activa
        if (user.paid && user.paidAt) {
            console.log('Premium user verified. Generating proposal...');

            // Si el usuario ya ha pagado, generar propuesta normalmente
            const proposal = await handleGenerateProposal(jobData);

            return {
                success: true,
                proposal: proposal,
                paid: true,
                paidAt: user.paidAt
            };
        } else {
            // Estado inconsistente
            throw new Error('Estado de pago inconsistente. Por favor, recarga la extensión.');
        }

    } catch (error) {
        console.error('Error in checkPaymentAndGenerate:', error);

        // Si hay error de conexión con ExtensionPay, mostrar mensaje claro
        if (error.message.includes('Timeout') || error.message.includes('network')) {
            return {
                success: false,
                needsPayment: false,
                error: 'Error connecting to payment server. Please check your internet connection and reload the extension.'
            };
        }

        throw error;
    }
}

async function handleGenerateProposal(jobData) {
    // Obtener solo el perfil profesional del usuario desde chrome.storage.SYNC
    const data = await chrome.storage.sync.get(['professionalProfile']);
    const professionalProfile = data.professionalProfile;

    // Verify that the user has completed their profile
    if (!professionalProfile || professionalProfile.length < 50) {
        throw new Error('Please complete your professional profile in the extension popup (minimum 50 characters).');
    }

    if (!jobData || !jobData.description) {
        throw new Error('No job information provided.');
    }

    // Construir el prompt con el perfil completo
    const prompt = buildPrompt(jobData, professionalProfile);

    // Llamar al backend de Vercel (la API key está en el servidor)
    const proposal = await callOpenAI(MODEL, prompt);

    return proposal;
}

// Construir el prompt para OpenAI usando el perfil profesional completo
function buildPrompt(jobData, professionalProfile) {
    return `You are an expert in writing human-centric, high-conversion Upwork proposals. Your goal is to sound like a real person, not an AI or a generic bot.

FREELANCER PROFILE:
${professionalProfile}

JOB TO APPLY FOR:
Title: ${jobData.title}
Description: ${jobData.description}
${jobData.skills ? `Required Skills: ${jobData.skills}` : ''}

INSTRUCTIONS (MAX 200 WORDS):
1. **NO MARKDOWN OVERUSE**: Do not use bold (**) for every section. Use plain text or very subtle formatting. It must look like a professional email, not a marketing flyer.
2. **THE HOOK**: Start by acknowledging the specific problem. (e.g., "I understand the importance of consistency when labeling large datasets...").
3. **REALISTIC CONNECTION**: Use your background in Service Lead/KPIs to explain WHY you are reliable for this task. (e.g., "My experience managing service delivery means I understand that data accuracy is non-negotiable").
4. **INTEGRITY CHECK**: If the job asks for a language or technical skill NOT in the profile, focus on your "operational reliability" and "attention to detail" without lying.
5. **TONE**: Peer-to-peer. Confident but helpful. Avoid being "too corporate" for simple tasks.
6. **DIRECT CALL TO ACTION**: End with a simple, low-friction question or a statement of availability. No "I look forward to your call".

CRITICAL LANGUAGE RULE: Write the proposal in the EXACT SAME LANGUAGE as the job description.

### FINAL INTEGRITY CHECK: 
Do not invent skills. Do not use corporate jargon like "strategic synergy". Focus on being the person who will get the job done right and on time.`;
}

// Llamar al backend en Vercel
async function callOpenAI(unusedKey, prompt) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt
            })
        });

        const data = await response.json();

        // 1. Verificar si el backend o OpenAI devolvieron un error
        if (!response.ok || data.error) {
            console.error('Detalle del error:', data);
            const msg = data.error?.message || data.error || `Error ${response.status}`;
            throw new Error(`Error API: ${msg}`);
        }

        // 2. Validar la estructura de la respuesta (OpenAI format)
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const proposal = data.choices[0].message.content.trim();

            // Guardar en historial
            saveToHistory(proposal, data);

            return proposal;
        } else {
            console.error('Estructura inesperada:', data);
            throw new Error('La respuesta del servidor no contiene una propuesta válida. Revisa la configuración de tu API Key en Vercel.');
        }

    } catch (error) {
        console.error('Error llamando al backend:', error);
        throw error;
    }
}

// Guardar propuesta en historial
async function saveToHistory(proposal, apiResponse) {
    const data = await chrome.storage.local.get(['proposalHistory']);
    const history = data.proposalHistory || [];

    history.unshift({
        proposal,
        timestamp: Date.now(),
        tokensUsed: apiResponse.usage?.total_tokens || 0,
        model: apiResponse.model || MODEL
    });

    // Mantener solo las últimas 50 propuestas
    if (history.length > 50) {
        history.length = 50;
    }

    await chrome.storage.local.set({ proposalHistory: history });
}

// Listener para instalación de la extensión
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('AI Proposal Pro instalado correctamente');

        // Abrir página de configuración en nueva pestaña
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html')
        });

        // Mostrar welcome message con información de pago
        setTimeout(() => {
            extpay.openPaymentPage();
        }, 1000);
    }
});

// Listener para cuando el usuario complete el pago
extpay.onPaid.addListener(user => {
    console.log('Payment completed!', user);

    // Notify user that they can now use the extension
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Thank you for your purchase!',
        message: 'You can now generate unlimited AI proposals. Visit any job on Upwork to start.'
    });
});

console.log('AI Proposal Pro background service worker started');
