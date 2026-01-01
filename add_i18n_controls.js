// Script to add internationalization controls to the settings interface
// This script should be run to update the index.html file

const fs = require('fs');

// Read the current index.html file
const indexPath = 'index.html';
const content = fs.readFileSync(indexPath, 'utf8');

// Find the settings form opening tag
const settingsFormStart = '<div role="tabpanel" class="tab-pane active" id="generalSettingsTab">';
const formStart = '<form id="settings_form" encType="multipart/form-data">';

// Internationalization controls HTML
const i18nControls = `
                                     <!-- Internationalization Controls -->
                                     <div class="i18n-controls" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; margin-bottom: 20px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                                         <div style="display: flex; align-items: center; gap: 8px; min-width: 250px;">
                                             <label style="margin: 0; font-weight: bold; min-width: 120px;">Country/Region:</label>
                                             <select id="countrySelect" class="form-control" style="flex: 1;">
                                                 <option value="IN">🇮🇳 India</option>
                                                 <option value="US">🇺🇸 United States</option>
                                                 <option value="UK">🇬🇧 United Kingdom</option>
                                                 <option value="DE">🇩🇪 Germany</option>
                                                 <option value="FR">🇫🇷 France</option>
                                                 <option value="JP">🇯🇵 Japan</option>
                                                 <option value="CA">🇨🇦 Canada</option>
                                                 <option value="AU">🇦🇺 Australia</option>
                                             </select>
                                         </div>
                                         
                                         <div style="display: flex; align-items: center; gap: 8px; min-width: 200px;">
                                             <label style="margin: 0; font-weight: bold; min-width: 80px;">Language:</label>
                                             <select id="languageSelect" class="form-control" style="flex: 1;">
                                                 <option value="en">🇺🇸 English</option>
                                                 <option value="hi">🇮🇳 Hindi</option>
                                                 <option value="es">🇪🇸 Spanish</option>
                                                 <option value="fr">🇫🇷 French</option>
                                             </select>
                                         </div>
                                         
                                         <div style="display: flex; align-items: center; gap: 8px; min-width: 250px;">
                                             <label style="margin: 0; font-weight: bold; min-width: 80px;">Currency:</label>
                                             <select id="currencySelect" class="form-control" style="flex: 1;">
                                                 <option value="INR">₹ INR - Indian Rupee</option>
                                                 <option value="USD">$ USD - US Dollar</option>
                                                 <option value="EUR">€ EUR - Euro</option>
                                                 <option value="GBP">£ GBP - British Pound</option>
                                                 <option value="JPY">¥ JPY - Japanese Yen</option>
                                                 <option value="CAD">C$ CAD - Canadian Dollar</option>
                                                 <option value="AUD">A$ AUD - Australian Dollar</option>
                                             </select>
                                         </div>
                                         
                                         <button type="button" id="applySettingsBtn" class="btn btn-primary" style="white-space: nowrap;">Apply Settings</button>
                                     </div>
`;

// Insert the i18n controls before the form
const updatedContent = content.replace(
    `${settingsFormStart}\n                                     ${formStart}`,
    `${settingsFormStart}\n${i18nControls}\n                                     ${formStart}`
);

// Write the updated content back to the file
fs.writeFileSync(indexPath, updatedContent);

console.log('Internationalization controls added to settings interface successfully!');