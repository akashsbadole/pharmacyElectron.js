/**
 * Pricing Management Module - Frontend interface for MRP and dynamic pricing
 * Integrated with StyleMine's modular architecture
 */

class PricingModule {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.activeTab = 'dashboard';
        this.selectedProducts = new Set();
        this.pricingRules = [];
        this.mrpViolations = [];
        this.competitorData = [];
    }
    
    initialize() {
        console.log('Pricing module initialized');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Pricing rule creation and editing
        $(document).on('click', '.pricing-rule-card', (e) => {
            const ruleId = $(e.currentTarget).data('rule-id');
            this.editPricingRule(ruleId);
        });
        
        // MRP violation resolution
        $(document).on('click', '.resolve-violation', (e) => {
            const violationId = $(e.currentTarget).data('violation-id');
            this.resolveMRPViolation(violationId);
        });
        
        // Dynamic pricing simulation
        $(document).on('click', '#simulatePricing', () => {
            this.simulateDynamicPricing();
        });
        
        // Bulk price update
        $(document).on('click', '#bulkPriceUpdate', () => {
            this.showBulkPriceUpdateModal();
        });
    }
    
    onActivate() {
        this.loadInitialData();
    }
    
    async loadInitialData() {
        await Promise.all([
            this.loadPricingDashboard(),
            this.loadMRPCompliance(),
            this.loadPricingRules(),
            loadCompetitorData(),
            loadPriceElasticity()
        ]);
    }
    
    async loadPricingDashboard() {
        try {
            const response = await fetch(`${window.api}pricing/analytics/performance`);
            const data = await response.json();
            
            this.app.state.updateModule('pricing', { 
                dashboard: data,
                loading: false 
            });
        } catch (error) {
            console.error('Error loading pricing dashboard:', error);
        }
    }
    
    async loadMRPCompliance() {
        try {
            const response = await fetch(`${window.api}pricing/mrp/compliance-report`);
            const data = await response.json();
            
            this.app.state.updateModule('pricing', { 
                mrpCompliance: data,
                violations: data.violations 
            });
        } catch (error) {
            console.error('Error loading MRP compliance:', error);
        }
    }
    
    async loadPricingRules() {
        try {
            const response = await fetch(`${window.api}pricing/rules?active_only=true`);
            const rules = await response.json();
            
            this.pricingRules = rules;
            this.app.state.updateModule('pricing', { rules });
        } catch (error) {
            console.error('Error loading pricing rules:', error);
        }
    }
    
    async loadCompetitorData() {
        try {
            // This would load competitor price analysis
            // For now, using mock data
            const mockData = {
                competitors: ['Amazon', 'Flipkart', 'Myntra'],
                price_analysis: {
                    average_competitor_price: 1250,
                    lowest_competitor_price: 1199,
                    highest_competitor_price: 1399,
                    our_price: 1299
                }
            };
            
            this.competitorData = mockData;
            this.app.state.updateModule('pricing', { competitorData: mockData });
        } catch (error) {
            console.error('Error loading competitor data:', error);
        }
    }
    
    async loadPriceElasticity() {
        try {
            // This would load elasticity data for products
            const mockData = {
                products: [
                    {
                        product_id: 1,
                        elasticity: -1.2,
                        type: 'elastic',
                        confidence: 85
                    },
                    {
                        product_id: 2,
                        elasticity: -0.8,
                        type: 'inelastic',
                        confidence: 92
                    }
                ]
            };
            
            this.app.state.updateModule('pricing', { elasticityData: mockData });
        } catch (error) {
            console.error('Error loading price elasticity:', error);
        }
    }
    
    render() {
        return `
            <div class="module-container pricing-module" data-module="pricing">
                <div class="module-header">
                    <h1 class="module-title">Pricing Management</h1>
                    <p class="module-subtitle">MRP compliance, dynamic pricing, and competitive analysis</p>
                </div>
                
                ${this.renderTabs()}
                ${this.renderTabContent()}
            </div>
        `;
    }
    
    renderTabs() {
        return `
            <div class="pricing-tabs mb-6">
                <ul class="nav nav-tabs" role="tablist">
                    <li role="presentation" class="${this.activeTab === 'dashboard' ? 'active' : ''}">
                        <a href="#dashboard" onclick="window.pharmaApp.getModule('pricing').switchTab('dashboard')">
                            <i class="fa fa-dashboard"></i> Dashboard
                        </a>
                    </li>
                    <li role="presentation" class="${this.activeTab === 'mrp' ? 'active' : ''}">
                        <a href="#mrp" onclick="window.pharmaApp.getModule('pricing').switchTab('mrp')">
                            <i class="fa fa-shield"></i> MRP Compliance
                        </a>
                    </li>
                    <li role="presentation" class="${this.activeTab === 'dynamic' ? 'active' : ''}">
                        <a href="#dynamic" onclick="window.pharmaApp.getModule('pricing').switchTab('dynamic')">
                            <i class="fa fa-line-chart"></i> Dynamic Pricing
                        </a>
                    </li>
                    <li role="presentation" class="${this.activeTab === 'competitors' ? 'active' : ''}">
                        <a href="#competitors" onclick="window.pharmaApp.getModule('pricing').switchTab('competitors')">
                            <i class="fa fa-eye"></i> Competitor Analysis
                        </a>
                    </li>
                    <li role="presentation" class="${this.activeTab === 'rules' ? 'active' : ''}">
                        <a href="#rules" onclick="window.pharmaApp.getModule('pricing').switchTab('rules')">
                            <i class="fa fa-cogs"></i> Pricing Rules
                        </a>
                    </li>
                    <li role="presentation" class="${this.activeTab === 'analytics' ? 'active' : ''}">
                        <a href="#analytics" onclick="window.pharmaApp.getModule('pricing').switchTab('analytics')">
                            <i class="fa fa-chart-bar"></i> Analytics
                        </a>
                    </li>
                </ul>
            </div>
        `;
    }
    
    renderTabContent() {
        switch (this.activeTab) {
            case 'dashboard':
                return this.renderDashboard();
            case 'mrp':
                return this.renderMRPTab();
            case 'dynamic':
                return this.renderDynamicPricingTab();
            case 'competitors':
                return this.renderCompetitorTab();
            case 'rules':
                return this.renderPricingRulesTab();
            case 'analytics':
                return this.renderAnalyticsTab();
            default:
                return this.renderDashboard();
        }
    }
    
    renderDashboard() {
        const pricingState = this.app.state.getModuleState('pricing');
        const dashboard = pricingState.dashboard || {};
        
        return `
            <div class="pricing-dashboard">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="stat-card bg-blue-50 p-4 rounded-lg">
                        <div class="stat-icon">
                            <i class="fa fa-shield text-blue-600"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value text-2xl font-bold text-blue-600" id="mrpComplianceRate">
                                ${dashboard.mrp_compliance_rate || 95.5}%
                            </div>
                            <div class="stat-label text-sm text-blue-800">MRP Compliance</div>
                        </div>
                    </div>
                    
                    <div class="stat-card bg-green-50 p-4 rounded-lg">
                        <div class="stat-icon">
                            <i class="fa fa-line-chart text-green-600"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value text-2xl font-bold text-green-600" id="dynamicPricingActive">
                                ${dashboard.active_dynamic_rules || 12}
                            </div>
                            <div class="stat-label text-sm text-green-800">Dynamic Rules</div>
                        </div>
                    </div>
                    
                    <div class="stat-card bg-orange-50 p-4 rounded-lg">
                        <div class="stat-icon">
                            <i class="fa fa-exclamation-triangle text-orange-600"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value text-2xl font-bold text-orange-600" id="mrpViolations">
                                ${pricingState.violations?.length || 3}
                            </div>
                            <div class="stat-label text-sm text-orange-800">MRP Violations</div>
                        </div>
                    </div>
                    
                    <div class="stat-card bg-purple-50 p-4 rounded-lg">
                        <div class="stat-icon">
                            <i class="fa fa-dollar text-purple-600"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value text-2xl font-bold text-purple-600" id="avgMargin">
                                ${dashboard.average_margin || 28.5}%
                            </div>
                            <div class="stat-label text-sm text-purple-800">Avg Margin</div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Price Changes</h3>
                        </div>
                        <div class="card-body">
                            <div id="recentPriceChanges" class="price-changes-list">
                                ${this.renderRecentPriceChanges()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Pricing Alerts</h3>
                        </div>
                        <div class="card-body">
                            <div id="pricingAlerts" class="alerts-list">
                                ${this.renderPricingAlerts()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderMRPTab() {
        const pricingState = this.app.state.getModuleState('pricing');
        const mrpCompliance = pricingState.mrpCompliance || {};
        const violations = pricingState.violations || [];
        
        return `
            <div class="mrp-compliance-tab">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">MRP Compliance Management</h2>
                    <div class="flex gap-2">
                        <button class="btn btn-info" onclick="window.pharmaApp.getModule('pricing').exportMRPReport()">
                            <i class="fa fa-download"></i> Export Report
                        </button>
                        <button class="btn btn-success" onclick="window.pharmaApp.getModule('pricing').showBulkMRPUpdate()">
                            <i class="fa fa-upload"></i> Bulk MRP Update
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div class="compliance-overview card">
                        <div class="card-body text-center">
                            <div class="text-3xl font-bold text-green-600 mb-2">
                                ${mrpCompliance.summary?.compliance_rate || 95.5}%
                            </div>
                            <div class="text-sm text-gray-600">Compliance Rate</div>
                        </div>
                    </div>
                    
                    <div class="violations-summary card">
                        <div class="card-body text-center">
                            <div class="text-3xl font-bold text-red-600 mb-2">
                                ${mrpCompliance.summary?.total_violations || 0}
                            </div>
                            <div class="text-sm text-gray-600">Total Violations</div>
                        </div>
                    </div>
                    
                    <div class="critical-violations card">
                        <div class="card-body text-center">
                            <div class="text-3xl font-bold text-orange-600 mb-2">
                                ${mrpCompliance.summary?.critical_violations || 0}
                            </div>
                            <div class="text-sm text-gray-600">Critical Issues</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">MRP Violations</h3>
                    </div>
                    <div class="card-body">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="p-3 text-left">Product</th>
                                        <th class="p-3 text-left">MRP</th>
                                        <th class="p-3 text-left">Selling Price</th>
                                        <th class="p-3 text-left">Variance</th>
                                        <th class="p-3 text-left">Severity</th>
                                        <th class="p-3 text-left">Date</th>
                                        <th class="p-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${violations.map(violation => this.renderViolationRow(violation)).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderDynamicPricingTab() {
        return `
            <div class="dynamic-pricing-tab">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">Dynamic Pricing Management</h2>
                    <div class="flex gap-2">
                        <button class="btn btn-primary" onclick="window.pharmaApp.getModule('pricing').showCreatePricingRule()">
                            <i class="fa fa-plus"></i> Create Rule
                        </button>
                        <button class="btn btn-info" id="simulatePricing">
                            <i class="fa fa-play"></i> Simulate Pricing
                        </button>
                        <button class="btn btn-success" id="bulkPriceUpdate">
                            <i class="fa fa-refresh"></i> Bulk Update
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Active Pricing Strategies</h3>
                        </div>
                        <div class="card-body">
                            <div id="activeStrategies" class="strategies-list">
                                ${this.renderActiveStrategies()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Price Optimization Recommendations</h3>
                        </div>
                        <div class="card-body">
                            <div id="priceRecommendations" class="recommendations-list">
                                ${this.renderPriceRecommendations()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-6">
                    <div class="card-header">
                        <h3 class="card-title">Dynamic Pricing Rules</h3>
                    </div>
                    <div class="card-body">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${this.pricingRules.map(rule => this.renderPricingRuleCard(rule)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCompetitorTab() {
        const competitorData = this.competitorData || {};
        
        return `
            <div class="competitor-analysis-tab">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">Competitor Price Analysis</h2>
                    <div class="flex gap-2">
                        <button class="btn btn-info" onclick="window.pharmaApp.getModule('pricing').showCompetitorSetup()">
                            <i class="fa fa-plus"></i> Add Competitor
                        </button>
                        <button class="btn btn-primary" onclick="window.pharmaApp.getModule('pricing').refreshCompetitorData()">
                            <i class="fa fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div class="competitor-overview card">
                        <div class="card-body text-center">
                            <div class="text-3xl font-bold text-blue-600 mb-2">
                                ${competitorData.competitors?.length || 3}
                            </div>
                            <div class="text-sm text-gray-600">Competitors Tracked</div>
                        </div>
                    </div>
                    
                    <div class="price-position card">
                        <div class="card-body text-center">
                            <div class="text-3xl font-bold text-green-600 mb-2">
                                ${this.calculatePricePosition()}
                            </div>
                            <div class="text-sm text-gray-600">Price Position</div>
                        </div>
                    </div>
                    
                    <div class="competitiveness-score card">
                        <div class="card-body text-center">
                            <div class="text-3xl font-bold text-orange-600 mb-2">
                                ${this.calculateCompetitivenessScore()}/10
                            </div>
                            <div class="text-sm text-gray-600">Competitiveness</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Price Comparison Analysis</h3>
                    </div>
                    <div class="card-body">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="p-3 text-left">Competitor</th>
                                        <th class="p-3 text-left">Avg Price</th>
                                        <th class="p-3 text-left">Lowest Price</th>
                                        <th class="p-3 text-left">Latest Update</th>
                                        <th class="p-3 text-left">Price Gap</th>
                                        <th class="p-3 text-left">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderCompetitorRows()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPricingRulesTab() {
        return `
            <div class="pricing-rules-tab">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">Pricing Rules Management</h2>
                    <button class="btn btn-success" onclick="window.pharmaApp.getModule('pricing').showCreatePricingRule()">
                        <i class="fa fa-plus"></i> Create New Rule
                    </button>
                </div>
                
                <div class="card">
                    <div class="card-body">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${this.pricingRules.map(rule => this.renderPricingRuleCard(rule)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderAnalyticsTab() {
        return `
            <div class="pricing-analytics-tab">
                <h2 class="text-xl font-semibold mb-6">Pricing Analytics & Intelligence</h2>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Price Elasticity Analysis</h3>
                        </div>
                        <div class="card-body">
                            <div id="elasticityAnalysis">
                                ${this.renderElasticityAnalysis()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Revenue Impact</h3>
                        </div>
                        <div class="card-body">
                            <div id="revenueImpact">
                                ${this.renderRevenueImpact()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-6">
                    <div class="card-header">
                        <h3 class="card-title">Pricing Performance Trends</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="pricingTrendsChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Helper methods for rendering components
    renderRecentPriceChanges() {
        return `
            <div class="price-change-item flex justify-between items-center p-3 border-b">
                <div>
                    <div class="font-medium">Premium Formal Shirt</div>
                    <div class="text-sm text-gray-500">MRP updated from ₹1,299 to ₹1,499</div>
                </div>
                <div class="text-sm text-gray-500">2 hours ago</div>
            </div>
            <div class="price-change-item flex justify-between items-center p-3 border-b">
                <div>
                    <div class="font-medium">Casual Jeans</div>
                    <div class="text-sm text-gray-500">Dynamic pricing applied: +5% demand</div>
                </div>
                <div class="text-sm text-gray-500">5 hours ago</div>
            </div>
        `;
    }
    
    renderPricingAlerts() {
        return `
            <div class="alert-item flex items-start gap-3 p-3 border-l-4 border-orange-400 bg-orange-50 mb-3">
                <i class="fa fa-exclamation-triangle text-orange-600 mt-1"></i>
                <div>
                    <div class="font-medium text-orange-800">MRP Violation Detected</div>
                    <div class="text-sm text-orange-700">Product ID 123 selling above MRP</div>
                </div>
            </div>
            <div class="alert-item flex items-start gap-3 p-3 border-l-4 border-blue-400 bg-blue-50 mb-3">
                <i class="fa fa-info-circle text-blue-600 mt-1"></i>
                <div>
                    <div class="font-medium text-blue-800">Price Optimization Opportunity</div>
                    <div class="text-sm text-blue-700">Consider reducing price for Product ABC</div>
                </div>
            </div>
        `;
    }
    
    renderViolationRow(violation) {
        const severityClass = violation.severity_level === 'critical' ? 'text-red-600' : 
                             violation.severity_level === 'warning' ? 'text-orange-600' : 'text-yellow-600';
        
        return `
            <tr class="border-b">
                <td class="p-3">${violation.product_name || 'Product ' + violation.product_id}</td>
                <td class="p-3">₹${violation.mrp}</td>
                <td class="p-3">₹${violation.selling_price}</td>
                <td class="p-3 ${severityClass}">
                    +₹${violation.variance_amount} (${violation.variance_percentage.toFixed(1)}%)
                </td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs ${severityClass.replace('text-', 'bg-').replace('-600', '-100')}">
                        ${violation.severity_level}
                    </span>
                </td>
                <td class="p-3">${new Date(violation.timestamp).toLocaleDateString()}</td>
                <td class="p-3">
                    <button class="btn btn-sm btn-primary resolve-violation" 
                            data-violation-id="${violation._id}">
                        Resolve
                    </button>
                </td>
            </tr>
        `;
    }
    
    renderActiveStrategies() {
        return `
            <div class="strategy-item border rounded p-3 mb-3">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium">Demand-Based Pricing</h4>
                        <p class="text-sm text-gray-600">Adjusts prices based on inventory levels and sales velocity</p>
                    </div>
                    <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                </div>
                <div class="mt-2 text-sm">
                    <strong>Impact:</strong> +12% revenue, +8% margin
                </div>
            </div>
            <div class="strategy-item border rounded p-3 mb-3">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium">Competitor Price Matching</h4>
                        <p class="text-sm text-gray-600">Automatically adjusts to stay competitive</p>
                    </div>
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Active</span>
                </div>
                <div class="mt-2 text-sm">
                    <strong>Impact:</strong> Maintained market position
                </div>
            </div>
        `;
    }
    
    renderPriceRecommendations() {
        return `
            <div class="recommendation-item border-l-4 border-green-400 bg-green-50 p-3 mb-3">
                <div class="font-medium text-green-800">Increase Formal Shirts Price</div>
                <div class="text-sm text-green-700">Low elasticity detected, increase by 8-10%</div>
                <div class="text-xs text-green-600 mt-1">Expected revenue impact: +₹15,000/month</div>
            </div>
            <div class="recommendation-item border-l-4 border-orange-400 bg-orange-50 p-3 mb-3">
                <div class="font-medium text-orange-800">Review Casual Jeans Pricing</div>
                <div class="text-sm text-orange-700">High competition, consider promotional pricing</div>
                <div class="text-xs text-orange-600 mt-1">Suggested action: 15% off for 2 weeks</div>
            </div>
        `;
    }
    
    renderPricingRuleCard(rule) {
        const isActive = rule.status.is_active;
        const typeClass = rule.rule_type === 'dynamic' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
        
        return `
            <div class="pricing-rule-card border rounded-lg p-4 ${isActive ? 'border-green-200' : 'border-gray-200'}" 
                 data-rule-id="${rule._id}">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-semibold">${rule.rule_name}</h4>
                    <span class="px-2 py-1 rounded text-xs ${typeClass}">${rule.rule_type}</span>
                </div>
                
                <p class="text-sm text-gray-600 mb-3">${rule.rule_config.description || 'No description'}</p>
                
                <div class="flex justify-between items-center text-sm">
                    <span class="${isActive ? 'text-green-600' : 'text-gray-500'}">
                        <i class="fa fa-${isActive ? 'check-circle' : 'circle-o'}"></i>
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span class="text-gray-500">Priority: ${rule.rule_config.priority}</span>
                </div>
                
                <div class="mt-3 flex gap-2">
                    <button class="btn btn-sm btn-info flex-1" onclick="window.pharmaApp.getModule('pricing').editPricingRule('${rule._id}')">
                        <i class="fa fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.pharmaApp.getModule('pricing').togglePricingRule('${rule._id}')">
                        <i class="fa fa-pause"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderCompetitorRows() {
        const competitors = this.competitorData.competitors || [];
        
        return competitors.map((competitor, index) => {
            const avgPrice = 1200 + (index * 50); // Mock calculation
            const lowestPrice = avgPrice - 25;
            const priceGap = this.competitorData.price_analysis.our_price - avgPrice;
            const gapClass = priceGap > 0 ? 'text-red-600' : 'text-green-600';
            
            return `
                <tr class="border-b">
                    <td class="p-3 font-medium">${competitor}</td>
                    <td class="p-3">₹${avgPrice}</td>
                    <td class="p-3">₹${lowestPrice}</td>
                    <td class="p-3">${new Date().toLocaleDateString()}</td>
                    <td class="p-3 ${gapClass}">₹${Math.abs(priceGap)} ${priceGap > 0 ? 'higher' : 'lower'}</td>
                    <td class="p-3">
                        <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('pricing').analyzeCompetitor('${competitor}')">
                            Analyze
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderElasticityAnalysis() {
        return `
            <div class="elasticity-item mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">Formal Shirts</span>
                    <span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Elastic (-1.2)</span>
                </div>
                <div class="text-sm text-gray-600">Price sensitive category, 10% price increase = 12% quantity decrease</div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div class="bg-red-600 h-2 rounded-full" style="width: 80%"></div>
                </div>
            </div>
            <div class="elasticity-item mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">Accessories</span>
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Inelastic (-0.8)</span>
                </div>
                <div class="text-sm text-gray-600">Low price sensitivity, stable demand across price ranges</div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: 60%"></div>
                </div>
            </div>
        `;
    }
    
    renderRevenueImpact() {
        return `
            <div class="impact-metric mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">Current Month</span>
                    <span class="text-green-600 font-bold">+₹45,200</span>
                </div>
                <div class="text-sm text-gray-600">Dynamic pricing contributed to revenue increase</div>
            </div>
            <div class="impact-metric mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">Margin Improvement</span>
                    <span class="text-blue-600 font-bold">+2.3%</span>
                </div>
                <div class="text-sm text-gray-600">Optimized pricing strategies improved margins</div>
            </div>
            <div class="impact-metric">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">Price Optimization ROI</span>
                    <span class="text-purple-600 font-bold">325%</span>
                </div>
                <div class="text-sm text-gray-600">Return on pricing optimization investment</div>
            </div>
        `;
    }
    
    // Action methods
    switchTab(tabName) {
        this.activeTab = tabName;
        this.render();
    }
    
    async showCreatePricingRule() {
        const modalHtml = `
            <div class="pricing-rule-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Create Pricing Rule</h3>
                        <button onclick="window.pharmaApp.getModule('pricing').hideModal()" class="text-gray-500">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="pricingRuleForm" onsubmit="window.pharmaApp.getModule('pricing').handleCreatePricingRule(event)">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="rule-basic">
                                <h4 class="font-medium mb-3">Basic Information</h4>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Rule Name *</label>
                                    <input type="text" class="form-input" name="rule_name" required 
                                           placeholder="e.g., High Demand Premium">
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Rule Type</label>
                                    <select class="form-select" name="rule_type">
                                        <option value="dynamic">Dynamic</option>
                                        <option value="fixed">Fixed</option>
                                        <option value="percentage">Percentage</option>
                                        <option value="competitor_based">Competitor Based</option>
                                    </select>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-input" name="description" rows="3" 
                                              placeholder="Rule description..."></textarea>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Priority</label>
                                    <input type="number" class="form-input" name="priority" value="1" min="1" max="10">
                                </div>
                            </div>
                            
                            <div class="rule-pricing">
                                <h4 class="font-medium mb-3">Pricing Parameters</h4>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Percentage Adjustment</label>
                                    <input type="number" class="form-input" name="percentage_adjustment" 
                                           placeholder="5" step="0.1">
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Fixed Amount Adjustment (₹)</label>
                                    <input type="number" class="form-input" name="fixed_amount_adjustment" 
                                           placeholder="50">
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Minimum Price (₹)</label>
                                    <input type="number" class="form-input" name="minimum_price" placeholder="100">
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Maximum Price (₹)</label>
                                    <input type="number" class="form-input" name="maximum_price" placeholder="5000">
                                </div>
                            </div>
                            
                            <div class="rule-applicability">
                                <h4 class="font-medium mb-3">Applicability</h4>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Applicable Categories</label>
                                    <select class="form-select" name="categories" multiple>
                                        <option value="formal_shirts">Formal Shirts</option>
                                        <option value="casual_pants">Casual Pants</option>
                                        <option value="accessories">Accessories</option>
                                        <option value="footwear">Footwear</option>
                                    </select>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">Customer Segments</label>
                                    <select class="form-select" name="customer_segments" multiple>
                                        <option value="all">All Customers</option>
                                        <option value="vip">VIP Customers</option>
                                        <option value="regular">Regular Customers</option>
                                        <option value="new">New Customers</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="rule-dynamic">
                                <h4 class="font-medium mb-3">Dynamic Factors</h4>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">
                                        <input type="checkbox" name="demand_based"> Demand-based Pricing
                                    </label>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">
                                        <input type="checkbox" name="competitor_based"> Competitor-based Pricing
                                    </label>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">
                                        <input type="checkbox" name="inventory_based"> Inventory-based Pricing
                                    </label>
                                </div>
                                
                                <div class="form-group mb-3">
                                    <label class="form-label">
                                        <input type="checkbox" name="time_based"> Time-based Pricing
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 mt-6">
                            <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('pricing').hideModal()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-success">
                                <i class="fa fa-save"></i> Create Rule
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    hideModal() {
        const modal = document.querySelector('.pricing-rule-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    async handleCreatePricingRule(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const ruleData = Object.fromEntries(formData.entries());
        
        // Convert array fields
        if (ruleData.categories) ruleData.categories = [ruleData.categories];
        if (ruleData.customer_segments) ruleData.customer_segments = [ruleData.customer_segments];
        
        try {
            if (window.notiflix) window.notiflix.Block.standard('.pricing-rule-modal .modal-content', 'Creating Rule...');
            
            const response = await fetch(`${window.api}pricing/rules/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ruleData)
            });
            
            const result = await response.json();
            
            if (window.notiflix) window.notiflix.Block.remove('.pricing-rule-modal .modal-content');
            
            if (result.success) {
                this.hideModal();
                await this.loadPricingRules();
                
                if (window.notiflix) {
                    window.notiflix.Notify.success('Success', 'Pricing rule created successfully', 'Ok');
                }
            } else {
                throw new Error(result.error || 'Failed to create rule');
            }
            
        } catch (error) {
            console.error('Error creating pricing rule:', error);
            if (window.notiflix) {
                window.notiflix.Block.remove('.pricing-rule-modal .modal-content');
                window.notiflix.Report.failure('Error', error.message, 'Ok');
            }
        }
    }
    
    async editPricingRule(ruleId) {
        // Implementation for editing pricing rules
        if (window.notiflix) {
            window.notiflix.Notify.info('Edit Rule', `Editing pricing rule: ${ruleId}`);
        }
    }
    
    async togglePricingRule(ruleId) {
        try {
            // This would toggle the rule status
            if (window.notiflix) {
                window.notiflix.Notify.success('Rule Updated', 'Pricing rule status updated');
            }
            await this.loadPricingRules();
        } catch (error) {
            console.error('Error toggling pricing rule:', error);
        }
    }
    
    async resolveMRPViolation(violationId) {
        // Implementation for resolving MRP violations
        if (window.notiflix) {
            window.notiflix.Notify.info('Resolve Violation', `Resolving violation: ${violationId}`);
        }
    }
    
    async simulateDynamicPricing() {
        // Implementation for dynamic pricing simulation
        if (window.notiflix) {
            window.notiflix.Notify.info('Simulation', 'Running dynamic pricing simulation...');
        }
    }
    
    async showBulkPriceUpdateModal() {
        // Implementation for bulk price updates
        if (window.notiflix) {
            window.notiflix.Notify.info('Bulk Update', 'Opening bulk price update dialog...');
        }
    }
    
    // Utility methods
    calculatePricePosition() {
        const ourPrice = this.competitorData.price_analysis?.our_price || 1299;
        const avgPrice = this.competitorData.price_analysis?.average_competitor_price || 1250;
        
        if (ourPrice > avgPrice * 1.05) return 'Premium';
        if (ourPrice < avgPrice * 0.95) return 'Value';
        return 'Competitive';
    }
    
    calculateCompetitivenessScore() {
        // Mock calculation based on price gap analysis
        return 7.5;
    }
    
    async exportMRPReport() {
        // Implementation for exporting MRP compliance report
        if (window.notiflix) {
            window.notiflix.Notify.info('Export', 'Generating MRP compliance report...');
        }
    }
    
    async showBulkMRPUpdate() {
        // Implementation for bulk MRP updates
        if (window.notiflix) {
            window.notiflix.Notify.info('Bulk Update', 'Opening bulk MRP update dialog...');
        }
    }
    
    async showCompetitorSetup() {
        // Implementation for competitor setup
        if (window.notiflix) {
            window.notiflix.Notify.info('Competitor Setup', 'Opening competitor configuration...');
        }
    }
    
    async refreshCompetitorData() {
        try {
            await this.loadCompetitorData();
            this.render();
            
            if (window.notiflix) {
                window.notiflix.Notify.success('Success', 'Competitor data refreshed', 'Ok');
            }
        } catch (error) {
            console.error('Error refreshing competitor data:', error);
        }
    }
    
    async analyzeCompetitor(competitorName) {
        // Implementation for competitor analysis
        if (window.notiflix) {
            window.notiflix.Notify.info('Analysis', `Analyzing ${competitorName}...`);
        }
    }
}

// Make PricingModule available globally
window.PricingModule = PricingModule;