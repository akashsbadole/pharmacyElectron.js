/**
 * Receipt Auto-Save Manager
 * Handles automatic saving of receipts as PDF and image formats
 */

class ReceiptManager {
  constructor() {
    this.settings = this.loadSettings();
    this.isInitialized = false;
  }

  /**
   * Initialize the receipt manager with required dependencies
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Ensure required libraries are loaded
      await this.ensureLibrariesLoaded();

      this.isInitialized = true;
      console.log('Receipt Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Receipt Manager:', error);
      throw error;
    }
  }

  /**
   * Ensure jsPDF and html2canvas libraries are loaded
   */
  async ensureLibrariesLoaded() {
    const requiredLibs = ['jsPDF', 'html2canvas'];

    for (const lib of requiredLibs) {
      if (typeof window[lib] === 'undefined') {
        console.warn(`${lib} not loaded, attempting to load...`);
        await this.loadLibrary(lib);
      }
    }
  }

  /**
   * Load a library dynamically if not already loaded
   */
  async loadLibrary(libName) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window[libName]) {
        resolve();
        return;
      }

      let scriptUrl;
      switch (libName) {
        case 'jsPDF':
          scriptUrl = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          break;
        case 'html2canvas':
          scriptUrl = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          break;
        default:
          reject(new Error(`Unknown library: ${libName}`));
          return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${libName}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Load receipt auto-save settings
   */
  loadSettings() {
    try {
      // Get settings from localStorage or API
      const stored = localStorage.getItem('receipt_auto_save_settings');
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (error) {
      console.error('Error loading receipt settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default receipt auto-save settings
   */
  getDefaultSettings() {
    return {
      enabled: true,
      save_pdf: true,
      save_image: true,
      folder_structure: 'receipts/{YYYY}/{MM}/{DD}',
      filename_pattern: 'receipt-{transaction_id}',
      image_format: 'png', // png, jpeg, webp
      image_quality: 0.95,
      pdf_format: 'a4', // a4, letter, receipt
      include_timestamp: true
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('receipt_auto_save_settings', JSON.stringify(this.settings));
  }

  /**
   * Auto-save receipt for successful transaction
   * This is called from POS after successful transaction completion
   */
  async autoSaveReceipt(transactionData, receiptHtml) {
    if (!this.settings.enabled) {
      console.log('Receipt auto-save is disabled');
      return;
    }

    try {
      await this.initialize();

      console.log('Starting receipt auto-save for transaction:', transactionData.order);

      // Generate file paths and names
      const fileInfo = this.generateFileInfo(transactionData);

      // Save PDF if enabled
      if (this.settings.save_pdf) {
        try {
          await this.saveAsPDF(receiptHtml, fileInfo);
          console.log('PDF saved:', fileInfo.pdfPath);
        } catch (pdfError) {
          console.error('PDF save failed:', pdfError);
          // Don't fail the whole process for PDF error
        }
      }

      // Save image if enabled
      if (this.settings.save_image) {
        try {
          await this.saveAsImage(receiptHtml, fileInfo);
          console.log('Image saved:', fileInfo.imagePath);
        } catch (imageError) {
          console.error('Image save failed:', imageError);
          // Don't fail the whole process for image error
        }
      }

      // Show success notification
      this.showSaveNotification(fileInfo);

    } catch (error) {
      console.error('Receipt auto-save failed:', error);
      // Show error notification but don't block transaction
      this.showErrorNotification(error);
    }
  }

  /**
   * Generate file path and name information
   */
  generateFileInfo(transactionData) {
    const now = new Date();
    const transactionId = transactionData.order || transactionData.transaction_id || `txn_${Date.now()}`;

    // Replace date placeholders in folder structure
    let folderPath = this.settings.folder_structure
      .replace('{YYYY}', now.getFullYear())
      .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('{DD}', String(now.getDate()).padStart(2, '0'));

    // Generate filename
    let filename = this.settings.filename_pattern
      .replace('{transaction_id}', transactionId)
      .replace('{timestamp}', now.getTime());

    if (this.settings.include_timestamp) {
      filename += `_${now.getTime()}`;
    }

    return {
      folderPath,
      filename,
      transactionId,
      timestamp: now.getTime(),
      pdfPath: `${folderPath}/${filename}.pdf`,
      imagePath: `${folderPath}/${filename}.${this.settings.image_format}`
    };
  }

  /**
   * Save receipt as PDF
   */
  async saveAsPDF(receiptHtml, fileInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create temporary element to render HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = receiptHtml;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = this.getPageWidth();
        document.body.appendChild(tempDiv);

        // Use html2canvas to convert HTML to canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Remove temporary element
        document.body.removeChild(tempDiv);

        // Create PDF from canvas
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: this.settings.pdf_format
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Save PDF (in Electron, this would save to file system)
        await this.saveFile(fileInfo.pdfPath, pdf.output('blob'));

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save receipt as image
   */
  async saveAsImage(receiptHtml, fileInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create temporary element to render HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = receiptHtml;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = this.getPageWidth();
        document.body.appendChild(tempDiv);

        // Use html2canvas to convert HTML to image
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Remove temporary element
        document.body.removeChild(tempDiv);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          try {
            await this.saveFile(fileInfo.imagePath, blob);
            resolve();
          } catch (saveError) {
            reject(saveError);
          }
        }, `image/${this.settings.image_format}`, this.settings.image_quality);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get appropriate page width for rendering
   */
  getPageWidth() {
    switch (this.settings.pdf_format) {
      case 'receipt':
        return '300px'; // Thermal receipt width
      case 'letter':
        return '8.5in';
      case 'a4':
      default:
        return '210mm';
    }
  }

  /**
   * Save file to file system (Electron specific)
   */
  async saveFile(filePath, blob) {
    return new Promise((resolve, reject) => {
      // In Electron environment, use fs to save file
      if (window.electronAPI && window.electronAPI.saveFile) {
        window.electronAPI.saveFile(filePath, blob)
          .then(resolve)
          .catch(reject);
      } else {
        // Fallback: create download link
        console.warn('Electron API not available, creating download link');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }
    });
  }

  /**
   * Show success notification
   */
  showSaveNotification(fileInfo) {
    if (window.notiflix) {
      let message = 'Receipt saved successfully';
      if (this.settings.save_pdf && this.settings.save_image) {
        message += ' (PDF & Image)';
      } else if (this.settings.save_pdf) {
        message += ' (PDF)';
      } else if (this.settings.save_image) {
        message += ' (Image)';
      }

      window.notiflix.Notify.success('Receipt Saved', message);
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(error) {
    if (window.notiflix) {
      window.notiflix.Notify.failure(
        'Receipt Save Failed',
        'Receipt could not be saved automatically, but transaction was completed successfully.'
      );
    }
  }

  /**
   * Generate receipt HTML from transaction data (fallback if not provided)
   */
  generateReceiptHTML(transactionData) {
    const date = new Date(transactionData.date).toLocaleDateString();
    const time = new Date(transactionData.date).toLocaleTimeString();

    return `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 10px;">
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 18px;">RECEIPT</h2>
          <p style="margin: 5px 0;">Transaction #${transactionData.order}</p>
          <p style="margin: 5px 0;">${date} ${time}</p>
        </div>

        <div style="margin-bottom: 10px;">
          ${transactionData.customer && transactionData.customer.name ?
            `<p><strong>Customer:</strong> ${transactionData.customer.name}</p>` : ''
          }
        </div>

        <div style="border-bottom: 1px solid #000; margin-bottom: 10px;">
          ${transactionData.items.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>${item.product_name}</span>
              <span>${item.quantity} x $${parseFloat(item.price).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div style="text-align: right; margin-bottom: 10px;">
          <p><strong>Total: $${parseFloat(transactionData.total).toFixed(2)}</strong></p>
          ${transactionData.payment_type ? `<p>Payment: ${transactionData.payment_type}</p>` : ''}
          ${transactionData.paid ? `<p>Paid: $${parseFloat(transactionData.paid).toFixed(2)}</p>` : ''}
          ${transactionData.change ? `<p>Change: $${parseFloat(transactionData.change).toFixed(2)}</p>` : ''}
        </div>

        <div style="text-align: center; font-size: 12px; color: #666;">
          <p>Thank you for your business!</p>
        </div>
      </div>
    `;
  }
}

// Create global instance
window.ReceiptManager = new ReceiptManager();