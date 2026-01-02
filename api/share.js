const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Share functionality for WhatsApp and Email
router.post('/whatsapp', (req, res) => {
    try {
        const { message, phoneNumber } = req.body;
        
        if (!message || !phoneNumber) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message and phone number are required' 
            });
        }
        
        // In a real implementation, this would integrate with WhatsApp API
        // For now, we'll simulate success
        console.log(`WhatsApp share simulated: ${message} to ${phoneNumber}`);
        
        res.json({ 
            success: true, 
            message: 'WhatsApp share initiated successfully',
            data: { 
                message: message,
                phoneNumber: phoneNumber,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('WhatsApp share error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to initiate WhatsApp share',
            details: error.message 
        });
    }
});

router.post('/email', async (req, res) => {
    try {
        const { subject, body, to, from } = req.body;

        if (!subject || !body || !to) {
            return res.status(400).json({
                success: false,
                error: 'Subject, body, and recipient email are required'
            });
        }

        // Get SMTP settings from settings API
        const settingsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/settings/get`);
        const settingsData = await settingsResponse.json();
        const emailConfig = settingsData?.settings?.email_sharing || {};

        if (!emailConfig.enabled) {
            return res.status(400).json({
                success: false,
                error: 'Email sharing is not enabled in settings'
            });
        }

        if (!emailConfig.smtp_host || !emailConfig.smtp_username || !emailConfig.smtp_password) {
            return res.status(400).json({
                success: false,
                error: 'SMTP configuration incomplete. Please configure email settings.'
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: emailConfig.smtp_host,
            port: emailConfig.smtp_port || 587,
            secure: emailConfig.smtp_secure || false,
            auth: {
                user: emailConfig.smtp_username,
                pass: emailConfig.smtp_password
            }
        });

        // Prepare email options
        const mailOptions = {
            from: `"${emailConfig.from_name || 'PharmaMine'}" <${emailConfig.from_email || emailConfig.smtp_username}>`,
            to: to,
            subject: subject,
            html: body
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent successfully:', info.messageId);

        res.json({
            success: true,
            message: 'Email sent successfully',
            data: {
                subject: subject,
                to: to,
                from: emailConfig.from_email || emailConfig.smtp_username,
                messageId: info.messageId,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send email',
            details: error.message
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        endpoints: ['/whatsapp', '/email'],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;