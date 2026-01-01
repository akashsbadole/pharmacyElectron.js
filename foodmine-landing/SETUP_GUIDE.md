# FoodMine Landing Page - Complete Setup Guide

This guide will help you set up the complete foodmine.com landing page with Google Forms integration and payment processing.

## 🎯 **What's Been Created**

✅ **Complete Landing Page** (`foodmine-landing/index.html`)
- Professional design with all Food POS features
- Responsive layout for all devices
- Integrated Google Forms for enquiries
- Payment processing with PayPal and Razorpay

✅ **Styling** (`foodmine-landing/css/style.css`)
- Modern, professional design
- CSS animations and transitions
- Mobile-responsive layout
- FoodMine brand colors and styling

✅ **Payment Integration** (`foodmine-landing/js/payment.js`)
- PayPal payment processing
- Razorpay payment processing
- Form validation and error handling
- License key generation and email delivery

✅ **Forms Handling** (`foodmine-landing/js/forms.js`)
- Google Forms integration
- Enquiry form validation
- Smooth scrolling and navigation
- Success/error messaging

✅ **Google Forms Setup Guide** (`foodmine-landing/GOOGLE_FORM_SETUP.md`)
- Complete form structure and questions
- Integration instructions
- Google Sheet setup

## 📋 **Setup Steps**

### **Step 1: Create Google Form**

1. **Follow the Google Forms Setup Guide** in `foodmine-landing/GOOGLE_FORM_SETUP.md`
2. **Create the enquiry form** with the provided structure
3. **Get your Google Form ID** from the URL
4. **Update the iframe src** in the landing page

### **Step 2: Configure Payment Integration**

1. **Get PayPal Client ID**:
   - Go to [PayPal Developer Console](https://developer.paypal.com/)
   - Create a new app
   - Copy the Client ID

2. **Get Razorpay Key ID**:
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Create a new key
   - Copy the Key ID

3. **Update Configuration** in `foodmine-landing/js/payment.js`:
   ```javascript
   const CONFIG = {
       paypalClientId: 'YOUR_PAYPAL_CLIENT_ID',
       razorpayKeyId: 'YOUR_RAZORPAY_KEY_ID',
       currency: 'INR',
       apiBaseUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
   };
   ```

### **Step 3: Configure Google Apps Script**

1. **Update your Google Apps Script** to handle:
   - License generation for new purchases
   - Enquiry form submissions
   - Email notifications

2. **Add new endpoints** to your Google Apps Script:
   ```javascript
   // Add to license-api.gs
   else if (path === '/enquiry') {
       response = handleEnquiry(e);
   }
   ```

3. **Get your Google Apps Script URL** and update the configuration

### **Step 4: Host the Landing Page**

1. **Choose a hosting option**:
   - Your own web server
   - Cloud hosting (AWS, Google Cloud, etc.)
   - Static site hosting (Netlify, Vercel, etc.)

2. **Upload the files**:
   ```
   foodmine-landing/
   ├── index.html
   ├── css/
   │   └── style.css
   ├── js/
   │   ├── payment.js
   │   └── forms.js
   ├── images/ (add your images)
   └── GOOGLE_FORM_SETUP.md
   ```

3. **Set up domain**:
   - Point your domain (foodmine.com) to your hosting
   - Ensure HTTPS is enabled for secure payments

### **Step 5: Test the Complete System**

1. **Test Google Forms**:
   - Submit test enquiries
   - Verify data appears in Google Sheet
   - Check email notifications

2. **Test Payment Processing**:
   - Use PayPal sandbox mode for testing
   - Use Razorpay test mode for testing
   - Verify license generation and email delivery

3. **Test the Complete Flow**:
   - Enquiry form submission
   - Payment processing
   - License delivery
   - Email notifications

## 🔧 **Required Images**

Create an `images/` folder and add these images:

1. **favicon.ico** - Website favicon
2. **hero-mockup.png** - POS system screenshot for hero section
3. **logo.png** - FoodMine logo (optional, for Razorpay)

## 🌐 **Domain and SSL**

1. **Domain Setup**:
   - Register foodmine.com (or your chosen domain)
   - Configure DNS settings
   - Point to your hosting provider

2. **SSL Certificate**:
   - Enable HTTPS for secure payments
   - Most hosting providers offer free SSL
   - Essential for payment processing

## 📧 **Email Configuration**

1. **Set up email service** for automated license delivery:
   - Gmail API integration
   - SendGrid, Mailgun, or similar service
   - Configure in your Google Apps Script

2. **Create email templates**:
   - License confirmation emails
   - Enquiry acknowledgment emails
   - Payment receipt emails

## 🔒 **Security Considerations**

1. **Payment Security**:
   - Use HTTPS for all pages
   - Never store payment information
   - Use payment gateway sandbox for testing

2. **Form Security**:
   - Add CAPTCHA to prevent spam
   - Validate all form inputs
   - Use Google Forms built-in spam protection

3. **Data Protection**:
   - Comply with data protection regulations
   - Secure Google Sheet access
   - Regular backups of data

## 🚀 **Launch Checklist**

- [ ] Google Form created and integrated
- [ ] PayPal and Razorpay accounts set up
- [ ] Payment integration configured
- [ ] Google Apps Script updated
- [ ] Landing page hosted
- [ ] Domain configured with SSL
- [ ] Email service configured
- [ ] All forms tested
- [ ] Payment processing tested
- [ ] License delivery tested
- [ ] Mobile responsiveness tested
- [ ] Performance optimized

## 📞 **Support and Maintenance**

1. **Monitor Payments**:
   - Check payment notifications
   - Handle failed payments
   - Process refunds if needed

2. **Monitor Enquiries**:
   - Respond to enquiries within 24 hours
   - Track conversion rates
   - Update form based on feedback

3. **Update Content**:
   - Keep pricing current
   - Update features and testimonials
   - Monitor for broken links

## 🎉 **Success!**

Once you complete these steps, you'll have a complete, professional landing page for FoodMine with:
- ✅ Professional design showcasing all features
- ✅ Google Forms integration for enquiries
- ✅ PayPal and Razorpay payment processing
- ✅ Automated license generation and delivery
- ✅ Mobile-responsive design
- ✅ Secure payment processing

Your customers will be able to:
- Learn about all FoodMine features
- Submit enquiries through Google Forms
- Purchase licenses with secure payment processing
- Receive instant license delivery via email
- Download and install the software

This complete e-commerce solution will help you grow your FoodMine POS business efficiently! 🚀
