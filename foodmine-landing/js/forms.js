/**
 * FoodMine Forms Handling
 * Handles enquiry form validation and submission
 */

// Configuration
const CONFIG = {
    googleFormId: '1Rn0Bh2HgOtb7zRTNpbZJRr2pSbiaoS5jXeRJXvbGFQOX1lnrRk', // Replace with your Google Form ID
    enquirySheetUrl: 'https://script.google.com/macros/s/AKfycbzNlKVx4WQOOxRjNaukds8LH9iu__Xw-qzQ-7eGO9YK4HfoN_sWfE73VbDbymCHNK7W/exec' // Replace with your Google Apps Script URL
};

// Initialize forms
document.addEventListener('DOMContentLoaded', function() {
    setupEnquiryForm();
    setupScrollBehavior();
    setupSmoothScrolling();
});

/**
 * Setup enquiry form functionality
 */
function setupEnquiryForm() {
    // Update Google Form iframe src with actual form ID
    const googleFormIframe = document.querySelector('.google-form-container iframe');
    if (googleFormIframe) {
        googleFormIframe.src = `https://docs.google.com/forms/d/e/${CONFIG.googleFormId}/viewform?embedded=true`;
    }
    
    // Setup enquiry form validation if using custom form
    const enquiryForm = document.getElementById('enquiry-form');
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleEnquirySubmission();
        });
    }
}

/**
 * Handle enquiry form submission
 */
async function handleEnquirySubmission() {
    const formData = {
        businessName: document.getElementById('business-name-enquiry').value.trim(),
        contactName: document.getElementById('contact-name-enquiry').value.trim(),
        email: document.getElementById('email-enquiry').value.trim(),
        phone: document.getElementById('phone-enquiry').value.trim(),
        businessType: document.getElementById('business-type-enquiry').value,
        currentPos: document.getElementById('current-pos').value.trim(),
        locations: document.getElementById('locations').value,
        transactions: document.getElementById('transactions').value,
        requirements: document.getElementById('requirements').value.trim(),
        demoRequest: document.getElementById('demo-request').value,
        comments: document.getElementById('comments').value.trim()
    };
    
    // Validate form
    if (!validateEnquiryForm(formData)) {
        return;
    }
    
    try {
        showFormProcessing('Submitting your enquiry...');
        
        // Send enquiry to Google Apps Script
        const response = await fetch(`${CONFIG.enquirySheetUrl}?path=/enquiry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showEnquirySuccess();
        } else {
            showFormError('Failed to submit enquiry. Please try again or contact us directly.');
        }
        
    } catch (error) {
        console.error('Enquiry submission error:', error);
        showFormError('An error occurred. Please try again or contact us directly.');
    }
}

/**
 * Validate enquiry form
 */
function validateEnquiryForm(formData) {
    if (!formData.businessName || !formData.contactName || !formData.email || !formData.phone || !formData.businessType) {
        showFormError('Please fill in all required fields.');
        return false;
    }
    
    if (!isValidEmail(formData.email)) {
        showFormError('Please enter a valid email address.');
        return false;
    }
    
    if (!isValidPhone(formData.phone)) {
        showFormError('Please enter a valid phone number.');
        return false;
    }
    
    return true;
}

/**
 * Setup scroll behavior
 */
function setupScrollBehavior() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Setup smooth scrolling
 */
function setupSmoothScrolling() {
    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Scroll to enquiry section
 */
window.scrollToEnquiry = function() {
    const enquirySection = document.getElementById('enquiry');
    if (enquirySection) {
        enquirySection.scrollIntoView({ behavior: 'smooth' });
    }
};

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
function showFormProcessing(message) {
    let overlay = document.getElementById('form-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'form-overlay';
        overlay.innerHTML = `
            <div class="form-loading">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideFormProcessing() {
    const overlay = document.getElementById('form-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showFormError(message) {
    alert('Error: ' + message);
}

function showEnquirySuccess() {
    hideFormProcessing();
    
    const successModal = document.createElement('div');
    successModal.className = 'enquiry-success-modal';
    successModal.innerHTML = `
        <div class="enquiry-success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Thank You!</h3>
            <p>Your enquiry has been submitted successfully. We'll get back to you within 24 hours.</p>
            <div class="success-actions">
                <button class="btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                <a href="#buy" class="btn-secondary">Explore Pricing</a>
            </div>
        </div>
    `;
    
    document.body.appendChild(successModal);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (successModal.parentElement) {
            successModal.remove();
        }
    }, 5000);
}

// Add CSS for enquiry form and success modal
const enquiryStyles = `
    /* Enquiry Form Styles */
    #enquiry-form {
        display: grid;
        gap: 1.5rem;
    }
    
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .form-group label {
        font-weight: 600;
        color: var(--dark-bg);
        font-size: 0.9rem;
    }
    
    .form-group input, .form-group select, .form-group textarea {
        padding: 1rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
        background: white;
    }
    
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    .form-group textarea {
        min-height: 120px;
        resize: vertical;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    
    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
    }
    
    /* Enquiry Success Modal */
    .enquiry-success-modal {
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
    
    .enquiry-success-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .enquiry-success-content h3 {
        color: #1f2937;
        margin-bottom: 1rem;
    }
    
    .enquiry-success-content p {
        color: #6b7280;
        margin-bottom: 2rem;
    }
    
    .enquiry-success-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    
    /* Form Overlay */
    #form-overlay {
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
    
    .form-loading {
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
    
    /* Google Form Container */
    .google-form-container {
        border: none;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: var(--shadow);
        min-height: 600px;
    }
    
    .google-form-container iframe {
        width: 100%;
        height: 100%;
        min-height: 600px;
        border: none;
    }
    
    .form-note {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--light-bg);
        border-radius: 8px;
        border-left: 4px solid var(--primary-color);
    }
    
    .form-note p {
        font-size: 0.9rem;
        color: var(--light-text);
    }
    
    /* Responsive adjustments for forms */
    @media (max-width: 768px) {
        .enquiry-content {
            grid-template-columns: 1fr;
        }
        
        .enquiry-form {
            order: 2;
        }
        
        .enquiry-info {
            order: 1;
            margin-bottom: 2rem;
        }
    }
`;

// Add styles to document
const style = document.createElement('style');
style.textContent = enquiryStyles;
document.head.appendChild(style);

// Add missing PayPal button container to the DOM
function addPayPalButtonContainer() {
    const paymentForm = document.getElementById('buy-form');
    if (paymentForm) {
        // Find the payment methods section
        const paymentMethods = paymentForm.querySelector('.payment-methods');
        if (paymentMethods) {
            // Add PayPal button container after payment options
            const paypalContainer = document.createElement('div');
            paypalContainer.id = 'paypal-button-container';
            paypalContainer.style.marginTop = '1rem';
            paypalContainer.style.textAlign = 'center';
            
            // Add a fallback message for PayPal
            const paypalFallback = document.createElement('div');
            paypalFallback.innerHTML = `
                <div style="background: #f0f7ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                    <p style="margin: 0; color: #2b6cb0; font-size: 0.9rem;">
                        <i class="fab fa-paypal" style="color: #0066cc; margin-right: 0.5rem;"></i>
                        PayPal payment will be processed securely. Please ensure JavaScript is enabled in your browser.
                    </p>
                </div>
            `;
            
            paymentMethods.appendChild(paypalContainer);
            paymentMethods.appendChild(paypalFallback);
        }
    }
}

// Initialize PayPal button container
document.addEventListener('DOMContentLoaded', addPayPalButtonContainer);
