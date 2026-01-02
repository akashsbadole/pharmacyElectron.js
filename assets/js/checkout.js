// Browser-compatible utils loading
let checkoutUtils;
if (typeof require !== 'undefined') {
    try {
        checkoutUtils = require("./utils");
    } catch (e) {
        console.warn('Node.js utils not available, using browser fallback');
        checkoutUtils = window.utils;
    }
} else {
    checkoutUtils = window.utils;
}

// Fallback if utils is still not available
if (!checkoutUtils) {
    checkoutUtils = {
        moneyFormat: (amount) => new Intl.NumberFormat('en-IN').format(amount),
        getStockStatus: (current, minimum) => {
            current = Number(current);
            minimum = Number(minimum);
            if (current <= 0) return 0;
            if (current <= minimum) return -1;
            return 1;
        }
    };
}

/** CheckOut Functions **/
$(document).ready(function () {
  /**
   * handle keypad button pressed.
   * @param {string} value - The keypad value to be processed.
   * @param {boolean} isDueInput - Indicates whether the input is for due payment.
   */
  $.fn.keypadBtnPressed = function (value, isDueInput) {
    let paymentAmount = $("#payment").val();
    if (isDueInput) {
      $("#refNumber").val($("#refNumber").val() + "" + value);
    } else {
      paymentAmount = paymentAmount + "" + value;
      $("#paymentText").val(checkoutUtils.moneyFormat(paymentAmount));
      $("#payment").val(paymentAmount);
      $(this).calculateChange();
    }
  };

  /**
   * Format payment amount with commas when a point is pressed
   */
  $.fn.digits = function () {
    let paymentAmount = $("#payment").val();
    $("#paymentText").val(checkoutUtils.moneyFormat(paymentAmount));
    $("#payment").val(paymentAmount + ".");
    $(this).calculateChange();
  };

  /**
   * Calculate and display the balance due.
   */
  $.fn.calculateChange = function () {
    var payablePrice = $("#payablePrice").val().replace(",", "");
    var payment = $("#payment").val().replace(",", "");
    var change = payablePrice - payment;
    if (change <= 0) {
      $("#change").text(checkoutUtils.moneyFormat(Math.abs(change.toFixed(2))));
      $("#confirmPayment").show();
    } else {
      $("#change").text("0");
      $("#confirmPayment").hide();
    }
  };

  var $keypadBtn = $(".keypad-btn").on("click", function () {
    const key = $(this).data("val");
    const isdue = $(this).data("isdue");
    switch(key)
    {
    case "del" : {
      if(isdue)
      {
        $('#refNumber').val((i, val) => val.slice(0, -1));
      }
      else
      {
        $("#payment").val((i, val) => val.slice(0, -1));
      //re-format displayed amount after deletion
      $("#paymentText").val((i, val) => checkoutUtils.moneyFormat($("#payment").val()));
      }
      $(this).calculateChange()
    }; break;

    case "ac":{
      if(isdue)
      {
          $('#refNumber').val('');
      }
      else
      {
        $('#payment,#paymentText').val('');
        $(this).calculateChange();
      }

    };break;

  case "point": {
    $(this).digits()
    };break;

   default: $(this).keypadBtnPressed(key, isdue); break;
  }
});

  // Handle direct input on payment field
  $("#paymentText").on("input", function() {
    let inputVal = $(this).val().replace(/,/g, '').replace(/[^\d.]/g, ''); // remove commas and non-numeric except .
    let numVal = parseFloat(inputVal) || 0;
    $("#payment").val(numVal);
    $(this).calculateChange();
  });

  /** Switch Views for Payment Options **/
  var $list = $(".list-group-item").on("click", function () {
    $list.removeClass("active");
    $(this).addClass("active");
    if (this.id == "check") {
      $("#cardInfo").show();
      $("#cardInfo .input-group-addon").text("Check Info");
    } else if (this.id == "card") {
      $("#cardInfo").show();
      $("#cardInfo .input-group-addon").text("Card Info");
    } else if (this.id == "cash") {
      $("#cardInfo").hide();
    }
  });
});