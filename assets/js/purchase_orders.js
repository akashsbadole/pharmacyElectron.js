// Dependencies loaded globally via bundle.min.js and renderer.js

$(document).ready(function() {
    loadPurchaseOrders();

    // Load purchase orders
    function loadPurchaseOrders() {
        $.get(api + "purchase_orders/all")
            .done(function(data) {
                allPurchaseOrders = data;
                loadPurchaseOrderList();
            })
            .fail(function(xhr, status, error) {
                console.error('Failed to load purchase orders:', error);
                notiflix.Report.failure('Error', 'Failed to load purchase orders', 'Ok');
            });
    }

    function loadPurchaseOrderList() {
        let po_list = "";
        $("#purchase_order_list").empty();
        $("#purchaseOrderList").DataTable().destroy();

        allPurchaseOrders.forEach((order, index) => {
            let supplierName = order.supplier ? order.supplier.name : "Unknown";
            let statusBadge = getStatusBadge(order.status);

            po_list += `<tr>
                <td>${order._id}</td>
                <td>${supplierName}</td>
                <td>${moment(order.order_date).format("DD-MMM-YYYY")}</td>
                <td>${order.expected_delivery ? moment(order.expected_delivery).format("DD-MMM-YYYY") : ""}</td>
                <td>${statusBadge}</td>
                <td>${settings && settings.symbol ? (typeof safeUnescape !== 'undefined' ? safeUnescape(settings.symbol) : '$') : '$'}${order.total_cost.toFixed(2)}</td>
                <td>
                    <select class="form-control status-select" data-order-id="${order._id}">
                        <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
                        <option value="shipped" ${order.status === "shipped" ? "selected" : ""}>Shipped</option>
                        <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Delivered</option>
                        <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Cancelled</option>
                    </select>
                </td>
            </tr>`;
        });

        $("#purchase_order_list").html(po_list);
        $("#purchaseOrderList").DataTable({
            autoWidth: false,
            info: true,
            JQueryUI: true,
            ordering: true,
            paging: false,
        });
    }

    function getStatusBadge(status) {
        let badgeClass = "";
        switch(status) {
            case "pending": badgeClass = "badge-warning"; break;
            case "shipped": badgeClass = "badge-info"; break;
            case "delivered": badgeClass = "badge-success"; break;
            case "cancelled": badgeClass = "badge-danger"; break;
        }
        return `<span class="badge ${badgeClass}">${status.toUpperCase()}</span>`;
    }

    // Purchase Orders modal
    $("#purchaseOrdersModal").on("click", function() {
        loadPurchaseOrders();
    });

    // New Purchase Order modal
    $("#newPurchaseOrderModal").on("click", function() {
        $("#savePurchaseOrder").get(0).reset();
        $("#po_items_body").html(`
            <tr>
                <td><select class="form-control po_product" name="product_id[]"><option value="">Select Product</option></select></td>
                <td><input type="number" class="form-control po_quantity" name="quantity[]" min="1" placeholder="Qty"></td>
                <td><input type="number" step="0.01" class="form-control po_cost" name="unit_cost[]" min="0" placeholder="Cost"></td>
                <td><button type="button" class="btn btn-danger btn-sm remove_item">Remove</button></td>
            </tr>
        `);
        populateProductDropdowns();
    });

    function populateProductDropdowns() {
        $(".po_product").each(function() {
            $(this).html('<option value="">Select Product</option>');
            allProducts.forEach(product => {
                $(this).append(`<option value="${product._id}">${product.name}</option>`);
            });
        });
    }

    // Add item to purchase order
    $("#add_po_item").on("click", function() {
        $("#po_items_body").append(`
            <tr>
                <td><select class="form-control po_product" name="product_id[]"><option value="">Select Product</option></select></td>
                <td><input type="number" class="form-control po_quantity" name="quantity[]" min="1" placeholder="Qty"></td>
                <td><input type="number" step="0.01" class="form-control po_cost" name="unit_cost[]" min="0" placeholder="Cost"></td>
                <td><button type="button" class="btn btn-danger btn-sm remove_item">Remove</button></td>
            </tr>
        `);
        populateProductDropdowns();
    });

    // Remove item from purchase order
    $(document).on("click", ".remove_item", function() {
        $(this).closest("tr").remove();
    });

    // Submit new purchase order
    $("#savePurchaseOrder").on("submit", function(e) {
        e.preventDefault();

        let formData = {
            supplier_id: $("#po_supplier").val(),
            items: [],
            expected_delivery: $("#expected_delivery").val(),
            notes: $("#po_notes").val()
        };

        $("#po_items_body tr").each(function() {
            let product_id = $(this).find(".po_product").val();
            let quantity = $(this).find(".po_quantity").val();
            let unit_cost = $(this).find(".po_cost").val();

            if (product_id && quantity && unit_cost) {
                formData.items.push({
                    product_id: product_id,
                    quantity: parseInt(quantity),
                    unit_cost: parseFloat(unit_cost)
                });
            }
        });

        if (formData.items.length === 0) {
            notiflix.Report.warning("No items!", "Please add at least one item to the purchase order.", "Ok");
            return;
        }

        $.ajax({
            url: api + "purchase_orders/new",
            type: "POST",
            data: JSON.stringify(formData),
            contentType: "application/json; charset=utf-8",
            cache: false,
            processData: false,
            success: function(data) {
                $("#newPurchaseOrder").modal("hide");
                loadPurchaseOrders();
                notiflix.Report.success("Success!", "Purchase order created successfully!", "Ok");
            },
            error: function(xhr, status, error) {
                console.error('Failed to create purchase order:', error);
                
                let errorMessage = "Failed to create purchase order";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.status === 0) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (xhr.status >= 500) {
                    errorMessage = "Server error. Please try again later.";
                }
                
                notiflix.Report.failure(
                    "Error",
                    errorMessage,
                    "Ok"
                );
            }
        });
    });

    // Update purchase order status
    $(document).on("change", ".status-select", function() {
        let orderId = $(this).data("order-id");
        let newStatus = $(this).val();

        $.ajax({
            url: api + "purchase_orders/update-status/" + orderId,
            type: "PUT",
            data: JSON.stringify({ status: newStatus }),
            contentType: "application/json; charset=utf-8",
            cache: false,
            processData: false,
            success: function(data) {
                loadPurchaseOrders();
                notiflix.Report.success("Success!", "Purchase order status updated!", "Ok");

                // If delivered, reload products to reflect inventory changes
                if (newStatus === "delivered") {
                    loadProducts();
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to update purchase order status:', error);
                
                let errorMessage = "Failed to update purchase order status";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.status === 0) {
                    errorMessage = "Network error. Please check your connection and try again.";
                } else if (xhr.status >= 500) {
                    errorMessage = "Server error. Please try again later.";
                }
                
                notiflix.Report.failure(
                    "Error",
                    errorMessage,
                    "Ok"
                );
            }
        });
    });
});

let allPurchaseOrders = [];