/**
 * Test script to verify CORS fixes
 * Run this with: node test-fixes.js
 */

const https = require('https');
const http = require('http');

// Test configurations
const CONFIG = {
    // Replace with your actual Google Apps Script URL
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    // Proxy server URL (if running locally)
    PROXY_URL: 'http://localhost:3001/api'
};

async function testDirectConnection() {
    console.log('Testing direct Google Apps Script connection...');
    
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?path=/status&email=test@example.com`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('Direct connection result:', response);
                    resolve(response);
                } catch (error) {
                    console.error('Failed to parse response:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Direct connection failed:', error.message);
            reject(error);
        });
    });
}

async function testProxyConnection() {
    console.log('Testing CORS proxy connection...');
    
    return new Promise((resolve, reject) => {
        const encodedUrl = encodeURIComponent(CONFIG.GOOGLE_SCRIPT_URL);
        const url = `${CONFIG.PROXY_URL}/${encodedUrl}?path=/status&email=test@example.com`;
        
        http.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('Proxy connection result:', response);
                    resolve(response);
                } catch (error) {
                    console.error('Failed to parse proxy response:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Proxy connection failed:', error.message);
            reject(error);
        });
    });
}

async function testCORSHeaders() {
    console.log('Testing CORS headers...');
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'script.google.com',
            path: '/macros/s/YOUR_SCRIPT_ID/exec?path=/status&email=test@example.com',
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        };
        
        https.request(options, (res) => {
            console.log('CORS preflight response headers:', res.headers);
            resolve(res.headers);
        }).on('error', (error) => {
            console.error('CORS test failed:', error.message);
            reject(error);
        }).end();
    });
}

async function runTests() {
    console.log('=== License System CORS Fix Tests ===\n');
    
    try {
        // Test 1: Direct connection
        await testDirectConnection();
        console.log('✓ Direct connection test completed\n');
        
        // Test 2: Proxy connection (if proxy is running)
        try {
            await testProxyConnection();
            console.log('✓ Proxy connection test completed\n');
        } catch (error) {
            console.log('⚠ Proxy connection test failed (proxy may not be running)\n');
        }
        
        // Test 3: CORS headers
        await testCORSHeaders();
        console.log('✓ CORS headers test completed\n');
        
        console.log('=== All tests completed ===');
        console.log('\nNote: Replace YOUR_SCRIPT_ID with your actual Google Apps Script ID');
        console.log('To test the proxy, make sure to run: npm start');
        
    } catch (error) {
        console.error('Tests failed:', error.message);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { testDirectConnection, testProxyConnection, testCORSHeaders };