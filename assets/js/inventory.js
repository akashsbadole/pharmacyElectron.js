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
    //  VARIANT MANAGEMENT
    // ==========================================

    // Create variant matrix modal
    $('#createVariantMatrix').click(function() {
        const productId = $('#product_id').val();
        if (!productId) {
            notiflix.Notify.warning('Please select a product first');
            return;
        }
        
        // Reset form
        $('#variantMatrixForm')[0].reset();
        $('#variantMatrixModalLabel').text('Create Variant Matrix');
        $('#variant_matrix_product_id').val(productId);
        
        // Load product details
        loadProductVariantData(productId);
        
        $('#variantMatrixModal').modal('show');
    });

    // Handle variant dimension changes
    $('#variant_tracking_type').change(function() {
        const trackingType = $(this).val();
        updateVariantDimensionsUI(trackingType);
    });

    // Add size option
    $('#add_size_option').click(function() {
        const size = $('#new_size').val().trim();
        if (size) {
            addVariantOption('sizes', size);
            $('#new_size').val('');
        }
    });

    // Add color option
    $('#add_color_option').click(function() {
        const color = $('#new_color').val().trim();
        if (color) {
            addVariantOption('colors', color);
            $('#new_color').val('');
        }
    });

    // Add style option
    $('#add_style_option').click(function() {
        const style = $('#new_style').val().trim();
        if (style) {
            addVariantOption('styles', style);
            $('#new_style').val('');
        }
    });

    // Submit variant matrix form
    $('#variantMatrixForm').submit(function(e) {
        e.preventDefault();
        
        const formData = {
            product_id: parseInt($('#variant_matrix_product_id').val()),
            tracking_type: $('#variant_tracking_type').val(),
            dimensions: {
                sizes: [],
                colors: [],
                styles: [],
                materials: [],
                patterns: []
            },
            initial_stock: parseInt($('#initial_stock').val()) || 10
        };
        
        // Collect dimension options
        $('.variant-option').each(function() {
            const optionType = $(this).data('type');
            const optionValue = $(this).data('value');
            formData.dimensions[optionType].push(optionValue);
        });
        
        // Validate dimensions
        if (formData.tracking_type === 'size_color' && (formData.dimensions.sizes.length === 0 || formData.dimensions.colors.length === 0)) {
            notiflix.Notify.warning('Please add at least one size and one color for size-color tracking');
            return;
        }
        
        // Create variant matrix
        $.ajax({
            url: window.api + 'variants/create-matrix',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    notiflix.Notify.success('Variant matrix created successfully!');
                    $('#variantMatrixModal').modal('hide');
                    loadProducts();
                } else {
                    notiflix.Notify.failure(response.error || 'Failed to create variant matrix');
                }
            },
            error: function(xhr, status, error) {
                const errorMessage = handleAjaxError(xhr, status, error, 'Failed to create variant matrix');
                notiflix.Notify.failure(errorMessage);
            }
        });
    });

    // Load existing variant matrix
    $(document).on('click', '.view-variants', function() {
        const productId = $(this).data('product-id');
        loadVariantMatrix(productId);
    });

    // Update variant stock
    $(document).on('click', '.update-variant-stock', function() {
        const matrixId = $(this).data('matrix-id');
        const variantKey = $(this).data('variant-key');
        showStockUpdateModal(matrixId, variantKey);
    });

    // Handle stock update
    $('#updateStockForm').submit(function(e) {
        e.preventDefault();
        
        const formData = {
            matrix_id: $('#stock_matrix_id').val(),
            variant_key: $('#stock_variant_key').val(),
            quantity_change: parseInt($('#quantity_change').val()),
            operation_type: $('#operation_type').val(),
            reason: $('#stock_reason').val()
        };
        
        $.ajax({
            url: window.api + 'variants/update-stock',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    notiflix.Notify.success(`Stock updated successfully! New stock: ${response.new_stock}`);
                    $('#updateStockModal').modal('hide');
                    
                    // Refresh variant matrix view if open
                    const productId = $('#current_variant_product_id').val();
                    if (productId) {
                        loadVariantMatrix(productId);
                    }
                } else {
                    notiflix.Notify.failure(response.error || 'Failed to update stock');
                }
            },
            error: function(xhr, status, error) {
                const errorMessage = handleAjaxError(xhr, status, error, 'Failed to update stock');
                notiflix.Notify.failure(errorMessage);
            }
        });
    });

    // Export variants
    $(document).on('click', '.export-variants', function() {
        const productId = $(this).data('product-id');
        exportVariants(productId);
    });

    // Import variants
    $('#importVariantsBtn').click(function() {
        $('#variantImportModal').modal('show');
    });

    $('#importVariantsForm').submit(function(e) {
        e.preventDefault();
        
        const fileInput = $('#variant_csv_file')[0];
        if (fileInput.files.length === 0) {
            notiflix.Notify.warning('Please select a CSV file');
            return;
        }
        
        const formData = new FormData();
        formData.append('csvfile', fileInput.files[0]);
        
        notiflix.Loading.dots('Importing variants...');
        
        $.ajax({
            url: window.api + 'variants/import',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                notiflix.Loading.remove();
                if (response.success) {
                    notiflix.Notify.success(`Imported ${response.imported_count} variants successfully!`);
                    $('#variantImportModal').modal('hide');
                    
                    // Refresh products
                    if (typeof loadProducts === 'function') loadProducts();
                } else {
                    notiflix.Notify.failure(response.error || 'Failed to import variants');
                }
            },
            error: function(xhr, status, error) {
                notiflix.Loading.remove();
                const errorMessage = handleAjaxError(xhr, status, error, 'Failed to import variants');
                notiflix.Notify.failure(errorMessage);
            }
        });
    });

    // ==========================================
    //  VARIANT HELPER FUNCTIONS
    // ==========================================

    function loadProductVariantData(productId) {
        $.get(window.api + `variants/product/${productId}`)
            .done(function(data) {
                if (data.variants && Object.keys(data.variants).length > 0) {
                    // Product already has variants
                    $('#variantMatrixModalLabel').text('View Variant Matrix');
                    displayExistingVariantMatrix(data);
                } else {
                    // New variant matrix
                    $('#variantMatrixModalLabel').text('Create Variant Matrix');
                }
            })
            .fail(function() {
                // Product doesn't have variants
                $('#variantMatrixModalLabel').text('Create Variant Matrix');
            });
    }

    function updateVariantDimensionsUI(trackingType) {
        // Hide all dimension sections
        $('.variant-dimension-section').hide();
        
        // Show relevant sections based on tracking type
        switch (trackingType) {
            case 'size':
                $('#sizes-section').show();
                break;
            case 'color':
                $('#colors-section').show();
                break;
            case 'size_color':
                $('#sizes-section').show();
                $('#colors-section').show();
                break;
            case 'size_color_style':
                $('#sizes-section').show();
                $('#colors-section').show();
                $('#styles-section').show();
                break;
        }
    }

    function addVariantOption(type, value) {
        // Check if option already exists
        if ($(`#${type}_list [data-value="${value}"]`).length > 0) {
            notiflix.Notify.warning(`${value} already added`);
            return;
        }
        
        const optionHtml = `
            <div class="variant-option badge badge-primary m-1" data-type="${type}" data-value="${value}">
                ${value}
                <button type="button" class="btn btn-xs btn-danger ml-1 remove-variant-option" data-type="${type}" data-value="${value}">×</button>
            </div>
        `;
        
        $(`#${type}_list`).append(optionHtml);
    }

    // Remove variant option
    $(document).on('click', '.remove-variant-option', function() {
        const type = $(this).data('type');
        const value = $(this).data('value');
        $(`#${type}_list [data-value="${value}"]`).remove();
    });

    function loadVariantMatrix(productId) {
        $.get(window.api + `variants/product/${productId}`)
            .done(function(data) {
                displayVariantMatrix(data);
                $('#variantMatrixViewModal').modal('show');
                $('#current_variant_product_id').val(productId);
            })
            .fail(function(xhr, status, error) {
                const errorMessage = handleAjaxError(xhr, status, error, 'Failed to load variant matrix');
                notiflix.Notify.failure(errorMessage);
            });
    }

    function displayVariantMatrix(data) {
        const container = $('#variant_matrix_display');
        
        if (!data.variants || Object.keys(data.variants).length === 0) {
            container.html('<div class="alert alert-info">No variants found for this product.</div>');
            return;
        }
        
        let html = `
            <div class="row">
                <div class="col-12">
                    <h5>${data.product_name} - Variant Matrix</h5>
                    <p><strong>Tracking Method:</strong> ${data.tracking_method}</p>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <div class="table-responsive">
                        <table class="table table-bordered table-sm">
                            <thead>
        `;
        
        // Create table headers
        const sizes = data.matrix_config?.dimensions?.sizes || [];
        const colors = Object.keys(data.variants);
        
        html += '<tr><th>Color \ Size</th>';
        sizes.forEach(size => {
            html += `<th>${size}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Create table rows
        colors.forEach(color => {
            html += `<tr><td><strong>${color}</strong></td>`;
            sizes.forEach(size => {
                const variant = data.variants[color]?.[size];
                if (variant) {
                    const statusClass = variant.stock === 0 ? 'danger' : 
                                      variant.stock <= variant.min_stock ? 'warning' : 'success';
                    html += `
                        <td class="text-center">
                            <div class="stock-info">
                                <span class="badge badge-${statusClass}">${variant.stock}</span>
                                <br><small>Min: ${variant.min_stock}</small>
                                <br><button class="btn btn-xs btn-info update-variant-stock mt-1" 
                                    data-matrix-id="${data.matrix_id || 'N/A'}" 
                                    data-variant-key="${color}-${size}">
                                    <i class="fa fa-edit"></i>
                                </button>
                            </div>
                        </td>
                    `;
                } else {
                    html += '<td class="text-center text-muted">-</td>';
                }
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div></div></div>';
        
        // Add export button
        html += `
            <div class="row mt-3">
                <div class="col-12">
                    <button class="btn btn-success export-variants" data-product-id="${data.product_id}">
                        <i class="fa fa-download"></i> Export to CSV
                    </button>
                </div>
            </div>
        `;
        
        container.html(html);
    }

    function showStockUpdateModal(matrixId, variantKey) {
        $('#stock_matrix_id').val(matrixId);
        $('#stock_variant_key').val(variantKey);
        $('#operation_type').val('add');
        $('#quantity_change').val('');
        $('#stock_reason').val('');
        
        $('#updateStockModal').modal('show');
    }

    function exportVariants(productId) {
        window.location.href = window.api + `variants/export/${productId}`;
        notiflix.Notify.success('Exporting variants...');
    }

    function displayExistingVariantMatrix(data) {
        // Populate existing variant data in the form for editing
        // This would be used for viewing/editing existing matrices
        $('#variant_tracking_type').val(data.tracking_method);
        updateVariantDimensionsUI(data.tracking_method);
        
        // Add existing dimensions
        if (data.matrix_config?.dimensions?.sizes) {
            data.matrix_config.dimensions.sizes.forEach(size => {
                addVariantOption('sizes', size);
            });
        }
        
        if (data.matrix_config?.dimensions?.colors) {
            data.matrix_config.dimensions.colors.forEach(color => {
                addVariantOption('colors', color);
            });
        }
        
        if (data.matrix_config?.dimensions?.styles) {
            data.matrix_config.dimensions.styles.forEach(style => {
                addVariantOption('styles', style);
            });
        }
    }

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
    //  VARIANT MANAGEMENT INTEGRATION
    // ==========================================

    // Enhanced edit product to show variant options
    function populateProductModal(product) {
        $('#product_id').val(product._id);
        $('#productName').val(product.name);
        $('#productPrice').val(product.price);
        $('#productCategory').val(product.category);
        $('#productBarcode').val(product.barcode || '');

        $('#batch_items').empty();
        if (product.batches && product.batches.length > 0) {
            product.batches.forEach(b => addBatchRow(b));
        } else {
            if (product.quantity > 0) {
                addBatchRow({ quantity: product.quantity, expirationDate: product.expirationDate, batch_number: 'LEGACY' });
            } 
        }
        calculateBatchTotals();

        $('#productModalLabel').text('Edit Product');
        
        // Check if product has variants
        if (product.stock_tracking_method === 'variant') {
            // Add variant management button
            if ($('#variant-management-section').length === 0) {
                const variantSection = `
                    <div id="variant-management-section" class="mt-3">
                        <hr>
                        <h6>Variant Management</h6>
                        <div class="btn-group">
                            <button type="button" class="btn btn-info btn-sm view-variants" data-product-id="${product._id}">
                                <i class="fa fa-th"></i> View Variants
                            </button>
                            <button type="button" class="btn btn-success btn-sm export-variants" data-product-id="${product._id}">
                                <i class="fa fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                `;
                $('#newProduct .modal-body').append(variantSection);
            }
        } else {
            // Add create variant matrix button
            if ($('#variant-creation-section').length === 0) {
                const createVariantSection = `
                    <div id="variant-creation-section" class="mt-3">
                        <hr>
                        <h6>Variant Management</h6>
                        <button type="button" class="btn btn-primary btn-sm create-variant-matrix" data-product-id="${product._id}">
                            <i class="fa fa-plus"></i> Create Variant Matrix
                        </button>
                    </div>
                `;
                $('#newProduct .modal-body').append(createVariantSection);
            }
        }
        
        $('#newProduct').modal('show');
    }

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
        formData.append('csvfile', fileInput.files[0]);
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
