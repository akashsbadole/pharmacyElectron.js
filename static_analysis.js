/**
 * Static Code Analysis for Pharmingo Features
 * Analyzes implementation without requiring server to be running
 */

const fs = require('fs');
const path = require('path');

class StaticAnalyzer {
    constructor() {
        this.results = {
            csv: { implemented: 0, total: 0, details: [] },
            backup: { implemented: 0, total: 0, details: [] },
            branding: { implemented: 0, total: 0, details: [] },
            integration: { implemented: 0, total: 0, details: [] }
        };
    }

    analyzeFile(filePath, feature) {
        if (!fs.existsSync(filePath)) {
            this.results[feature].details.push(`❌ File not found: ${filePath}`);
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        this.results[feature].implemented++;
        this.results[feature].total++;
        this.results[feature].details.push(`✅ File exists: ${filePath}`);
        return content;
    }

    checkFunction(content, functionName, feature) {
        if (content.includes(functionName)) {
            this.results[feature].implemented++;
            this.results[feature].total++;
            this.results[feature].details.push(`✅ Function found: ${functionName}`);
            return true;
        } else {
            this.results[feature].total++;
            this.results[feature].details.push(`❌ Function missing: ${functionName}`);
            return false;
        }
    }

    checkEndpoint(content, endpoint, feature) {
        if (content.includes(endpoint)) {
            this.results[feature].implemented++;
            this.results[feature].total++;
            this.results[feature].details.push(`✅ Endpoint found: ${endpoint}`);
            return true;
        } else {
            this.results[feature].total++;
            this.results[feature].details.push(`❌ Endpoint missing: ${endpoint}`);
            return false;
        }
    }

    checkUIElement(content, element, feature) {
        if (content.includes(element)) {
            this.results[feature].implemented++;
            this.results[feature].total++;
            this.results[feature].details.push(`✅ UI Element found: ${element}`);
            return true;
        } else {
            this.results[feature].total++;
            this.results[feature].details.push(`❌ UI Element missing: ${element}`);
            return false;
        }
    }

    analyzeCSVFeature() {
        console.log('\n📊 Analyzing CSV Import/Export Feature...');
        
        // Check API implementation
        const inventoryContent = this.analyzeFile('./api/inventory.js', 'csv');
        
        if (inventoryContent) {
            // Check CSV export endpoint
            this.checkEndpoint(inventoryContent, '/export/csv', 'csv');
            this.checkEndpoint(inventoryContent, '/import/csv', 'csv');
            this.checkEndpoint(inventoryContent, '/import/template', 'csv');
            
            // Check CSV parsing functionality
            this.checkFunction(inventoryContent, 'json2csv', 'csv');
            this.checkFunction(inventoryContent, 'csv-parser', 'csv');
            this.checkFunction(inventoryContent, 'csvData', 'csv');
            
            // Check validation
            this.checkFunction(inventoryContent, 'requiredFields', 'csv');
            this.checkFunction(inventoryContent, 'validator.escape', 'csv');
            
            // Check error handling
            this.checkFunction(inventoryContent, 'try', 'csv');
            this.checkFunction(inventoryContent, 'catch', 'csv');
        }

        // Check UI implementation
        const htmlContent = this.analyzeFile('./index.html', 'csv');
        
        if (htmlContent) {
            this.checkUIElement(htmlContent, 'importCSV', 'csv');
            this.checkUIElement(htmlContent, 'exportCSV', 'csv');
            this.checkUIElement(htmlContent, 'downloadTemplate', 'csv');
            this.checkUIElement(htmlContent, 'importCSVPModal', 'csv');
            this.checkUIElement(htmlContent, 'csvFileInput', 'csv');
        }
    }

    analyzeBackupFeature() {
        console.log('\n💾 Analyzing Backup & Restore Feature...');
        
        // Check API implementation
        const backupApiContent = this.analyzeFile('./api/backup.js', 'backup');
        const backupUtilsContent = this.analyzeFile('./api/database_utils.js', 'backup');
        
        if (backupApiContent) {
            this.checkEndpoint(backupApiContent, '/create', 'backup');
            this.checkEndpoint(backupApiContent, '/list', 'backup');
            this.checkEndpoint(backupApiContent, '/validate', 'backup');
            this.checkEndpoint(backupApiContent, '/restore', 'backup');
            this.checkEndpoint(backupApiContent, '/stats', 'backup');
            this.checkEndpoint(backupApiContent, '/directory', 'backup');
        }

        if (backupUtilsContent) {
            this.checkFunction(backupUtilsContent, 'createBackup', 'backup');
            this.checkFunction(backupUtilsContent, 'restoreBackup', 'backup');
            this.checkFunction(backupUtilsContent, 'validateBackup', 'backup');
            this.checkFunction(backupUtilsContent, 'getBackupFiles', 'backup');
            this.checkFunction(backupUtilsContent, 'archiver', 'backup');
            this.checkFunction(backupUtilsContent, 'unzipper', 'backup');
        }

        // Check UI implementation
        const backupJsContent = this.analyzeFile('./assets/js/backup.js', 'backup');
        
        if (backupJsContent) {
            this.checkFunction(backupJsContent, 'BackupManager', 'backup');
            this.checkFunction(backupJsContent, 'createBackup', 'backup');
            this.checkFunction(backupJsContent, 'restoreFromBackup', 'backup');
            this.checkFunction(backupJsContent, 'validateBackup', 'backup');
            this.checkUIElement(backupJsContent, 'createBackupBtn', 'backup');
            this.checkUIElement(backupJsContent, 'restoreBackupBtn', 'backup');
        }

        // Check HTML implementation
        const htmlContent = this.analyzeFile('./index.html', 'backup');
        
        if (htmlContent) {
            this.checkUIElement(htmlContent, 'backupRestoreTab', 'backup');
            this.checkUIElement(htmlContent, 'backupProgressContainer', 'backup');
            this.checkUIElement(htmlContent, 'restoreBackupModal', 'backup');
        }
    }

    analyzeBrandingFeature() {
        console.log('\n🏷️ Analyzing White-label Branding Feature...');
        
        // Check package.json
        const packageContent = this.analyzeFile('./package.json', 'branding');
        
        if (packageContent) {
            const packageJson = JSON.parse(packageContent);
            
            if (packageJson.name === 'pharmingo') {
                this.results.branding.implemented++;
                this.results.branding.total++;
                this.results.branding.details.push('✅ Package name correctly set to "pharmingo"');
            } else {
                this.results.branding.total++;
                this.results.branding.details.push(`❌ Package name incorrect: ${packageJson.name}`);
            }

            if (packageJson.productName === 'Pharmingo') {
                this.results.branding.implemented++;
                this.results.branding.total++;
                this.results.branding.details.push('✅ Product name correctly set to "Pharmingo"');
            } else {
                this.results.branding.total++;
                this.results.branding.details.push(`❌ Product name incorrect: ${packageJson.productName}`);
            }
        }

        // Check HTML title
        const htmlContent = this.analyzeFile('./index.html', 'branding');
        
        if (htmlContent) {
            this.checkUIElement(htmlContent, 'Pharmingo', 'branding');
            this.checkUIElement(htmlContent, 'Pharmaceutical Management System', 'branding');
        }

        // Check renderer integration
        const rendererContent = this.analyzeFile('./renderer.js', 'branding');
        
        if (rendererContent) {
            this.checkFunction(rendererContent, 'backup.js', 'branding');
        }
    }

    analyzeIntegration() {
        console.log('\n🔗 Analyzing Feature Integration...');
        
        // Check if backup system includes inventory data
        const backupUtilsContent = this.analyzeFile('./api/database_utils.js', 'integration');
        
        if (backupUtilsContent) {
            this.checkFunction(backupUtilsContent, 'inventory.db', 'integration');
            this.checkFunction(backupUtilsContent, 'getDatabaseFiles', 'integration');
        }

        // Check if CSV import integrates with database
        const inventoryContent = this.analyzeFile('./api/inventory.js', 'integration');
        
        if (inventoryContent) {
            this.checkFunction(inventoryContent, 'inventoryDB', 'integration');
            this.checkFunction(inventoryContent, 'NeDB', 'integration');
        }

        // Check error handling consistency
        const backupApiContent = this.analyzeFile('./api/backup.js', 'integration');
        
        if (backupApiContent && inventoryContent) {
            const backupHasErrorHandling = backupApiContent.includes('try') && backupApiContent.includes('catch');
            const inventoryHasErrorHandling = inventoryContent.includes('try') && inventoryContent.includes('catch');
            
            if (backupHasErrorHandling && inventoryHasErrorHandling) {
                this.results.integration.implemented++;
                this.results.integration.total++;
                this.results.integration.details.push('✅ Consistent error handling across APIs');
            } else {
                this.results.integration.total++;
                this.results.integration.details.push('❌ Inconsistent error handling');
            }
        }
    }

    generateReport() {
        console.log('\n📋 Static Analysis Report');
        console.log('=' .repeat(60));

        const features = ['csv', 'backup', 'branding', 'integration'];
        
        features.forEach(feature => {
            const result = this.results[feature];
            const percentage = ((result.implemented / result.total) * 100).toFixed(1);
            
            console.log(`\n${feature.toUpperCase()} Feature:`);
            console.log(`   Implementation: ${result.implemented}/${result.total} (${percentage}%)`);
            
            if (result.details.length > 0) {
                console.log('   Details:');
                result.details.forEach(detail => console.log(`      ${detail}`));
            }
        });

        // Overall summary
        const totalImplemented = features.reduce((sum, f) => sum + this.results[f].implemented, 0);
        const totalChecks = features.reduce((sum, f) => sum + this.results[f].total, 0);
        const overallPercentage = ((totalImplemented / totalChecks) * 100).toFixed(1);
        
        console.log('\n🎯 Overall Implementation Status:');
        console.log(`   Total Checks: ${totalChecks}`);
        console.log(`   Implemented: ${totalImplemented}`);
        console.log(`   Completion Rate: ${overallPercentage}%`);

        return {
            overall: { implemented: totalImplemented, total: totalChecks, percentage: overallPercentage },
            features: this.results
        };
    }

    runAnalysis() {
        console.log('🔍 Starting Static Code Analysis for Pharmingo Features');
        console.log('=' .repeat(60));
        
        this.analyzeCSVFeature();
        this.analyzeBackupFeature();
        this.analyzeBrandingFeature();
        this.analyzeIntegration();
        
        return this.generateReport();
    }
}

// Run analysis
const analyzer = new StaticAnalyzer();
const results = analyzer.runAnalysis();

// Save results to file
fs.writeFileSync('./static_analysis_results.json', JSON.stringify(results, null, 2));
console.log('\n💾 Results saved to static_analysis_results.json');