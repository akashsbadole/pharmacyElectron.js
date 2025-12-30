
$(document).ready(function() {
    
    // Load Prescriptions when modal opens
    $('#Prescriptions').on('shown.bs.modal', function () {
        loadPrescriptions();
        loadCustomersForPrescription();
    });

    // New Prescription Button
    $('#btnNewPrescription').click(function() {
        $('#formPrescription')[0].reset();
        $('#presc_customer').val('');
        $('#newPrescriptionModal').modal('show');
    });

    // Save Prescription
    $('#formPrescription').submit(function(e) {
        e.preventDefault();
        
        let formData = new FormData(this);
        
        $.ajax({
            url: window.api + 'prescriptions/upload',
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                $('#newPrescriptionModal').modal('hide');
                notiflix.Report.success('Success', 'Prescription uploaded successfully', 'Ok');
                loadPrescriptions();
            },
            error: function(xhr) {
                console.error(xhr);
                notiflix.Report.failure('Error', 'Failed to upload prescription', 'Ok');
            }
        });
    });
});

function loadPrescriptions(customerId = null) {
    let url = window.api + 'prescriptions/all';
    if (customerId) {
        url += '?customerId=' + customerId;
    }

    $.get(url, function(data) {
        let html = '';
        if (data.length === 0) {
            html = '<tr><td colspan="5" class="text-center">No prescriptions found.</td></tr>';
        } else {
            data.forEach(p => {
                let viewUrl = window.api + 'prescriptions/view/' + p._id;
                // Assuming customers are loaded in memory or we fetch name? 
                // For now, display ID or try to find in window.allUsers/allCustomers if available.
                // In pos.js, window.allCustomers might not be global. 
                // We'll just show ID or do a lookup if we have the list.
                let customerName = p.customer_id; 
                // Try to find name if possible (this assumes we have a way, otherwise just ID)
                
                html += `
                    <tr>
                        <td>${new Date(p.date).toLocaleDateString()}</td>
                        <td>${customerName}</td>
                        <td>${p.doctor_name || '-'}</td>
                        <td>${p.notes || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="viewPrescription('${p._id}')"><i class="fa fa-eye"></i> View</button>
                            <button class="btn btn-sm btn-danger" onclick="deletePrescription('${p._id}')"><i class="fa fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        $('#prescription_table_body').html(html);
    });
}

function loadCustomersForPrescription() {
    $.get(window.api + 'customers/all', function(customers) {
        let opts = '<option value="">Select Patient</option>';
        customers.forEach(c => {
            opts += `<option value="${c._id}">${c.name}</option>`;
        });
        $('#presc_customer').html(opts);
    });
}

function viewPrescription(id) {
     // Open in new window or use a modal to show image/pdf
     // Since it's Electron, we can maybe shell.openExternal or just window.open
     window.open(window.api + 'prescriptions/view/' + id, '_blank');
}

function deletePrescription(id) {
    notiflix.Confirm.show(
        'Delete Prescription',
        'Are you sure you want to delete this prescription?',
        'Yes', 'No',
        function() {
            $.ajax({
                url: window.api + 'prescriptions/delete/' + id,
                type: 'DELETE',
                success: function() {
                    loadPrescriptions();
                    notiflix.Report.success('Deleted', 'Prescription deleted.', 'Ok');
                }
            });
        }
    );
}

// Doctor-wise Prescription Report
function loadDoctorReports() {
    $.get(window.api + 'prescriptions/reports/doctor-wise', function(data) {
        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item._id}</td>
                    <td>${item.count}</td>
                    <td>${settings && settings.symbol ? (typeof safeUnescape !== 'undefined' ? safeUnescape(settings.symbol) : '$') : '$'}${moneyFormat(item.totalSales)}</td>
                    <td><button class="btn btn-sm btn-primary" onclick="viewDoctorPrescriptions('${item._id}')">View Details</button></td>
                </tr>
            `;
        });
        $('#doctor_report_data').html(html);
    }).fail(function() {
        notiflix.Report.failure('Error', 'Failed to load doctor reports.', 'Ok');
    });
}

// Regulatory / Restricted Drug Report
function loadRegulatoryReports() {
    $.get(window.api + 'transactions/reports/regulatory/restricted', function(data) {
        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>${moment(item.date).format('DD-MMM-YYYY HH:mm')}</td>
                    <td>${item.order}</td>
                    <td>${item.doctor_name || '-'}</td>
                    <td><span class="badge badge-danger">${item.drug_schedule || 'RESTRICTED'}</span></td>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                </tr>
            `;
        });
        $('#regulatory_report_data').html(html);
    }).fail(function() {
        notiflix.Report.failure('Error', 'Failed to load regulatory reports.', 'Ok');
    });
}

// Event Listeners for Tab Switching
$(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
    let target = $(e.target).attr("href");
    if (target === '#prescription-tab') {
        loadDoctorReports();
    } else if (target === '#compliance-tab') {
        loadRegulatoryReports();
    }
});

function viewDoctorPrescriptions(doctorName) {
    notiflix.Report.info('Coming Soon', 'Detailed view for doctor prescriptions will be implemented soon.', 'Ok');
}
