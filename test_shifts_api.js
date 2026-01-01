// Test script for Shift Management API
const http = require('http');

const API_BASE = 'http://localhost:52528/api';

// Test function to make HTTP requests
function makeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: 'localhost',
      port: 52528,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: result });
        } catch (err) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('🧪 Testing Shift Management API...\n');

  try {
    // Test 1: Get all shifts (should be empty initially)
    console.log('1. Testing GET /api/shifts/all');
    const allShifts = await makeRequest('/shifts/all');
    console.log('   Status:', allShifts.status);
    console.log('   Shifts:', allShifts.data.length || 0, 'found\n');

    // Test 2: Get current shift (should be null initially)
    console.log('2. Testing GET /api/shifts/current');
    const currentShift = await makeRequest('/shifts/current?user_id=1&till_id=1');
    console.log('   Status:', currentShift.status);
    console.log('   Current shift:', currentShift.data, '\n');

    // Test 3: Start a new shift
    console.log('3. Testing POST /api/shifts/start');
    const startShift = await makeRequest('/shifts/start', 'POST', {
      user_id: 1,
      till_id: 1,
      opening_balance: 100.00,
      notes: 'Test shift'
    });
    console.log('   Status:', startShift.status);
    if (startShift.status === 201) {
      console.log('   ✅ Shift started successfully');
      console.log('   Shift ID:', startShift.data.shift_id);
      const shiftId = startShift.data.shift_id;
    } else {
      console.log('   ❌ Failed to start shift:', startShift.data);
    }
    console.log('');

    // If shift was created, test more endpoints
    if (startShift.status === 201) {
      const shiftId = startShift.data.shift_id;

      // Test 4: Get current shift again (should return the shift)
      console.log('4. Testing GET /api/shifts/current (after starting shift)');
      const currentShift2 = await makeRequest('/shifts/current?user_id=1&till_id=1');
      console.log('   Status:', currentShift2.status);
      console.log('   Current shift exists:', !!currentShift2.data, '\n');

      // Test 5: Update expected cash (simulate transaction)
      console.log('5. Testing PUT /api/shifts/update-expected-cash');
      const updateCash = await makeRequest('/shifts/update-expected-cash', 'PUT', {
        shift_id: shiftId,
        transaction_amount: 25.50,
        transaction_type: 'sale',
        payment_mode: 'Cash'
      });
      console.log('   Status:', updateCash.status);
      console.log('   Update result:', updateCash.data, '\n');

      // Test 6: Get shift report
      console.log('6. Testing GET /api/shifts/report/:shiftId');
      const report = await makeRequest(`/shifts/report/${shiftId}`);
      console.log('   Status:', report.status);
      if (report.status === 200) {
        console.log('   ✅ Report generated successfully');
        console.log('   Expected cash:', report.data.shift.expected_cash);
        console.log('   Transactions:', report.data.summary.total_transactions);
      } else {
        console.log('   ❌ Failed to get report:', report.data);
      }
      console.log('');

      // Test 7: End the shift
      console.log('7. Testing PUT /api/shifts/end');
      const endShift = await makeRequest('/shifts/end', 'PUT', {
        shift_id: shiftId,
        closing_balance: 125.50,
        notes: 'Shift ended successfully'
      });
      console.log('   Status:', endShift.status);
      if (endShift.status === 200) {
        console.log('   ✅ Shift ended successfully');
        console.log('   Cash difference:', endShift.data.cash_difference);
      } else {
        console.log('   ❌ Failed to end shift:', endShift.data);
      }
      console.log('');

      // Test 8: Get all shifts again (should include the closed shift)
      console.log('8. Testing GET /api/shifts/all (after closing shift)');
      const allShifts2 = await makeRequest('/shifts/all');
      console.log('   Status:', allShifts2.status);
      console.log('   Total shifts:', allShifts2.data.length || 0);
      if (allShifts2.data.length > 0) {
        const lastShift = allShifts2.data[0];
        console.log('   Last shift status:', lastShift.status);
        console.log('   Last shift difference:', lastShift.cash_difference);
      }
      console.log('');
    }

    console.log('🎉 API Testing Complete!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the tests
runTests();