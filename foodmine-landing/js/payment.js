/**
 * FoodMine Payment Integration
 * Handles PayPal and Razorpay payment processing
 */

// Configuration
const CONFIG = {
    paypalClientId: 'YOUR_PAYPAL_CLIENT_ID', // Replace with your PayPal client ID
    razorpayKeyId: 'YOUR_RAZORPAY_KEY_ID',   // Replace with your Razorpay key ID
    currency: 'INR',
    apiBaseUrl: 'https://script.google.com/macros/s/AKfycbycaTL7DqADUwcHDujyFdRqSpeaUCIrzCx4F6-W7tikXmmT9kxwO_iLRTgsdNn2WzL7/exec' // Replace with your Google Apps Script URL
};

// Plan pricing configuration
const PLANS = {
    basic: {
        name: 'Basic Plan',
        price: 2999,
        currency: 'INR',
        description: 'Perfect for small restaurants and cafes'
    },
    pro: {
        name: 'Pro Plan',
        price: 4999,
        currency: 'INR',
        description: 'Ideal for growing restaurants'
    },
    enterprise: {
        name: 'Enterprise Plan',
        price: 7999,
        currency: 'INR',
        description: 'For large restaurants and chains'
    }
};

// Current selected plan
let currentPlan = 'basic';

// Initialize payment system
document.addEventListener('DOMContentLoaded', function() {
    initializePayPal();
    initializeRazorpay();
    setupFormValidation();
    updatePlanDisplay();
});

/**
 * Update the displayed plan information
 */
function updatePlanDisplay() {
    const plan = PLANS[currentPlan];
    document.getElementById('selected-plan-name').textContent = plan.name;
    document.getElementById('selected-plan-price').textContent = plan.price;
}

/**
 * Select a plan and update UI
 */
window.selectPlan = function(planId) {
    currentPlan = planId;
    updatePlanDisplay();
    
    // Scroll to buy section
    document.getElementById('buy').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Initialize PayPal integration
 */
function initializePayPal() {
    // Load PayPal SDK
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${CONFIG.paypalClientId}&currency=${CONFIG.currency}`;
    script.onload = () => {
        console.log('PayPal SDK loaded successfully');
        renderPayPalButton();
    };
    script.onerror = () => {
        console.error('Failed to load PayPal SDK');
        showPaymentError('PayPal payment is currently unavailable. Please try Razorpay or contact support.');
    };
    document.head.appendChild(script);
}

/**
 * Render PayPal payment button
 */
function renderPayPalButton() {
    if (window.paypal) {
        window.paypal.Buttons({
            createOrder: function(data, actions) {
                const plan = PLANS[currentPlan];
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: plan.price,
                            currency_code: plan.currency
                        },
                        description: plan.description
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    handlePaymentSuccess(details, 'paypal');
                });
            },
            onError: function(err) {
                console.error('PayPal error:', err);
                showPaymentError('Payment failed. Please try again or contact support.');
            }
        }).render('#paypal-button-container');
    }
}

/**
 * Initialize Razorpay integration
 */
function initializeRazorpay() {
    // Razorpay script is loaded dynamically when needed
    console.log('Razorpay integration ready');
}

/**
 * Setup form validation
 */
function setupFormValidation() {
    const form = document.getElementById('buy-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            const paymentMethod = getSelectedPaymentMethod();
            
            if (paymentMethod === 'paypal') {
                // PayPal will handle the payment flow
                // The form submission is handled by PayPal buttons
                showPaymentProcessing('Processing PayPal payment...');
            } else if (paymentMethod === 'razorpay') {
                processRazorpayPayment();
            }
        }
    });
}

/**
 * Validate the form fields
 */
function validateForm() {
    const businessName = document.getElementById('business-name').value.trim();
    const contactName = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const businessType = document.getElementById('business-type').value;
    
    if (!businessName || !contactName || !email || !phone || !businessType) {
        showFormError('Please fill in all required fields.');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showFormError('Please enter a valid email address.');
        return false;
    }
    
    if (!isValidPhone(phone)) {
        showFormError('Please enter a valid phone number.');
        return false;
    }
    
    return true;
}

/**
 * Get selected payment method
 */
function getSelectedPaymentMethod() {
    const paypalRadio = document.getElementById('paypal');
    const razorpayRadio = document.getElementById('razorpay');
    
    if (paypalRadio.checked) return 'paypal';
    if (razorpayRadio.checked) return 'razorpay';
    
    return 'paypal'; // Default
}

/**
 * Process Razorpay payment
 */
function processRazorpayPayment() {
    const plan = PLANS[currentPlan];
    const formData = getFormData();
    
    showPaymentProcessing('Processing Razorpay payment...');
    
    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
        const options = {
            key: CONFIG.razorpayKeyId,
            amount: plan.price * 100, // Razorpay expects amount in paise
            currency: plan.currency,
            name: 'FoodMine POS',
            description: plan.description,
            image: 'https://yourdomain.com/logo.png', // Replace with your logo URL
            handler: function(response) {
                handlePaymentSuccess(response, 'razorpay');
            },
            prefill: {
                name: formData.contactName,
                email: formData.email,
                contact: formData.phone
            },
            notes: {
                business_name: formData.businessName,
                business_type: formData.businessType,
                plan: currentPlan
            },
            theme: {
                color: '#2563eb'
            }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.open();
    };
    script.onerror = () => {
        showPaymentError('Razorpay payment is currently unavailable. Please try PayPal or contact support.');
    };
    document.head.appendChild(script);
}

/**
 * Handle successful payment
 */
function handlePaymentSuccess(paymentDetails, paymentMethod) {
    const formData = getFormData();
    const plan = PLANS[currentPlan];
    
    showPaymentProcessing('Generating license key...');
    
    // Generate license key and send email
    generateLicenseKey(formData, plan, paymentMethod, paymentDetails)
        .then(response => {
            if (response.success) {
                showSuccessMessage(response);
            } else {
                showPaymentError('License generation failed. Please contact support with your payment ID: ' + paymentDetails.id);
            }
        })
        .catch(error => {
            console.error('Error generating license:', error);
            showPaymentError('An error occurred. Please contact support with your payment ID: ' + paymentDetails.id);
        });
}

/**
 * Generate license key and send email
 */
async function generateLicenseKey(formData, plan, paymentMethod, paymentDetails) {
    try {
        // Call Google Apps Script to generate license
        const response = await fetch(`${CONFIG.apiBaseUrl}?path=/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.email,
                type: plan.name.toLowerCase(),
                payment_method: paymentMethod,
                payment_id: paymentDetails.id || paymentDetails.razorpay_payment_id,
                business_name: formData.businessName,
                contact_name: formData.contactName,
                phone: formData.phone,
                business_type: formData.businessType
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Send confirmation email
            await sendConfirmationEmail(formData, plan, result, paymentMethod);
            return result;
        }
        
        return result;
    } catch (error) {
        throw error;
    }
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(formData, plan, licenseData, paymentMethod) {
    // This would typically be handled by your Google Apps Script
    // For now, we'll assume the Google Apps Script handles email sending
    console.log('Email sent to:', formData.email);
}

