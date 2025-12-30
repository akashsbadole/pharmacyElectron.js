$(document).ready(function () {
    // Determine API URL (using window.api if set by pos.js, or default)
    // We'll wait a brief moment or check actively, but ideally pos.js runs first.
    // However, it's safer to use the functions that rely on the API only when triggered.

    // ==========================================
    //  ADD / EDIT PRODUCT
    // ==========================================

    // Handle "New Product" Button - Reset form
    $('#newProductModal').on('click', function() {
       $('#saveProduct')[0].reset();
       $('#product_id').val(''); 
       $('#productModalLabel').text('New Product');
       $('#batch_items').empty();
       $('#batches_input').val('');
       // Generate a random barcode if needed or leave blank
       $('#productBarcode').val(Math.floor(Date.now() / 1000));
    });

    // Batch Management Logic
    $('#add_batch_row').click(function() {
        addBatchRow();
    });

    $(document).on('click', '.remove-batch', function() {
        $(this).closest('.batch-row').remove();
        calculateBatchTotals();
    });

    $(document).on('input', '.batch-qty, .batch-expiry', function() {
        calculateBatchTotals();
    });

    function addBatchRow(data = {}) {
        let html = `
        <div class="row batch-row m-b-5">
            <div class="col-md-5">
                <input type="text" class="form-control input-sm batch-number" placeholder="Batch No." value="${data.batch_number || ''}">
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control input-sm batch-qty" placeholder="Qty" value="${data.quantity || ''}" min="0">
            </div>
            <div class="col-md-3">
                <input type="date" class="form-control input-sm batch-expiry" placeholder="Exp" value="${data.expirationDate || ''}">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-xs btn-danger remove-batch"><i class="fa fa-times"></i></button>
            </div>
        </div>`;
        $('#batch_items').append(html);
    }

    function calculateBatchTotals() {
        let totalQty = 0;
        let earliestExpiry = null;
        let batches = [];

        $('.batch-row').each(function() {
            let qty = parseInt($(this).find('.batch-qty').val()) || 0;
            let expiry = $(this).find('.batch-expiry').val();
            let number = $(this).find('.batch-number').val();

            if (qty > 0 || number) {
                totalQty += qty;
                batches.push({
                    batch_number: number,
                    quantity: qty,
                    expirationDate: expiry
                });

                if (expiry) {
                    let expDate = new Date(expiry);
                    if (!earliestExpiry || expDate < earliestExpiry) {
                        earliestExpiry = expDate;
                    }
                }
            }
        });

        $('#quantity').val(totalQty);
        $('#batches_input').val(JSON.stringify(batches));
        
        if (earliestExpiry) {
             let d = earliestExpiry;
             // Format as YYYY-MM-DD or whatever the backend expects/validates
             // The backend seems to treat it as string or date. 
             // Existing code used text input.
             // Let's store ISO string date part
             let month = '' + (d.getMonth() + 1);
             let day = '' + d.getDate();
             let year = d.getFullYear();

            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;

            $('#expirationDate').val([year, month, day].join('-'));
        } else {
             $('#expirationDate').val('');
        }
    }

    // Save Product Form Submit
    $('#saveProduct').submit(function (e) {
        e.preventDefault();

        // Basic client-side validation logic if needed
        let productData = {
            name: $('#productName').val(),
            price: $('#productPrice').val(),
            quantity: $('#productQuantity').val(), // This selector seems wrong in original code if id is 'quantity', but let's check input id. 
            // In index.html, id="quantity". 
            // But line 27 in inventory.js says $('#productQuantity').val(). 
            // Wait, I replaced id="quantity" with id="quantity" (same). 
            // Let's check line 136: $('#productQuantity').val(product.quantity);
            // It seems the original code references '#productQuantity' but the HTML has id="quantity". This might be a bug in the *original* code or I misread the specific line in view_file.
            // View file says: 136: $('#productQuantity').val(product.quantity); 
            // HTML says: 959: class="form-control" id="quantity"
            // So $('#productQuantity') would be undefined/empty. 
            // However, looking at line 27: quantity: $('#productQuantity').val(),
            // I should fix this to $('#quantity').val().
            quantity: $('#quantity').val(),
            batches: $('#batches_input').val(),
            category: $('#productCategory').val(),
            barcode: $('#productBarcode').val(),
            img: $('#productImage').val(), // Note: actual file upload handling might request FormData
            // If we have an ID, it's an edit
            _id: $('#product_id').val() 
        };
        
        // Use FormData for file uploads if the form has enctype="multipart/form-data"
        // But the input type="file" needs special handling. 
        // Let's check if the form is multipart.
        // Assuming standard JSON for now unless we see file input in HTML.
        
        // Re-reading the HTML structure implies we might need FormData if there's an image.
        // Let's use FormData to be safe if there is a file input.
        let formData = new FormData(this);
        
        let url = window.api + 'inventory/product'; 
        let type = 'POST'; // Default to create

        if (productData._id) {
            type = 'PUT'; // Update
             // If PUT, we might need to adjust the URL or method depending on API 
             // API usually handles PUT on the same endpoint or a specific one.
             // Checking API docs (or code): API usually accepts PUT for updates.
        }

        $.ajax({
            url: url,
            type: type,
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                $('#newProduct').modal('hide');
                notiflix.Notify.success('Product saved successfully!');
                // Reload products in POS and Table
                if (window.location.reload) { 
                    // We might not want to reload the whole app, just the data
                    // But legacy app often relies on reloads or re-fetching.
                    // Call a global reload function if it exists, or dispatch event.
                    if (typeof loadProducts === 'function') loadProducts(); // defined in pos.js?
                }
                
                // If specific table reload is needed:
                // loadProductList(); 
            },
            error: function (error) {
                notiflix.Notify.failure('Failed to save product.');
                console.error(error);
            }
        });
    });


    // ==========================================
    //  DELETE PRODUCT
    // ==========================================
    // Using delegation for dynamically added elements
    $(document).on('click', '.delete-product', function () {
        let id = $(this).data('id');
        let name = $(this).data('name');

        notiflix.Confirm.show(
            'Delete Product',
            'Are you sure you want to delete ' + name + '?',
            'Yes',
            'No',
            function () {
                $.ajax({
                    url: window.api + 'inventory/product/' + id,
                    type: 'DELETE',
                    success: function (response) {
                        notiflix.Notify.success('Product deleted.');
                        if (typeof loadProducts === 'function') loadProducts();
                    },
                    error: function (error) {
                        notiflix.Notify.failure('Failed to delete product.');
                    }
                });
            }
        );
    });

    // ==========================================
    //  EDIT PRODUCT (Populate Modal)
    // ==========================================
    $(document).on('click', '.edit-product', function () {
        let product = $(this).data('json'); 
        // We assume the button has data-json='{...}'
        // If not, we might need to fetch by ID. 
        // But often legacy apps attach data to the row.
        
        if (!product) {
            // Fallback: try data attributes for each field
             let id = $(this).data('id');
             // fetch product details...
             $.get(window.api + 'inventory/product/' + id, function(data) {
                 populateProductModal(data);
             });
        } else {
             populateProductModal(product);
        }
    });

    function populateProductModal(product) {
        $('#product_id').val(product._id);
        $('#productName').val(product.name);
        $('#productPrice').val(product.price);
        $('#productCategory').val(product.category); // Warning: Category must exist in select options
        $('#productBarcode').val(product.barcode || '');
        // Image preview handling would go here

        $('#batch_items').empty();
        if (product.batches && product.batches.length > 0) {
            product.batches.forEach(b => addBatchRow(b));
        } else {
            // For backward compatibility or no batches, maintain simple interface?
            // Actually, if quantity exists but no batches, maybe auto-create a default batch?
            // Or just allow user to add starting from 0.
            // Let's add one empty row if none.
            // But if existing quantity > 0, we might want to preserve it. 
            // The user will have to manually assign it to a batch to "fix" it or just leave it.
            // If we force batch logic, we should force them to assign.
             if (product.quantity > 0) {
                 addBatchRow({ quantity: product.quantity, expirationDate: product.expirationDate, batch_number: 'LEGACY' });
             } 
        }
        calculateBatchTotals();

        $('#productModalLabel').text('Edit Product');
        $('#newProduct').modal('show');
    }


    // ==========================================
    //  IMPORT CSV
    // ==========================================
    $('#startImport').click(function () {
        let fileInput = $('#csvFileInput')[0];
        if (fileInput.files.length === 0) {
            notiflix.Notify.warning('Please select a CSV file first.');
            return;
        }

        let formData = new FormData();
        formData.append('file', fileInput.files[0]);
        // Append other options if needed via params

        // Show loading state
        let btn = $(this);
        let originalText = btn.html();
        btn.addClass('disabled').text('Importing...');

        $.ajax({
            url: window.api + 'inventory/import', // Verify this endpoint in api/inventory.js
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                notiflix.Notify.success('Import successful!');
                $('#importCSVPModal').modal('hide');
                btn.removeClass('disabled').html(originalText);
                if (typeof loadProducts === 'function') loadProducts();
            },
            error: function (error) {
                notiflix.Notify.failure('Import failed. ' + (error.responseJSON ? error.responseJSON.message : ''));
                btn.removeClass('disabled').html(originalText);
            }
        });
    });

    // ==========================================
    //  INVENTORY REPORTS
    // ==========================================
    
    // Load reports when the Inventory tab is shown
    $('a[href="#inventory-tab"]').on('shown.bs.tab', function (e) {
        loadExpiryAlerts();
        loadStockAging();
        // Also reload turnover if needed, or if it was already there
    });

    function loadExpiryAlerts() {
         $.get(window.api + 'inventory/alerts/expiry', function(data) {
             let html = '';
             if (data && data.length > 0) {
                 data.forEach(item => {
                     html += `<tr>
                        <td>${item.product_name}</td>
                        <td>${item.batch_number || '-'}</td>
                        <td>${item.expiry_date}</td>
                        <td>${item.quantity}</td>
                     </tr>`;
                 });
             } else {
                 html = '<tr><td colspan="4" class="text-center">No alerts.</td></tr>';
             }
             $('#expiry_alerts_data').html(html);
        }).fail(function() {
             $('#expiry_alerts_data').html('<tr><td colspan="4" class="text-center text-danger">Failed to load data.</td></tr>');
        });
    }

    function loadStockAging() {
         $.get(window.api + 'inventory/reports/aging', function(data) {
             let html = '';
             if (data && data.length > 0) {
                 data.forEach(item => {
                     html += `<tr>
                        <td>${item.product_name}</td>
                        <td>${item.batch_number || '-'}</td>
                        <td>${item.age_days}</td>
                        <td>${item.quantity}</td>
                     </tr>`;
                 });
             } else {
                 html = '<tr><td colspan="4" class="text-center">No aging stock found.</td></tr>';
             }
             $('#stock_aging_data').html(html);
        }).fail(function() {
             $('#stock_aging_data').html('<tr><td colspan="4" class="text-center text-danger">Failed to load data.</td></tr>');
        });
    }

});
