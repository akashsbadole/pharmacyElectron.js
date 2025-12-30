/**
 * Contact Us Module
 * Handles whitelabel contact information display and editing
 */

(function() {
    'use strict';

    let contactData = null;
    let isEditMode = false;

    /**
     * Load contact information from API
     */
    function loadContactInfo() {
        $.get(window.api + "contact/get")
            .done(function (data) {
                contactData = data;
                displayContactInfo(data);
            })
            .fail(function (xhr, status, error) {
                console.error('Failed to load contact information:', error);
                // Show empty state
                displayContactInfo(null);
            });
    }

    /**
     * Display contact information in the modal
     */
    function displayContactInfo(data) {
        if (!data || !data.contact) {
            // Show "no contact info" message
            $('.contact-info').hide();
            $('#noContactInfo').show();
            return;
        }

        const contact = data.contact;
        $('#noContactInfo').hide();
        $('.contact-info').show();

        // Display company name
        if (contact.companyName) {
            $('#displayCompanyName').text(validator.unescape(contact.companyName));
        } else {
            $('#displayCompanyName').text('');
        }

        // Display phone
        if (contact.phone) {
            $('#displayPhone').text(validator.unescape(contact.phone));
            $('#phoneRow').show();
        } else {
            $('#phoneRow').hide();
        }

        // Display email
        if (contact.email) {
            const email = validator.unescape(contact.email);
            $('#displayEmail').text(email).attr('href', 'mailto:' + email);
            $('#emailRow').show();
        } else {
            $('#emailRow').hide();
        }

        // Display website
        if (contact.website) {
            const website = validator.unescape(contact.website);
            $('#displayWebsite').text(website).attr('href', website);
            $('#websiteRow').show();
        } else {
            $('#websiteRow').hide();
        }

        // Display address
        if (contact.address) {
            $('#displayAddress').text(validator.unescape(contact.address));
            $('#addressRow').show();
        } else {
            $('#addressRow').hide();
        }

        // Display support hours
        if (contact.supportHours) {
            $('#displaySupportHours').text(validator.unescape(contact.supportHours));
            $('#hoursRow').show();
        } else {
            $('#hoursRow').hide();
        }

        // Display social media links
        let hasSocial = false;
        if (contact.facebook) {
            $('#displayFacebook').attr('href', validator.unescape(contact.facebook)).show();
            hasSocial = true;
        } else {
            $('#displayFacebook').hide();
        }

        if (contact.twitter) {
            $('#displayTwitter').attr('href', validator.unescape(contact.twitter)).show();
            hasSocial = true;
        } else {
            $('#displayTwitter').hide();
        }

        if (contact.instagram) {
            $('#displayInstagram').attr('href', validator.unescape(contact.instagram)).show();
            hasSocial = true;
        } else {
            $('#displayInstagram').hide();
        }

        if (hasSocial) {
            $('#socialRow').show();
        } else {
            $('#socialRow').hide();
        }
    }

    /**
     * Switch to edit mode
     */
    function enterEditMode() {
        isEditMode = true;

        // Hide display, show edit form
        $('#contactDisplay').hide();
        $('#contactEdit').show();

        // Hide edit button, show save/cancel buttons
        $('#editContactBtn').hide();
        $('#saveContactBtn').show();
        $('#cancelEditBtn').show();

        // Populate form with current data
        if (contactData && contactData.contact) {
            const contact = contactData.contact;
            $('#contact_id').val(contactData._id || '');
            $('#companyName').val(validator.unescape(contact.companyName || ''));
            $('#phone').val(validator.unescape(contact.phone || ''));
            $('#email').val(validator.unescape(contact.email || ''));
            $('#website').val(validator.unescape(contact.website || ''));
            $('#address').val(validator.unescape(contact.address || ''));
            $('#supportHours').val(validator.unescape(contact.supportHours || ''));
            $('#facebook').val(validator.unescape(contact.facebook || ''));
            $('#twitter').val(validator.unescape(contact.twitter || ''));
            $('#instagram').val(validator.unescape(contact.instagram || ''));
        } else {
            // Clear form for new entry
            $('#saveContact')[0].reset();
            $('#contact_id').val('');
        }
    }

    /**
     * Exit edit mode
     */
    function exitEditMode() {
        isEditMode = false;

        // Show display, hide edit form
        $('#contactDisplay').show();
        $('#contactEdit').hide();

        // Show edit button, hide save/cancel buttons
        $('#editContactBtn').show();
        $('#saveContactBtn').hide();
        $('#cancelEditBtn').hide();
    }

    /**
     * Save contact information
     */
    function saveContactInfo() {
        const formData = $('#saveContact').serializeObject();

        $.ajax({
            url: window.api + "contact/post",
            type: "POST",
            data: JSON.stringify(formData),
            contentType: "application/json; charset=utf-8",
            cache: false,
            success: function (response) {
                notiflix.Notify.success('Contact information saved successfully');
                exitEditMode();
                loadContactInfo();
            },
            error: function (xhr, status, error) {
                console.error('Failed to save contact information:', error);
                notiflix.Report.failure(
                    'Error',
                    'Failed to save contact information. Please try again.',
                    'Ok'
                );
            }
        });
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Load contact info when modal is opened
        $('#contactModal').on('show.bs.modal', function () {
            loadContactInfo();
            exitEditMode(); // Always start in display mode
        });

        // Edit button click
        $('#editContactBtn').on('click', function () {
            enterEditMode();
        });

        // Save button click
        $('#saveContactBtn').on('click', function () {
            saveContactInfo();
        });

        // Cancel button click
        $('#cancelEditBtn').on('click', function () {
            exitEditMode();
        });

        // Reset form when modal is closed
        $('#contactModal').on('hidden.bs.modal', function () {
            exitEditMode();
        });
    }

    // Initialize when DOM is ready
    $(document).ready(function () {
        initializeEventListeners();
    });

})();