/**
 * Get form data
 */
function getFormData() {
    return {
        businessName: document.getElementById('business-name').value.trim(),
        contactName: document.getElementById('contact-name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        businessType: document.getElementById('business-type').value
    };
}

/**
 * Utility functions
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const re = /^[+]?[\d\s\-\(\)]{10,}$/;
    return re.test(phone);
}

/**
 * UI Helper Functions
 */
function showPaymentProcessing(message) {
    // Create loading overlay
    let overlay = document.getElementById('payment-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'payment-overlay';
        overlay.innerHTML = `
            <div class="payment-loading">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hidePaymentProcessing() {
    const overlay = document.getElementById('payment-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showPaymentError(message) {
    hidePaymentProcessing();
    alert('Payment Error: ' + message);
}

function showFormError(message) {
    alert('Form Error: ' + message);
}

function showSuccessMessage(response) {
    hidePaymentProcessing();
    
    const successModal = document.createElement('div');
    successModal.className = 'success-modal';
    successModal.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Payment Successful!</h3>
            <p>Thank you for purchasing FoodMine POS. Your license key has been sent to your email.</p>
            <div class="license-info">
                <p><strong>License Key:</strong> ${response.license_key}</p>
                <p><strong>Plan:</strong> ${response.subscription_type}</p>
                <p><strong>Expires:</strong> ${new Date(response.expiry_date).toLocaleDateString()}</p>
            </div>
            <div class="success-actions">
                <button class="btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                <a href="https://foodmine.com/download" class="btn-secondary">Download Software</a>
            </div>
        </div>
    `;
    
    document.body.appendChild(successModal);
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (successModal.parentElement) {
            successModal.remove();
        }
    }, 10000);
}

// Add CSS for payment overlay and success modal
const paymentStyles = `
    #payment-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .payment-loading {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f4f6;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .success-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .success-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .success-icon {
        font-size: 3rem;
        color: #10b981;
        margin-bottom: 1rem;
    }
    
    .success-content h3 {
        color: #1f2937;
        margin-bottom: 1rem;
    }
    
    .success-content p {
        color: #6b7280;
        margin-bottom: 2rem;
    }
    
    .license-info {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
        text-align: left;
    }
    
    .license-info p {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    
    .license-info strong {
        color: #1f2937;
    }
    
    .success-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
`;

// Add styles to document
const style = document.createElement('style');
style.textContent = paymentStyles;
document.head.appendChild(style);
