# GarmentPOS Installation Guide

## Quick Installation (Windows)

### Simple Setup - No Installation Required!

1. **Download**: Get `garmentpos-v1.5.1-win64.zip` from the [Releases page](../../releases)
2. **Extract**: Unzip the file to any folder (Desktop, Documents, etc.)
3. **Run**: Double-click `garmentpos.exe` in the extracted folder
4. **Start**: Your Point of Sale system is ready to use!

## System Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **RAM**: Minimum 4GB recommended
- **Storage**: 200MB free space
- **Internet**: Required only for initial setup and updates
- **Additional Software**: None required

## Step-by-Step Installation

### Step 1: Download the Application
1. Visit the GitHub repository releases page
2. Download `garmentpos-v1.5.1-win64.zip`
3. Save it to your Downloads folder

### Step 2: Extract the Files
1. Right-click on the downloaded ZIP file
2. Select "Extract All..." or use your preferred unzip program
3. Choose where to extract (e.g., `C:\GarmentPOS\` or your Desktop)
4. Click "Extract"

### Step 3: Run the Application
1. Open the extracted folder `garmentpos-v1.5.1-win64`
2. Double-click `garmentpos.exe`
3. If Windows shows a security warning:
   - Click "More info"
   - Click "Run anyway"
4. The application will start

### Step 4: First Time Setup
- The application will create necessary database files automatically
- No registration or account creation required
- You can start adding products and processing transactions immediately

## Features Available Out of the Box

- **Point of Sale**: Process sales transactions
- **Inventory Management**: Add and manage products
- **Customer Database**: Store customer information
- **Receipt Printing**: Generate and print receipts
- **Sales Reports**: View transaction history
- **Barcode Scanning**: Support for barcode readers
- **Multiple Payment Methods**: Cash, card, UPI support

## Troubleshooting

### App Won't Start
- Ensure Windows Defender or antivirus isn't blocking the app
- Try running as administrator (right-click → "Run as administrator")
- Make sure you extracted all files from the ZIP

### Performance Issues
- Close other running applications
- Ensure sufficient disk space (at least 1GB free)
- Restart your computer if the app becomes slow

### Database Issues
- The app creates a local database file automatically
- Don't delete the `pharmamine_web.db` file in the data folder
- Regular backups are recommended for important data

## Uninstallation

**Complete Removal (No Leftover Files):**
1. Close the GarmentPOS application
2. Delete the entire extracted folder
3. That's it! No registry entries or system files to clean up

## File Structure After Extraction

```
garmentpos-v1.5.1-win64/
├── garmentpos.exe           # Main application (double-click this)
├── [various .dll files]     # Required system libraries
├── locales/                 # Language support files
└── resources/
    └── app/
        ├── data/            # Your database files (IMPORTANT!)
        ├── assets/          # Application assets
        └── [app files]
```

## Data Location

- **Database**: Stored in `resources/app/data/pharmamine_web.db`
- **Logs**: Stored in `resources/app/logs/` (if enabled)
- **User Data**: All your products, customers, and transactions

**Important**: Keep the `data` folder safe - it contains all your business data!

## Support and Updates

- **Website**: https://appixen.com/garmentpos
- **GitHub Issues**: Report bugs and request features
- **Updates**: Download new releases from the GitHub releases page

## Frequently Asked Questions

**Q: Do I need to install anything else?**
A: No, everything needed is included in the ZIP file.

**Q: Can I run this from a USB drive?**
A: Yes! Just extract to the USB drive and run from there.

**Q: Is my data safe?**
A: Your data is stored locally on your computer. Regular backups are recommended.

**Q: Can I use this on multiple computers?**
A: Yes, extract and run on each computer independently.

**Q: Do I need an internet connection?**
A: Internet is only needed for initial setup and updates. The app works offline.

**Q: What if I lose my data?**
A: Always backup the `data` folder regularly to prevent data loss.

---

*GarmentPOS v1.5.1 - Easy Point of Sale for Garment Business*