// Dependencies loaded globally via bundle.min.js and renderer.js

let allSuppliers = [];

// Function to populate supplier dropdowns - moved outside document.ready
function populateSupplierDropdowns() {
    // Populate supplier dropdown in new product modal
    $("#supplier").html('<option value="">Select Supplier</option>');
    allSuppliers.forEach(supplier => {
        $("#supplier").append(`<option value="${supplier._id}">${supplier.name}</option>`);
    });

    // Populate supplier dropdown in purchase order modal
    $("#po_supplier").html('<option value="">Select Supplier</option>');
    allSuppliers.forEach(supplier => {
        $("#po_supplier").append(`<option value="${supplier._id}">${supplier.name}</option>`);
    });
}

// Load supplier list for Suppliers modal
function loadSupplierList() {
    let supplier_list = "";
    $("#supplier_list").empty();

    // Check if DataTable exists before destroying
    if ($.fn.DataTable && $.fn.DataTable.isDataTable('#supplierList')) {
        $("#supplierList").DataTable().destroy();
    }

    allSuppliers.forEach((supplier, index) => {
        supplier_list += `<tr>
            <td>${supplier.name}</td>
            <td>${supplier.contact_person || ''}</td>
            <td>${supplier.phone || ''}</td>
            <td>${supplier.email || ''}</td>
            <td>
                <span class="btn-group">
                    <button onClick="$(this).editSupplier(${index})" class="btn btn-warning btn-sm"><i class="fa fa-edit"></i></button>
                    <button onClick="$(this).deleteSupplier('${supplier._id}')" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button>
                </span>
            </td>
        </tr>`;
    });

    $("#supplier_list").html(supplier_list);
    if ($.fn.DataTable) {
        $("#supplierList").DataTable({
            autoWidth: false,
            info: true,
            JQueryUI: true,
            ordering: true,
            paging: false,
        });
    }
}

// Load suppliers into dropdowns
function loadSuppliers() {
    $.get(window.api + "suppliers")
        .done(function (data) {
            allSuppliers = data;
            populateSupplierDropdowns();
            loadSupplierList();
        })
        .fail(function (xhr, status, error) {
            console.error('Failed to load suppliers:', error);
            notiflix.Report.failure('Error', 'Failed to load suppliers', 'Ok');
        });
}

// Function to initialize suppliers functionality when API is ready
function initializeSuppliers() {
    if (window.api && window.api !== "http://localhost:undefined/api/") {
        console.log('API ready for suppliers:', window.api);
        loadSuppliers();
    } else {
        console.log('API not ready yet for suppliers, waiting...');
        setTimeout(initializeSuppliers, 100);
    }
}

// Listen for API configuration
window.addEventListener('api-configured', () => {
    console.log('API configured, initializing suppliers...');
    initializeSuppliers();
});

// If API is already configured, initialize immediately
$(document).ready(function () {
    if (window.api && window.api !== "http://localhost:undefined/api/") {
        initializeSuppliers();
    } else {
        // Wait for API configuration
        setTimeout(initializeSuppliers, 500);
    }

    // Supplier CRUD handlers
    $("#suppliersModal").on("click", function () {
        loadSupplierList();
    });

    $("#newSupplierModal").on("click", function () {
        $("#saveSupplier").get(0).reset();
        $("#supplier_id").val("");
    });

    $("#saveSupplier").on("submit", function (e) {
        e.preventDefault();
        let formData = $(this).serializeObject();

        let method = formData.id ? "PUT" : "POST";
        let url = formData.id ? window.api + "suppliers/" + formData.id : window.api + "suppliers";

        delete formData.id; // Remove id from body for PUT

        $.ajax({
            url: url,
            type: method,
            data: JSON.stringify(formData),
            contentType: "application/json; charset=utf-8",
            cache: false,
            processData: false,
            success: function (data) {
                $("#newSupplier").modal("hide");
                loadSuppliers();
                notiflix.Report.success("Success!", "Supplier saved successfully!", "Ok");
            },
            error: function (xhr, status, error) {
                console.error('Failed to save supplier:', error);
                
                let errorMessage = "Failed to save supplier";
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

    $.fn.editSupplier = function (index) {
        $("#Suppliers").modal("hide");

        let supplier = allSuppliers[index];
        $("#supplier_id").val(supplier._id);
        $("#supplierName").val(supplier.name);
        $("#contactPerson").val(supplier.contact_person);
        $("#supplierPhone").val(supplier.phone);
        $("#supplierEmail").val(supplier.email);
        $("#supplierAddress").val(supplier.address);
        $("#paymentTerms").val(supplier.payment_terms);

        $("#newSupplier").modal("show");
    };

    $.fn.deleteSupplier = function (id) {
        notiflix.Confirm.show(
            "Are you sure?",
            "You are about to delete this supplier.",
            "Yes, delete it!",
            "Cancel",
            () => {
                $.ajax({
                    url: window.api + "suppliers/" + id,
                    type: "DELETE",
                    success: function (result) {
                        loadSuppliers();
                        notiflix.Report.success("Deleted!", "Supplier deleted", "Ok");
                    },
                    error: function (xhr, status, error) {
                        console.error('Failed to delete supplier:', error);
                        
                        let errorMessage = "Failed to delete supplier";
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
            }
        );
    };
});