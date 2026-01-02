// AI Proposal Pro - Background Service Worker
// Manages OpenAI API calls and payment verification

// Importar ExtensionPay (Manifest V3 compatible)
importScripts('ExtPay.js');

const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// ⚠️ PEGA TU API KEY DE OPENAI AQUÍ (replace 'YOUR_OPENAI_API_KEY_HERE')
const OPENAI_API_KEY = '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';

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

// Función principal para generar propuesta
async function handleGenerateProposal(jobData) {
    // Obtener solo el perfil profesional del usuario desde chrome.storage.SYNC
    // La API key es centralizada (línea 10) y pagada por el propietario de la extensión
    const data = await chrome.storage.sync.get(['professionalProfile']);

    const professionalProfile = data.professionalProfile;

    // Verificar que la API key centralizada esté configurada
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        throw new Error('Configuration error: OpenAI API key is not configured. Contact support.');
    }

    // Verify that the user has completed their profile
    if (!professionalProfile || professionalProfile.length < 50) {
        throw new Error('Please complete your professional profile in the extension popup (minimum 50 characters).');
    }

    if (!jobData || !jobData.description) {
        throw new Error('No job information provided.');
    }

    // Construir el prompt con el perfil completo
    const prompt = buildPrompt(jobData, professionalProfile);

    // Llamar a la API de OpenAI usando la API key centralizada
    const proposal = await callOpenAI(OPENAI_API_KEY, prompt);

    return proposal;
}

// Construir el prompt para OpenAI usando el perfil profesional completo
function buildPrompt(jobData, professionalProfile) {
    return `You are an expert in writing persuasive proposals for freelancers on Upwork.

FREELANCER PROFILE:
${professionalProfile}

JOB TO APPLY FOR:
Title: ${jobData.title}
Description: ${jobData.description}
${jobData.skills ? `Required Skills: ${jobData.skills}` : ''}

INSTRUCTIONS (MAX 200 WORDS):
1. START with a personalized greeting and a hook that shows you've analyzed THEIR specific project.
2. HONESTY RULE: Only mention technical skills explicitly found in the FREELANCER PROFILE. 
3. STRATEGIC PIVOT: If there is a technical gap (e.g., job asks for C# but profile is Service Lead), do NOT say "I will learn". Instead, position the freelancer as a high-level partner who ensures PROJECT SUCCESS through process optimization, team coordination, and strategic oversight.
4. VALUE PROP: Highlight how 5+ years of Service Leadership ensures that milestones are met, communication is fluid, and the technical debt is managed through better processes.
5. BE DIRECT: Use a professional, confident, and "peer-to-peer" tone. No "begging" for the job.
6. CALL TO ACTION: End with a specific invitation to discuss how this leadership approach will benefit their project.
7. NO GENERIC FILLER: Avoid phrases like "I am the perfect candidate" or "I have read your description."

CRITICAL LANGUAGE RULE: Write the proposal in the SAME LANGUAGE as the job description.

CRITICAL: The proposal must be 100% SPECIFIC to this job. If the job mentions "GitHub" or "Zoom calls", the proposal must address those contexts.

### FINAL INTEGRITY CHECK: 
If the proposal claims a technical skill or years of experience NOT in the Freelancer Profile, it is a FAILURE. Ensure the freelancer's identity as a Service Lead is the core strength of the message.`;
}

// Llamar a la API de OpenAI
async function callOpenAI(apiKey, prompt) {
    try {
        const response = await fetch(OPENAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in writing freelancer proposals. You write in a professional, persuasive, and personalized manner.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
                top_p: 1,
                frequency_penalty: 0.3,
                presence_penalty: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response');
        }

        const proposal = data.choices[0].message.content.trim();

        // Guardar en historial
        saveToHistory(proposal, data);

        return proposal;

    } catch (error) {
        console.error('OpenAI API Error:', error);
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
