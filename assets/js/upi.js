// UPI QR Payment Functions
$(document).ready(function() {
  // Wait for QRCode library to load
  function waitForQRCode(callback) {
    if (typeof QRCode !== 'undefined') {
      callback();
    } else {
      setTimeout(() => waitForQRCode(callback), 100);
    }
  }
  // Handle UPI payment selection
  $(document).on('click', '#upi', function() {
    $("#paymentModel").modal("hide");
    $("#upiQrModal").modal("show");
    generateUpiQr();
  });

  // Handle UPI payment completion
  $("#upiPaymentCompleted").on("click", function () {
    $("#upiQrModal").modal("hide");
    // Submit the order as completed
    $(this).submitDueOrder(1);
  });

  // UPI QR generation function
  window.generateUpiQr = function() {
    waitForQRCode(function() {
      try {
        const amount = $("#payablePrice").val().replace(",", "");
        const merchantId = window.settings ? (window.settings.upi_merchant_id || "merchant@upi") : "merchant@upi";
        const merchantName = window.settings ? (window.settings.upi_merchant_name || window.settings.store || "Restaurant") : "Restaurant";
        const transactionId = "TXN" + Date.now();

        // Generate UPI URI
        const upiUri = `upi://pay?pa=${merchantId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Order Payment")}&tr=${transactionId}`;

        // Generate QR Code
        $("#upi-qr-code").empty();
        QRCode.toCanvas(document.getElementById("upi-qr-code"), upiUri, {
          width: 200,
          height: 200,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }, function (error) {
          if (error) {
            console.error('QR Code generation failed:', error);
            alert('Failed to generate QR code');
          }
        });

        // Update modal content
        $("#upi-amount").text("₹" + (window.moneyFormat ? window.moneyFormat(amount) : amount));
        $("#upi-merchant").text(merchantName);
        $("#upi-transaction-id").text(transactionId);
      } catch (error) {
        console.error('UPI QR generation error:', error);
        alert('Failed to generate UPI QR code');
      }
    });
  };
});