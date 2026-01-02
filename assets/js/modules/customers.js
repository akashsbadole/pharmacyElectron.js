/**
 * Customers Module - Customer Management with Preferences Tracking
 */

class CustomersModule {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.selectedCustomer = null;
        this.customers = [];
        this.preferences = {};
        this.behaviors = {};
        this.segments = {};
        this.recommendations = {};
        this.analytics = {};
        this.loyaltyProfiles = {};
        this.loyaltyTiers = {};
        this.pointsHistory = {};
        this.availableRewards = {};
        this.referralData = {};
        
        // Marketing-specific properties
        this.marketingCampaigns = [];
        this.occasions = [];
        this.marketingSegments = {};
        this.campaignPerformance = {};
        this.marketingAnalytics = {};
        this.customerOccasions = {};
        this.personalizedRecommendations = {};
        this.marketingWorkflows = [];
    }

    initialize() {
        console.log('Customers module initialized');
        this.setupEventListeners();
    }

    onActivate() {
        this.loadCustomers();
        this.loadAnalytics();
    }

    setupEventListeners() {
        // Event delegation for dynamic content
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-customer-id]')) {
                this.selectCustomer(e.target.dataset.customerId);
            }
            if (e.target.matches('.preference-tab')) {
                this.switchPreferenceTab(e.target.dataset.tab);
            }
            if (e.target.matches('.save-preferences')) {
                this.savePreferences();
            }
            if (e.target.matches('.generate-recommendations')) {
                this.generateRecommendations();
            }
            if (e.target.matches('.update-segmentation')) {
                this.updateSegmentation();
            }
            if (e.target.matches('.export-data')) {
                this.exportCustomerData();
            }
            if (e.target.matches('.delete-data')) {
                this.deleteCustomerData();
            }
            if (e.target.matches('.create-marketing-campaign')) {
                this.createMarketingCampaign();
            }
            if (e.target.matches('.view-campaign-details')) {
                this.viewCampaignDetails(e.target.dataset.campaignId);
            }
            if (e.target.matches('.activate-campaign')) {
                this.activateCampaign(e.target.dataset.campaignId);
            }
            if (e.target.matches('.tag-occasion')) {
                this.tagProductWithOccasion();
            }
            if (e.target.matches('.generate-segments')) {
                this.generateMarketingSegments();
            }
            if (e.target.matches('.view-marketing-analytics')) {
                this.viewMarketingAnalytics();
            }
            if (e.target.matches('.create-workflow')) {
                this.createMarketingWorkflow();
            }
            if (e.target.matches('.send-personalized-message')) {
                this.sendPersonalizedMessage();
            }
            if (e.target.matches('.add-customer-occasion')) {
                this.addCustomerOccasion();
            }
            if (e.target.matches('.view-upcoming-occasions')) {
                this.viewUpcomingOccasions();
            }
            if (e.target.matches('.execute-trigger')) {
                this.executeMarketingTrigger();
            }
        });

        // Handle preference updates
        document.addEventListener('change', (e) => {
            if (e.target.matches('.preference-input')) {
                this.updatePreference(e.target.name, e.target.value);
            }
        });
    }

    async loadCustomers() {
        try {
            const response = await fetch(`${window.api}customers/all`);
            const customers = await response.json();
            this.customers = customers;
            this.app.state.updateModule('customers', { list: customers });
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    async loadAnalytics() {
        try {
            // Load customer analytics overview
            const analytics = await this.fetchCustomerAnalytics();
            this.analytics = analytics;
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async selectCustomer(customerId) {
        this.selectedCustomer = customerId;
        await Promise.all([
            this.loadCustomerPreferences(customerId),
            this.loadCustomerBehavior(customerId),
            this.loadCustomerSegments(customerId),
            this.loadRecommendations(customerId),
            this.loadCustomerLoyaltyProfile(customerId)
        ]);
        this.renderCustomerDetail();
    }

    async loadCustomerPreferences(customerId) {
        try {
            const response = await fetch(`${window.api}customer_preferences/preferences/${customerId}`);
            this.preferences[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading preferences:', error);
            this.preferences[customerId] = {};
        }
    }

    async loadCustomerBehavior(customerId) {
        try {
            const response = await fetch(`${window.api}customer_preferences/behavior/${customerId}`);
            this.behaviors[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading behavior:', error);
            this.behaviors[customerId] = [];
        }
    }

    async loadCustomerSegments(customerId) {
        try {
            const response = await fetch(`${window.api}customer_preferences/segments/${customerId}`);
            this.segments[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading segments:', error);
            this.segments[customerId] = {};
        }
    }

    async loadRecommendations(customerId) {
        try {
            const response = await fetch(`${window.api}customer_preferences/recommendations/${customerId}`);
            this.recommendations[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.recommendations[customerId] = {};
        }
    }

    async loadCustomerLoyaltyProfile(customerId) {
        try {
            const response = await fetch(`${window.api}loyalty/customer/${customerId}`);
            this.loyaltyProfiles[customerId] = await response.json();
            
            // Load additional loyalty data
            await Promise.all([
                this.loadPointsHistory(customerId),
                this.loadAvailableRewards(customerId),
                this.loadReferralData(customerId)
            ]);
        } catch (error) {
            console.error('Error loading loyalty profile:', error);
            this.loyaltyProfiles[customerId] = {
                customer: {},
                points: { balance: 0, lifetime: 0, transactions: [] },
                tier: { tier: 'bronze', progress: 0, nextTier: 'silver' },
                referrals: [],
                benefits: {},
                giftBenefits: {}
            };
        }
    }

    async loadPointsHistory(customerId) {
        try {
            const response = await fetch(`${window.api}loyalty/points/history/${customerId}`);
            this.pointsHistory[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading points history:', error);
            this.pointsHistory[customerId] = { balance: 0, lifetime: 0, transactions: [] };
        }
    }

    async loadAvailableRewards(customerId) {
        try {
            const loyaltyProfile = this.loyaltyProfiles[customerId];
            const tier = loyaltyProfile?.tier?.tier || 'bronze';
            const response = await fetch(`${window.api}loyalty/rewards?customerId=${customerId}&tier=${tier}`);
            this.availableRewards[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading available rewards:', error);
            this.availableRewards[customerId] = [];
        }
    }

    async loadReferralData(customerId) {
        try {
            const response = await fetch(`${window.api}loyalty/referrals/analytics/${customerId}`);
            this.referralData[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading referral data:', error);
            this.referralData[customerId] = {
                totalReferrals: 0,
                successfulReferrals: 0,
                totalPointsEarned: 0,
                averageConversionRate: 0
            };
        }
    }

    async fetchCustomerAnalytics() {
        // Mock analytics - in real implementation, fetch from API
        return {
            totalCustomers: this.customers.length,
            averageOrderValue: 2450,
            customerRetention: 78.5,
            topCategories: ['Pharmaceuticals', 'Supplements', 'Personal Care'],
            recentTrends: [
                { month: 'Oct', customers: 120, orders: 450 },
                { month: 'Nov', customers: 135, orders: 520 },
                { month: 'Dec', customers: 180, orders: 680 }
            ]
        };
    }

    render() {
        const customersState = this.app.state.getModuleState('customers');
        
        return `
            <div class="module-container customers-module" data-module="customers">
                <div class="module-header">
                    <h1 class="module-title">Customer Intelligence & Preferences</h1>
                    <p class="module-subtitle">Advanced customer analytics, preferences tracking, and personalization</p>
                </div>
                
                <div class="row">
                    <!-- Analytics Overview -->
                    <div class="col-md-12 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title">Customer Analytics Overview</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <div class="stat-card">
                                            <div class="stat-value">${this.analytics.totalCustomers || 0}</div>
                                            <div class="stat-label">Total Customers</div>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-card">
                                            <div class="stat-value">$${this.analytics.averageOrderValue || 0}</div>
                                            <div class="stat-label">Avg Order Value</div>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-card">
                                            <div class="stat-value">${this.analytics.customerRetention || 0}%</div>
                                            <div class="stat-label">Retention Rate</div>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="stat-card">
                                            <div class="stat-value">${this.analytics.topCategories?.length || 0}</div>
                                            <div class="stat-label">Top Categories</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Customer List -->
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title">Customers</h5>
                                <div class="search-box">
                                    <input type="text" class="form-control" placeholder="Search customers..." id="customerSearch">
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <div class="customer-list">
                                    ${this.renderCustomerList()}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Customer Details -->
                    <div class="col-md-8">
                        ${this.selectedCustomer ? this.renderCustomerDetail() : this.renderNoSelection()}
                    </div>
                </div>
            </div>
        `;
    }

    renderCustomerList() {
        if (!this.customers.length) {
            return '<div class="no-customers">No customers found</div>';
        }

        return this.customers.map(customer => `
            <div class="customer-item ${this.selectedCustomer === customer._id ? 'active' : ''}" 
                 data-customer-id="${customer._id}">
                <div class="customer-info">
                    <div class="customer-name">${customer.name || 'Unknown Customer'}</div>
                    <div class="customer-email">${customer.email || 'No email'}</div>
                    <div class="customer-phone">${customer.phone || 'No phone'}</div>
                </div>
                <div class="customer-stats">
                    <span class="badge badge-primary">${this.getCustomerValue(customer._id)}</span>
                </div>
            </div>
        `).join('');
    }

    renderNoSelection() {
        return `
            <div class="card">
                <div class="card-body text-center">
                    <i class="fa fa-user text-muted" style="font-size: 4rem;"></i>
                    <h4 class="text-muted mt-3">Select a Customer</h4>
                    <p class="text-muted">Choose a customer from the list to view their preferences and analytics</p>
                </div>
            </div>
        `;
    }

    renderCustomerDetail() {
        if (!this.selectedCustomer) return '';

        const customer = this.customers.find(c => c._id === this.selectedCustomer);
        const preferences = this.preferences[this.selectedCustomer] || {};
        const segments = this.segments[this.selectedCustomer] || {};
        const recommendations = this.recommendations[this.selectedCustomer] || {};

        return `
            <div class="card">
                <div class="card-header">
                    <div class="row align-items-center">
                        <div class="col">
                            <h5 class="card-title">Customer Profile: ${customer?.name || 'Unknown'}</h5>
                        </div>
                        <div class="col-auto">
                            <button class="btn btn-sm btn-outline-primary generate-recommendations" 
                                    data-customer-id="${this.selectedCustomer}">
                                <i class="fa fa-lightbulb"></i> Generate Recommendations
                            </button>
                            <button class="btn btn-sm btn-outline-secondary update-segmentation" 
                                    data-customer-id="${this.selectedCustomer}">
                                <i class="fa fa-refresh"></i> Update Segments
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <ul class="nav nav-tabs preference-tabs">
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'overview' ? 'active' : ''}" 
                               data-tab="overview" href="#">Overview</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'preferences' ? 'active' : ''}" 
                               data-tab="preferences" href="#">Preferences</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'behavior' ? 'active' : ''}" 
                               data-tab="behavior" href="#">Behavior</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'segments' ? 'active' : ''}" 
                               data-tab="segments" href="#">Segments</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'recommendations' ? 'active' : ''}" 
                               data-tab="recommendations" href="#">Recommendations</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'gift' ? 'active' : ''}" 
                               data-tab="gift" href="#">Gift Preferences</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'loyalty' ? 'active' : ''}" 
                               data-tab="loyalty" href="#">
                                <i class="fa fa-star"></i> Loyalty Program
                                ${this.renderLoyaltyBadge()}
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'privacy' ? 'active' : ''}" 
                               data-tab="privacy" href="#">Privacy</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'marketing' ? 'active' : ''}" 
                               data-tab="marketing" href="#">
                                <i class="fa fa-bullhorn"></i> Marketing
                                ${this.renderMarketingBadge()}
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'campaigns' ? 'active' : ''}" 
                               data-tab="campaigns" href="#">
                                <i class="fa fa-envelope"></i> Campaigns
                                ${this.renderCampaignBadge()}
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'occasions' ? 'active' : ''}" 
                               data-tab="occasions" href="#">
                                <i class="fa fa-calendar"></i> Occasions
                                ${this.renderOccasionBadge()}
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link preference-tab ${this.getActiveTab() === 'automation' ? 'active' : ''}" 
                               data-tab="automation" href="#">
                                <i class="fa fa-cogs"></i> Automation
                            </a>
                        </li>
                    </ul>
                    
                    <div class="tab-content mt-3">
                        ${this.renderTabContent()}
                    </div>
                </div>
            </div>
        `;
    }

    renderTabContent() {
        const activeTab = this.getActiveTab() || 'overview';
        
        switch (activeTab) {
            case 'overview':
                return this.renderOverviewTab();
            case 'preferences':
                return this.renderPreferencesTab();
            case 'behavior':
                return this.renderBehaviorTab();
            case 'segments':
                return this.renderSegmentsTab();
            case 'recommendations':
                return this.renderRecommendationsTab();
            case 'gift':
                return this.renderGiftTab();
            case 'loyalty':
                return this.renderLoyaltyTab();
            case 'privacy':
                return this.renderPrivacyTab();
            case 'marketing':
                return this.renderMarketingTab();
            case 'campaigns':
                return this.renderCampaignsTab();
            case 'occasions':
                return this.renderOccasionsTab();
            case 'automation':
                return this.renderAutomationTab();
            default:
                return this.renderOverviewTab();
        }
    }

    renderOverviewTab() {
        const customer = this.customers.find(c => c._id === this.selectedCustomer);
        const preferences = this.preferences[this.selectedCustomer] || {};
        const behaviors = this.behaviors[this.selectedCustomer] || [];
        
        return `
            <div class="overview-content">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Customer Information</h6>
                        <table class="table table-sm">
                            <tr><td>Name:</td><td>${customer?.name || 'N/A'}</td></tr>
                            <tr><td>Email:</td><td>${customer?.email || 'N/A'}</td></tr>
                            <tr><td>Phone:</td><td>${customer?.phone || 'N/A'}</td></tr>
                            <tr><td>Member Since:</td><td>${customer?.createdAt || 'N/A'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Quick Stats</h6>
                        <div class="stat-grid">
                            <div class="stat-item">
                                <div class="stat-number">${behaviors.filter(b => b.action === 'purchase').length}</div>
                                <div class="stat-label">Total Purchases</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">$${this.calculateTotalSpent()}</div>
                                <div class="stat-label">Total Spent</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${Object.keys(preferences.categories || {}).length}</div>
                                <div class="stat-label">Categories</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${Math.floor(Math.random() * 30) + 1}</div>
                                <div class="stat-label">Days Since Last Purchase</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-12">
                        <h6>Purchase Trends</h6>
                        <canvas id="purchaseTrendsChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    renderPreferencesTab() {
        const preferences = this.preferences[this.selectedCustomer] || {};
        
        return `
            <div class="preferences-content">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Category Preferences</h6>
                        <div class="preference-list">
                            ${this.renderCategoryPreferences(preferences.categories || {})}
                        </div>
                        
                        <h6 class="mt-4">Price Range Preferences</h6>
                        <div class="preference-list">
                            ${this.renderPriceRangePreferences(preferences.priceRanges || {})}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>Seasonal Preferences</h6>
                        <div class="preference-list">
                            ${this.renderSeasonalPreferences(preferences.seasonal || {})}
                        </div>
                        
                        <h6 class="mt-4">Manual Preference Updates</h6>
                        <form id="manualPreferencesForm">
                            <div class="form-group">
                                <label>Preferred Category</label>
                                <select name="preferredCategory" class="form-control">
                                    <option value="">Select category</option>
                                    <option value="pharmaceuticals">Pharmaceuticals</option>
                                    <option value="supplements">Supplements</option>
                                    <option value="personal_care">Personal Care</option>
                                    <option value="gifts">Gifts</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Preferred Price Range</label>
                                <select name="priceRange" class="form-control">
                                    <option value="">Select range</option>
                                    <option value="low">$0 - $500</option>
                                    <option value="medium">$500 - $2,000</option>
                                    <option value="high">$2,000 - $5,000</option>
                                    <option value="premium">$5,000+</option>
                                </select>
                            </div>
                            <button type="button" class="btn btn-primary save-preferences">Save Preferences</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderBehaviorTab() {
        const behaviors = this.behaviors[this.selectedCustomer] || [];
        
        return `
            <div class="behavior-content">
                <h6>Recent Customer Behavior</h6>
                <div class="behavior-timeline">
                    ${this.renderBehaviorTimeline(behaviors)}
                </div>
                
                <h6 class="mt-4">Behavior Analytics</h6>
                <div class="row">
                    <div class="col-md-6">
                        <canvas id="behaviorChart" width="400" height="300"></canvas>
                    </div>
                    <div class="col-md-6">
                        <div class="behavior-stats">
                            ${this.renderBehaviorStats(behaviors)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSegmentsTab() {
        const segments = this.segments[this.selectedCustomer] || {};
        const segmentsData = segments.segments || {};
        
        return `
            <div class="segments-content">
                <h6>Customer Segments</h6>
                <div class="segment-cards">
                    ${this.renderSegmentCards(segmentsData)}
                </div>
                
                <h6 class="mt-4">Segment Details</h6>
                <div class="row">
                    <div class="col-md-4">
                        <div class="segment-detail">
                            <h7>Frequency Segment</h7>
                            <p>${segmentsData.frequency || 'Not calculated'}</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="segment-detail">
                            <h7>Value Segment</h7>
                            <p>${segmentsData.value || 'Not calculated'}</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="segment-detail">
                            <h7>Loyalty Segment</h7>
                            <p>${segmentsData.loyalty || 'Not calculated'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecommendationsTab() {
        const recommendations = this.recommendations[this.selectedCustomer] || {};
        const products = recommendations.products || [];
        
        return `
            <div class="recommendations-content">
                <div class="row">
                    <div class="col-md-8">
                        <h6>Personalized Recommendations</h6>
                        <div class="recommendations-list">
                            ${this.renderRecommendationsList(products)}
                        </div>
                    </div>
                    <div class="col-md-4">
                        <h6>Recommendation Insights</h6>
                        <div class="recommendation-insights">
                            <div class="insight-item">
                                <div class="insight-title">Confidence Score</div>
                                <div class="insight-value">${(products[0]?.confidence * 100 || 0).toFixed(1)}%</div>
                            </div>
                            <div class="insight-item">
                                <div class="insight-title">Based On</div>
                                <div class="insight-value">${products[0]?.reason || 'Insufficient data'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderGiftTab() {
        return `
            <div class="gift-content">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Gift Recipient Profiles</h6>
                        <div class="recipient-profiles">
                            <div class="recipient-card">
                                <div class="recipient-name">Family Members</div>
                                <div class="recipient-preferences">
                                    <span class="badge badge-success">Birthdays</span>
                                    <span class="badge badge-info">Holidays</span>
                                </div>
                            </div>
                            <div class="recipient-card">
                                <div class="recipient-name">Friends</div>
                                <div class="recipient-preferences">
                                    <span class="badge badge-warning">Festivals</span>
                                    <span class="badge badge-secondary">Special Occasions</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>Gift Occasion Preferences</h6>
                        <div class="occasion-preferences">
                            ${this.renderOccasionPreferences()}
                        </div>
                        
                        <h6 class="mt-4">Gift Budget Ranges</h6>
                        <div class="budget-ranges">
                            <div class="budget-item">
                                <span>Family Gifts:</span>
                                <span>$200 - $1000</span>
                            </div>
                            <div class="budget-item">
                                <span>Friend Gifts:</span>
                                <span>$50 - $300</span>
                            </div>
                            <div class="budget-item">
                                <span>Corporate Gifts:</span>
                                <span>$100 - $500</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPrivacyTab() {
        return `
            <div class="privacy-content">
                <h6>Privacy & Data Preferences</h6>
                <div class="privacy-settings">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" checked> Data Collection & Analysis
                        </label>
                        <small class="form-text text-muted">Allow collection of purchase and browsing data for personalization</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" checked> Personalized Recommendations
                        </label>
                        <small class="form-text text-muted">Receive personalized product recommendations</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" checked> Marketing Communications
                        </label>
                        <small class="form-text text-muted">Receive promotional offers and updates</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox"> Third-party Analytics
                        </label>
                        <small class="form-text text-muted">Allow data sharing with analytics partners</small>
                    </div>
                </div>
                
                <h6 class="mt-4">Data Management</h6>
                <div class="data-actions">
                    <button class="btn btn-outline-primary export-data">Export My Data</button>
                    <button class="btn btn-outline-danger delete-data">Delete My Data</button>
                </div>
            </div>
        `;
    }

    // Loyalty-specific rendering methods
    renderLoyaltyBadge() {
        const loyaltyProfile = this.loyaltyProfiles[this.selectedCustomer];
        if (!loyaltyProfile) return '';
        
        const tier = loyaltyProfile.tier?.tier || 'bronze';
        const balance = loyaltyProfile.points?.balance || 0;
        
        const badgeColors = {
            bronze: 'badge-bronze',
            silver: 'badge-silver', 
            gold: 'badge-gold',
            platinum: 'badge-platinum',
            diamond: 'badge-diamond'
        };
        
        return `<span class="loyalty-badge ${badgeColors[tier]} badge badge-sm">${balance} pts</span>`;
    }

    renderLoyaltyTab() {
        const loyaltyProfile = this.loyaltyProfiles[this.selectedCustomer];
        const pointsHistory = this.pointsHistory[this.selectedCustomer];
        const availableRewards = this.availableRewards[this.selectedCustomer];
        const referralData = this.referralData[this.selectedCustomer];
        
        if (!loyaltyProfile) {
            return '<div class="text-center text-muted">Loading loyalty information...</div>';
        }
        
        return `
            <div class="loyalty-content">
                <div class="row">
                    <div class="col-md-8">
                        <div class="loyalty-overview mb-4">
                            ${this.renderLoyaltyOverview(loyaltyProfile)}
                        </div>
                        
                        <div class="loyalty-tiers mb-4">
                            ${this.renderTierProgress(loyaltyProfile.tier)}
                        </div>
                        
                        <div class="points-history mb-4">
                            ${this.renderPointsHistory(pointsHistory)}
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="loyalty-benefits mb-4">
                            ${this.renderLoyaltyBenefits(loyaltyProfile.benefits)}
                        </div>
                        
                        <div class="available-rewards mb-4">
                            ${this.renderAvailableRewards(availableRewards, pointsHistory)}
                        </div>
                        
                        <div class="referral-program">
                            ${this.renderReferralProgram(referralData)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLoyaltyOverview(loyaltyProfile) {
        const tier = loyaltyProfile.tier?.tier || 'bronze';
        const points = loyaltyProfile.points || { balance: 0, lifetime: 0 };
        
        const tierConfig = {
            bronze: { name: 'Bronze', color: '#CD7F32', icon: 'bronze-star' },
            silver: { name: 'Silver', color: '#C0C0C0', icon: 'silver-star' },
            gold: { name: 'Gold', color: '#FFD700', icon: 'gold-star' },
            platinum: { name: 'Platinum', color: '#E5E4E2', icon: 'platinum-crown' },
            diamond: { name: 'Diamond', color: '#B9F2FF', icon: 'diamond-gem' }
        };
        
        const config = tierConfig[tier];
        
        return `
            <div class="card">
                <div class="card-header">
                    <h6>Loyalty Program Overview</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="loyalty-tier-display text-center p-4" 
                                 style="background: linear-gradient(135deg, ${config.color}20, ${config.color}10); border-radius: 8px;">
                                <div class="tier-icon mb-2">
                                    <i class="fa fa-star" style="color: ${config.color}; font-size: 2rem;"></i>
                                </div>
                                <div class="tier-name h5 mb-2" style="color: ${config.color};">${config.name} Member</div>
                                <div class="tier-since text-muted">Member since ${this.getCustomerJoinDate()}</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="points-display">
                                <div class="points-balance mb-3">
                                    <h3 class="text-primary">${points.balance.toLocaleString()}</h3>
                                    <div class="text-muted">Available Points</div>
                                </div>
                                <div class="lifetime-points">
                                    <h5>${points.lifetime.toLocaleString()}</h5>
                                    <div class="text-muted">Lifetime Points Earned</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTierProgress(tierData) {
        const tier = tierData?.tier || 'bronze';
        const progress = tierData?.progress || 0;
        const nextTier = tierData?.nextTier;
        
        if (!nextTier) {
            return `
                <div class="card">
                    <div class="card-header">
                        <h6>Tier Progress</h6>
                    </div>
                    <div class="card-body text-center">
                        <div class="tier-complete">
                            <i class="fa fa-trophy text-warning" style="font-size: 3rem;"></i>
                            <h5 class="mt-2">Highest Tier Achieved!</h5>
                            <p class="text-muted">You've reached the pinnacle of our loyalty program</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const nextTierName = nextTier.charAt(0).toUpperCase() + nextTier.slice(1);
        
        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6>Tier Progress</h6>
                    <small class="text-muted">Next: ${nextTierName}</small>
                </div>
                <div class="card-body">
                    <div class="progress mb-3" style="height: 8px;">
                        <div class="progress-bar bg-primary" style="width: ${progress}%" role="progressbar"></div>
                    </div>
                    <div class="progress-stats d-flex justify-content-between">
                        <span class="text-muted">Current: ${tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                        <span class="text-muted">${progress.toFixed(1)}% to ${nextTierName}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPointsHistory(pointsHistory) {
        const transactions = pointsHistory?.transactions || [];
        const recentTransactions = transactions.slice(0, 10);
        
        return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6>Points History</h6>
                    <small class="text-muted">Recent Activity</small>
                </div>
                <div class="card-body p-0">
                    ${recentTransactions.length === 0 ? 
                        '<div class="text-center text-muted p-4">No points activity yet</div>' :
                        `<div class="points-transactions">
                            ${recentTransactions.map(tx => this.renderPointsTransaction(tx)).join('')}
                        </div>`
                    }
                </div>
            </div>
        `;
    }

    renderPointsTransaction(transaction) {
        const isEarned = transaction.type === 'earned';
        const points = Math.abs(transaction.points);
        const date = new Date(transaction.timestamp).toLocaleDateString();
        
        return `
            <div class="transaction-item d-flex justify-content-between align-items-center p-3 border-bottom">
                <div class="transaction-info">
                    <div class="transaction-reason">${transaction.reason}</div>
                    <div class="transaction-date text-muted small">${date}</div>
                </div>
                <div class="transaction-points ${isEarned ? 'text-success' : 'text-danger'}">
                    ${isEarned ? '+' : '-'}${points} pts
                </div>
            </div>
        `;
    }

    renderLoyaltyBenefits(benefits) {
        if (!benefits) return '';
        
        return `
            <div class="card">
                <div class="card-header">
                    <h6>Current Benefits</h6>
                </div>
                <div class="card-body">
                    <div class="benefits-list">
                        ${benefits.pointsMultiplier > 1 ? `
                            <div class="benefit-item mb-2">
                                <i class="fa fa-times-circle text-success"></i>
                                <span>${benefits.pointsMultiplier}x Points Multiplier</span>
                            </div>
                        ` : ''}
                        ${benefits.discountPercentage > 0 ? `
                            <div class="benefit-item mb-2">
                                <i class="fa fa-percent text-primary"></i>
                                <span>${benefits.discountPercentage}% Purchase Discount</span>
                            </div>
                        ` : ''}
                        ${benefits.freeShipping ? `
                            <div class="benefit-item mb-2">
                                <i class="fa fa-truck text-info"></i>
                                <span>Free Shipping</span>
                            </div>
                        ` : ''}
                        ${benefits.earlyAccess ? `
                            <div class="benefit-item mb-2">
                                <i class="fa fa-clock text-warning"></i>
                                <span>Early Access to Sales</span>
                            </div>
                        ` : ''}
                        ${benefits.birthdayBonus ? `
                            <div class="benefit-item mb-2">
                                <i class="fa fa-gift text-danger"></i>
                                <span>${benefits.birthdayBonus} Birthday Bonus Points</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderAvailableRewards(rewards, pointsHistory) {
        const balance = pointsHistory?.balance || 0;
        const availableRewards = rewards || [];
        
        return `
            <div class="card">
                <div class="card-header">
                    <h6>Redeem Points</h6>
                </div>
                <div class="card-body">
                    ${availableRewards.length === 0 ? 
                        '<div class="text-center text-muted">No rewards available</div>' :
                        `<div class="rewards-list">
                            ${availableRewards.map(reward => this.renderRewardItem(reward, balance)).join('')}
                        </div>`
                    }
                </div>
            </div>
        `;
    }

    renderRewardItem(reward, pointsBalance) {
        const canRedeem = pointsBalance >= reward.pointsCost;
        
        return `
            <div class="reward-item border rounded p-3 mb-2 ${!canRedeem ? 'opacity-50' : ''}">
                <div class="reward-header d-flex justify-content-between align-items-start mb-2">
                    <h6 class="reward-name mb-0">${reward.name}</h6>
                    <span class="reward-cost badge badge-primary">${reward.pointsCost} pts</span>
                </div>
                <div class="reward-description text-muted small mb-2">${reward.description}</div>
                <div class="reward-actions">
                    <button class="btn btn-sm ${canRedeem ? 'btn-success' : 'btn-secondary'}" 
                            ${!canRedeem ? 'disabled' : ''}
                            onclick="window.pharmaApp.getModule('customers').redeemReward('${reward.id}')">
                        ${canRedeem ? 'Redeem Now' : `Need ${reward.pointsCost - pointsBalance} more pts`}
                    </button>
                </div>
            </div>
        `;
    }

    renderReferralProgram(referralData) {
        const data = referralData || { totalReferrals: 0, successfulReferrals: 0, totalPointsEarned: 0 };
        
        return `
            <div class="card">
                <div class="card-header">
                    <h6>Referral Program</h6>
                </div>
                <div class="card-body">
                    <div class="referral-stats mb-3">
                        <div class="stat-row d-flex justify-content-between mb-1">
                            <span>Total Referrals:</span>
                            <strong>${data.totalReferrals}</strong>
                        </div>
                        <div class="stat-row d-flex justify-content-between mb-1">
                            <span>Successful:</span>
                            <strong>${data.successfulReferrals}</strong>
                        </div>
                        <div class="stat-row d-flex justify-content-between mb-1">
                            <span>Points Earned:</span>
                            <strong>${data.totalPointsEarned}</strong>
                        </div>
                    </div>
                    <div class="referral-code mb-3">
                        <label class="form-label small">Your Referral Code</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control" value="${this.generateReferralCode()}" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="window.pharmaApp.getModule('customers').copyReferralCode()">
                                <i class="fa fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <button class="btn btn-outline-primary btn-sm w-100" 
                            onclick="window.pharmaApp.getModule('customers').shareReferralCode()">
                        <i class="fa fa-share"></i> Share Code
                    </button>
                </div>
            </div>
        `;
    }

    // Helper methods for loyalty features
    generateReferralCode() {
        if (!this.selectedCustomer) return 'CUSTOMER123';
        return `PM${this.selectedCustomer.slice(-6).toUpperCase()}`;
    }

    getCustomerJoinDate() {
        const customer = this.customers.find(c => c._id === this.selectedCustomer);
        return customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'Recently';
    }

    // Action methods for loyalty features
    async redeemReward(rewardId) {
        try {
            const response = await fetch(`${window.api}loyalty/points/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: this.selectedCustomer,
                    points: 100, // This would be dynamic based on reward
                    rewardType: 'discount',
                    rewardId: rewardId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (window.notiflix) {
                    window.notiflix.Notify.success('Reward Redeemed!', 'Your reward has been applied to your account');
                }
                // Refresh loyalty data
                await this.loadCustomerLoyaltyProfile(this.selectedCustomer);
                this.renderCustomerDetail();
            }
        } catch (error) {
            console.error('Error redeeming reward:', error);
            if (window.notiflix) {
                window.notiflix.Notify.failure('Redemption Failed', 'Unable to redeem reward at this time');
            }
        }
    }

    copyReferralCode() {
        const referralCode = this.generateReferralCode();
        navigator.clipboard.writeText(referralCode).then(() => {
            if (window.notiflix) {
                window.notiflix.Notify.success('Copied!', 'Referral code copied to clipboard');
            }
        });
    }

    shareReferralCode() {
        const referralCode = this.generateReferralCode();
        const shareText = `Join StyleMine and get 100 bonus points! Use my referral code: ${referralCode}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join StyleMine',
                text: shareText,
                url: window.location.origin
            });
        } else {
            // Fallback to copying to clipboard
            this.copyReferralCode();
        }
    }

    // Helper methods for rendering
    renderCategoryPreferences(categories) {
        if (Object.keys(categories).length === 0) {
            return '<p class="text-muted">No category preferences recorded</p>';
        }
        
        return Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .map(([category, count]) => `
                <div class="preference-item">
                    <span class="preference-name">${category.replace('_', ' ')}</span>
                    <span class="preference-count">${count} purchases</span>
                </div>
            `).join('');
    }

    renderPriceRangePreferences(priceRanges) {
        if (Object.keys(priceRanges).length === 0) {
            return '<p class="text-muted">No price range preferences recorded</p>';
        }
        
        return Object.entries(priceRanges)
            .sort((a, b) => b[1] - a[1])
            .map(([range, count]) => `
                <div class="preference-item">
                    <span class="preference-name">${range.charAt(0).toUpperCase() + range.slice(1)}</span>
                    <span class="preference-count">${count} purchases</span>
                </div>
            `).join('');
    }

    renderSeasonalPreferences(seasonal) {
        if (Object.keys(seasonal).length === 0) {
            return '<p class="text-muted">No seasonal preferences recorded</p>';
        }
        
        return Object.entries(seasonal)
            .sort((a, b) => b[1] - a[1])
            .map(([season, count]) => `
                <div class="preference-item">
                    <span class="preference-name">${season.charAt(0).toUpperCase() + season.slice(1)}</span>
                    <span class="preference-count">${count} purchases</span>
                </div>
            `).join('');
    }

    renderBehaviorTimeline(behaviors) {
        if (!behaviors.length) {
            return '<p class="text-muted">No behavior data available</p>';
        }
        
        return behaviors.slice(0, 10).map(behavior => `
            <div class="behavior-item">
                <div class="behavior-action">${behavior.action}</div>
                <div class="behavior-details">${behavior.productId || 'Product'} - $${behavior.price || 0}</div>
                <div class="behavior-time">${new Date(behavior.timestamp).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    renderBehaviorStats(behaviors) {
        const purchases = behaviors.filter(b => b.action === 'purchase');
        const views = behaviors.filter(b => b.action === 'view');
        
        return `
            <div class="stat-row">
                <span>Total Actions:</span>
                <span>${behaviors.length}</span>
            </div>
            <div class="stat-row">
                <span>Purchases:</span>
                <span>${purchases.length}</span>
            </div>
            <div class="stat-row">
                <span>Product Views:</span>
                <span>${views.length}</span>
            </div>
            <div class="stat-row">
                <span>Cart Additions:</span>
                <span>${behaviors.filter(b => b.action === 'add_to_cart').length}</span>
            </div>
        `;
    }

    renderSegmentCards(segmentsData) {
        return `
            <div class="segment-card">
                <div class="segment-header">
                    <h7>Frequency</h7>
                </div>
                <div class="segment-body">
                    <div class="segment-value">${segmentsData.frequency || 'Not calculated'}</div>
                    <div class="segment-description">
                        ${this.getSegmentDescription('frequency', segmentsData.frequency)}
                    </div>
                </div>
            </div>
            <div class="segment-card">
                <div class="segment-header">
                    <h7>Value</h7>
                </div>
                <div class="segment-body">
                    <div class="segment-value">${segmentsData.value || 'Not calculated'}</div>
                    <div class="segment-description">
                        ${this.getSegmentDescription('value', segmentsData.value)}
                    </div>
                </div>
            </div>
            <div class="segment-card">
                <div class="segment-header">
                    <h7>Loyalty</h7>
                </div>
                <div class="segment-body">
                    <div class="segment-value">${segmentsData.loyalty || 'Not calculated'}</div>
                    <div class="segment-description">
                        ${this.getSegmentDescription('loyalty', segmentsData.loyalty)}
                    </div>
                </div>
            </div>
        `;
    }

    renderRecommendationsList(products) {
        if (!products.length) {
            return '<p class="text-muted">No recommendations available</p>';
        }
        
        return products.map(product => `
            <div class="recommendation-item">
                <div class="recommendation-product">${product.productId}</div>
                <div class="recommendation-reason">${product.reason}</div>
                <div class="recommendation-confidence">${(product.confidence * 100).toFixed(1)}% match</div>
            </div>
        `).join('');
    }

    renderOccasionPreferences() {
        return `
            <div class="occasion-item">
                <span>Birthdays</span>
                <span class="badge badge-primary">High</span>
            </div>
            <div class="occasion-item">
                <span>Holidays</span>
                <span class="badge badge-success">Medium</span>
            </div>
            <div class="occasion-item">
                <span>Anniversaries</span>
                <span class="badge badge-info">High</span>
            </div>
            <div class="occasion-item">
                <span>Festivals</span>
                <span class="badge badge-warning">Low</span>
            </div>
        `;
    }

    // Utility methods
    getActiveTab() {
        return this.activeTab || 'overview';
    }

    switchPreferenceTab(tab) {
        this.activeTab = tab;
        if (this.selectedCustomer) {
            this.renderCustomerDetail();
        }
    }

    getCustomerValue(customerId) {
        // Mock customer value calculation
        return Math.random() > 0.7 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low';
    }

    calculateTotalSpent() {
        const behaviors = this.behaviors[this.selectedCustomer] || [];
        const purchases = behaviors.filter(b => b.action === 'purchase');
        return purchases.reduce((sum, b) => sum + (b.price || 0), 0).toFixed(2);
    }

    getSegmentDescription(type, value) {
        const descriptions = {
            frequency: {
                high: 'Customer makes frequent purchases',
                medium: 'Customer makes regular purchases',
                low: 'Customer makes occasional purchases'
            },
            value: {
                high: 'High-value customer',
                medium: 'Medium-value customer',
                low: 'Low-value customer'
            },
            loyalty: {
                new: 'New customer',
                growing: 'Growing loyalty',
                'at-risk': 'At-risk of churning'
            }
        };
        return descriptions[type]?.[value] || 'No description available';
    }

    // Action methods
    async savePreferences() {
        const form = document.getElementById('manualPreferencesForm');
        const formData = new FormData(form);
        const preferences = {
            manualUpdates: {
                preferredCategory: formData.get('preferredCategory'),
                priceRange: formData.get('priceRange')
            }
        };
        
        try {
            await fetch(`${window.api}customer_preferences/preferences/${this.selectedCustomer}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences)
            });
            this.loadCustomerPreferences(this.selectedCustomer);
            alert('Preferences saved successfully!');
        } catch (error) {
            console.error('Error saving preferences:', error);
            alert('Failed to save preferences');
        }
    }

    async generateRecommendations() {
        try {
            const response = await fetch(`${window.api}customer_preferences/recommendations/${this.selectedCustomer}`);
            this.recommendations[this.selectedCustomer] = await response.json();
            this.renderCustomerDetail();
        } catch (error) {
            console.error('Error generating recommendations:', error);
        }
    }

    async updateSegmentation() {
        try {
            await fetch(`${window.api}customer_preferences/segment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: this.selectedCustomer })
            });
            await this.loadCustomerSegments(this.selectedCustomer);
            this.renderCustomerDetail();
        } catch (error) {
            console.error('Error updating segmentation:', error);
        }
    }

    exportCustomerData() {
        // Mock data export
        const data = {
            customer: this.customers.find(c => c._id === this.selectedCustomer),
            preferences: this.preferences[this.selectedCustomer],
            behaviors: this.behaviors[this.selectedCustomer],
            segments: this.segments[this.selectedCustomer]
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `customer_data_${this.selectedCustomer}.json`;
        link.click();
    }

    deleteCustomerData() {
        if (confirm('Are you sure you want to delete all customer data? This action cannot be undone.')) {
            // Implement data deletion logic
            alert('Data deletion functionality would be implemented here');
        }
    }

    // Marketing-specific rendering methods
    renderMarketingBadge() {
        const activeCampaigns = this.marketingCampaigns.filter(c => c.status === 'active').length;
        return activeCampaigns > 0 ? `<span class="badge badge-success badge-sm">${activeCampaigns}</span>` : '';
    }

    renderCampaignBadge() {
        const totalCampaigns = this.marketingCampaigns.length;
        return totalCampaigns > 0 ? `<span class="badge badge-primary badge-sm">${totalCampaigns}</span>` : '';
    }

    renderOccasionBadge() {
        const upcomingOccasions = this.occasions.filter(o => {
            const occasionDate = new Date(o.timing?.startDate || o.occasionDate);
            const now = new Date();
            const daysDiff = (occasionDate - now) / (1000 * 60 * 60 * 24);
            return daysDiff > 0 && daysDiff <= 30;
        }).length;
        return upcomingOccasions > 0 ? `<span class="badge badge-warning badge-sm">${upcomingOccasions}</span>` : '';
    }

    renderMarketingTab() {
        const marketingSegments = this.marketingSegments[this.selectedCustomer] || {};
        const personalizedRecs = this.personalizedRecommendations[this.selectedCustomer] || {};
        
        return `
            <div class="marketing-content">
                <div class="row">
                    <div class="col-md-8">
                        <div class="marketing-overview mb-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6>Marketing Intelligence</h6>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary generate-segments" 
                                            data-customer-id="${this.selectedCustomer}">
                                        <i class="fa fa-users"></i> Generate Segments
                                    </button>
                                    <button class="btn btn-sm btn-outline-success send-personalized-message" 
                                            data-customer-id="${this.selectedCustomer}">
                                        <i class="fa fa-paper-plane"></i> Send Message
                                    </button>
                                </div>
                            </div>
                            ${this.renderMarketingOverview()}
                        </div>
                        
                        <div class="customer-segments mb-4">
                            <h6>Customer Segments</h6>
                            <div class="segments-grid">
                                ${this.renderMarketingSegments(marketingSegments.segments || {})}
                            </div>
                        </div>
                        
                        <div class="personalized-recommendations">
                            <h6>Personalized Recommendations</h6>
                            <div class="recommendations-list">
                                ${this.renderPersonalizedRecommendations(personalizedRecs.recommendations || [])}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="marketing-insights mb-4">
                            <h6>Marketing Insights</h6>
                            <div class="insights-list">
                                ${this.renderMarketingInsights()}
                            </div>
                        </div>
                        
                        <div class="marketing-actions">
                            <h6>Quick Actions</h6>
                            <div class="action-buttons">
                                <button class="btn btn-outline-primary btn-sm w-100 mb-2 view-marketing-analytics" 
                                        data-customer-id="${this.selectedCustomer}">
                                    <i class="fa fa-chart-bar"></i> View Analytics
                                </button>
                                <button class="btn btn-outline-info btn-sm w-100 mb-2 create-marketing-campaign" 
                                        data-customer-id="${this.selectedCustomer}">
                                    <i class="fa fa-plus"></i> Create Campaign
                                </button>
                                <button class="btn btn-outline-warning btn-sm w-100 mb-2 execute-trigger" 
                                        data-customer-id="${this.selectedCustomer}">
                                    <i class="fa fa-bolt"></i> Execute Trigger
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCampaignsTab() {
        const campaigns = this.marketingCampaigns.filter(c => 
            !c.targeting?.customerIds || c.targeting.customerIds.includes(this.selectedCustomer)
        );
        
        return `
            <div class="campaigns-content">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h6>Marketing Campaigns</h6>
                    <button class="btn btn-primary btn-sm create-marketing-campaign" 
                            data-customer-id="${this.selectedCustomer}">
                        <i class="fa fa-plus"></i> Create Campaign
                    </button>
                </div>
                
                <div class="campaigns-grid">
                    ${this.renderCampaignsList(campaigns)}
                </div>
                
                <div class="campaign-performance mt-4">
                    <h6>Campaign Performance</h6>
                    <div class="performance-charts">
                        <canvas id="campaignPerformanceChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    renderOccasionsTab() {
        const customerOccasions = this.customerOccasions[this.selectedCustomer] || [];
        const upcomingOccasions = this.occasions.filter(o => {
            const occasionDate = new Date(o.timing?.startDate || o.occasionDate);
            const now = new Date();
            return occasionDate > now;
        });
        
        return `
            <div class="occasions-content">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h6>Occasion Management</h6>
                    <div>
                        <button class="btn btn-sm btn-outline-primary add-customer-occasion" 
                                data-customer-id="${this.selectedCustomer}">
                            <i class="fa fa-plus"></i> Add Occasion
                        </button>
                        <button class="btn btn-sm btn-outline-success view-upcoming-occasions">
                            <i class="fa fa-calendar-alt"></i> Upcoming
                        </button>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="customer-occasions">
                            <h6>Customer Occasions</h6>
                            <div class="occasions-list">
                                ${this.renderCustomerOccasions(customerOccasions)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="available-occasions">
                            <h6>Available Occasions</h6>
                            <div class="occasions-list">
                                ${this.renderAvailableOccasions(upcomingOccasions)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="occasion-tagged-products mt-4">
                    <h6>Tagged Products</h6>
                    <div class="tagging-tools">
                        <button class="btn btn-sm btn-outline-info tag-occasion" 
                                data-customer-id="${this.selectedCustomer}">
                            <i class="fa fa-tag"></i> Tag Product with Occasion
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderAutomationTab() {
        const workflows = this.marketingWorkflows.filter(w => 
            !w.conditions?.customerIds || w.conditions.customerIds.includes(this.selectedCustomer)
        );
        
        return `
            <div class="automation-content">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h6>Marketing Automation</h6>
                    <button class="btn btn-primary btn-sm create-workflow" 
                            data-customer-id="${this.selectedCustomer}">
                        <i class="fa fa-plus"></i> Create Workflow
                    </button>
                </div>
                
                <div class="workflows-grid">
                    ${this.renderWorkflowsList(workflows)}
                </div>
                
                <div class="automation-rules mt-4">
                    <h6>Active Automation Rules</h6>
                    <div class="rules-list">
                        ${this.renderAutomationRules()}
                    </div>
                </div>
            </div>
        `;
    }

    renderMarketingOverview() {
        const segments = this.marketingSegments[this.selectedCustomer] || {};
        const recs = this.personalizedRecommendations[this.selectedCustomer] || {};
        
        return `
            <div class="overview-stats">
                <div class="row">
                    <div class="col-md-3">
                        <div class="stat-item text-center">
                            <div class="stat-value">${Object.keys(segments.segments || {}).length}</div>
                            <div class="stat-label">Segments</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-item text-center">
                            <div class="stat-value">${(recs.recommendations || []).length}</div>
                            <div class="stat-label">Recommendations</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-item text-center">
                            <div class="stat-value">${this.marketingCampaigns.filter(c => c.status === 'active').length}</div>
                            <div class="stat-label">Active Campaigns</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-item text-center">
                            <div class="stat-value">${this.occasions.filter(o => o.status === 'active').length}</div>
                            <div class="stat-label">Active Occasions</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMarketingSegments(segments) {
        if (!segments || Object.keys(segments).length === 0) {
            return '<p class="text-muted">No segments generated yet</p>';
        }
        
        return Object.entries(segments).map(([type, segment]) => `
            <div class="segment-card">
                <div class="segment-header">
                    <h7>${type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h7>
                </div>
                <div class="segment-body">
                    <div class="segment-value">${segment}</div>
                    <div class="segment-description">${this.getSegmentDescription(type, segment)}</div>
                </div>
            </div>
        `).join('');
    }

    renderPersonalizedRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<p class="text-muted">No personalized recommendations available</p>';
        }
        
        return recommendations.slice(0, 5).map(rec => `
            <div class="recommendation-item">
                <div class="recommendation-product">${rec.productName || rec.productId}</div>
                <div class="recommendation-reason">${rec.reason}</div>
                <div class="recommendation-confidence">${(rec.confidence * 100).toFixed(1)}% match</div>
                <div class="recommendation-price">${rec.price || 'N/A'}</div>
            </div>
        `).join('');
    }

    renderMarketingInsights() {
        return `
            <div class="insight-item">
                <div class="insight-title">Best Contact Time</div>
                <div class="insight-value">Evening (6-8 PM)</div>
            </div>
            <div class="insight-item">
                <div class="insight-title">Preferred Channel</div>
                <div class="insight-value">Email</div>
            </div>
            <div class="insight-item">
                <div class="insight-title">Engagement Rate</div>
                <div class="insight-value">78%</div>
            </div>
            <div class="insight-item">
                <div class="insight-title">Conversion Probability</div>
                <div class="insight-value">High</div>
            </div>
        `;
    }

    renderCampaignsList(campaigns) {
        if (!campaigns || campaigns.length === 0) {
            return '<p class="text-muted">No campaigns found</p>';
        }
        
        return campaigns.map(campaign => `
            <div class="campaign-card">
                <div class="campaign-header">
                    <h7>${campaign.campaignName}</h7>
                    <span class="badge badge-${campaign.status === 'active' ? 'success' : 'secondary'}">${campaign.status}</span>
                </div>
                <div class="campaign-body">
                    <div class="campaign-type">${campaign.campaignType}</div>
                    <div class="campaign-stats">
                        <small>Sent: ${campaign.performanceMetrics?.sent || 0} | 
                        Opened: ${campaign.performanceMetrics?.opened || 0} | 
                        Converted: ${campaign.performanceMetrics?.converted || 0}</small>
                    </div>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-sm btn-outline-primary view-campaign-details" 
                            data-campaign-id="${campaign._id}">View Details</button>
                    ${campaign.status === 'draft' ? `
                        <button class="btn btn-sm btn-success activate-campaign" 
                                data-campaign-id="${campaign._id}">Activate</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderCustomerOccasions(occasions) {
        if (!occasions || occasions.length === 0) {
            return '<p class="text-muted">No customer occasions added</p>';
        }
        
        return occasions.map(occasion => `
            <div class="occasion-item">
                <div class="occasion-name">${occasion.occasionName}</div>
                <div class="occasion-date">${new Date(occasion.occasionDate).toLocaleDateString()}</div>
                <div class="occasion-type">${occasion.occasionType}</div>
            </div>
        `).join('');
    }

    renderAvailableOccasions(occasions) {
        if (!occasions || occasions.length === 0) {
            return '<p class="text-muted">No upcoming occasions</p>';
        }
        
        return occasions.slice(0, 5).map(occasion => `
            <div class="occasion-item">
                <div class="occasion-name">${occasion.occasionName}</div>
                <div class="occasion-date">${new Date(occasion.timing?.startDate || occasion.occasionDate).toLocaleDateString()}</div>
                <div class="occasion-type">${occasion.occasionType}</div>
            </div>
        `).join('');
    }

    renderWorkflowsList(workflows) {
        if (!workflows || workflows.length === 0) {
            return '<p class="text-muted">No workflows found</p>';
        }
        
        return workflows.map(workflow => `
            <div class="workflow-card">
                <div class="workflow-header">
                    <h7>${workflow.workflowName}</h7>
                    <span class="badge badge-${workflow.status === 'active' ? 'success' : 'secondary'}">${workflow.status}</span>
                </div>
                <div class="workflow-body">
                    <div class="workflow-trigger">Trigger: ${workflow.triggerType}</div>
                    <div class="workflow-executions">Executions: ${workflow.executionCount || 0}</div>
                </div>
            </div>
        `).join('');
    }

    renderAutomationRules() {
        const rules = [
            { name: 'Birthday Campaign', condition: 'Customer birthday in 7 days', action: 'Send birthday offer' },
            { name: 'Win-back Campaign', condition: 'No purchase in 90 days', action: 'Send win-back email' },
            { name: 'Anniversary Campaign', condition: 'Customer anniversary approaching', action: 'Send anniversary gift suggestions' },
            { name: 'Seasonal Campaign', condition: 'New season starting', action: 'Send seasonal collection' }
        ];
        
        return rules.map(rule => `
            <div class="rule-item">
                <div class="rule-name">${rule.name}</div>
                <div class="rule-condition">${rule.condition}</div>
                <div class="rule-action">${rule.action}</div>
            </div>
        `).join('');
    }

    // Marketing action methods
    async createMarketingCampaign() {
        const campaignData = {
            campaignName: `Personalized Campaign for ${this.selectedCustomer}`,
            campaignType: 'personalized',
            targeting: {
                customerIds: [this.selectedCustomer],
                segments: ['all']
            },
            content: {
                subject: 'Special Offer Just for You!',
                message: 'We have curated special products based on your preferences.',
                callToAction: 'Shop Now'
            },
            timing: {
                sendImmediately: true,
                timezone: 'UTC'
            }
        };
        
        try {
            const response = await fetch(`${window.api}marketing_automation/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignData)
            });
            
            if (response.ok) {
                if (window.notiflix) {
                    window.notiflix.Notify.success('Campaign Created!', 'Marketing campaign created successfully');
                }
                this.loadMarketingCampaigns();
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            if (window.notiflix) {
                window.notiflix.Notify.failure('Campaign Creation Failed', 'Unable to create marketing campaign');
            }
        }
    }

    async activateCampaign(campaignId) {
        try {
            const response = await fetch(`${window.api}marketing_automation/campaigns/${campaignId}/activate`, {
                method: 'POST'
            });
            
            if (response.ok) {
                if (window.notiflix) {
                    window.notiflix.Notify.success('Campaign Activated!', 'Marketing campaign is now active');
                }
                this.loadMarketingCampaigns();
            }
        } catch (error) {
            console.error('Error activating campaign:', error);
        }
    }

    async generateMarketingSegments() {
        try {
            const response = await fetch(`${window.api}marketing_automation/segments/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerIds: [this.selectedCustomer],
                    segmentationType: 'comprehensive'
                })
            });
            
            const result = await response.json();
            if (result.segments) {
                this.marketingSegments[this.selectedCustomer] = result.segments[0];
                this.renderCustomerDetail();
                if (window.notiflix) {
                    window.notiflix.Notify.success('Segments Generated!', `${result.count} customer segments created`);
                }
            }
        } catch (error) {
            console.error('Error generating segments:', error);
        }
    }

    async viewMarketingAnalytics() {
        try {
            const response = await fetch(`${window.api}marketing_analytics?customerId=${this.selectedCustomer}`);
            const analytics = await response.json();
            
            // Display analytics in modal or dedicated view
            console.log('Marketing Analytics:', analytics);
            
            if (window.notiflix) {
                window.notiflix.Notify.info('Analytics Loaded', 'Marketing analytics displayed');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async addCustomerOccasion() {
        const occasionData = {
            occasionName: prompt('Enter occasion name (e.g., Birthday, Anniversary):'),
            occasionDate: prompt('Enter date (YYYY-MM-DD):'),
            occasionType: prompt('Enter occasion type (birthday, anniversary, festival, etc.):'),
            isAnnual: confirm('Is this an annual occasion?')
        };
        
        if (occasionData.occasionName && occasionData.occasionDate) {
            try {
                const response = await fetch(`${window.api}marketing_automation/customers/${this.selectedCustomer}/occasions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(occasionData)
                });
                
                if (response.ok) {
                    this.loadCustomerOccasions(this.selectedCustomer);
                    if (window.notiflix) {
                        window.notiflix.Notify.success('Occasion Added!', 'Customer occasion saved successfully');
                    }
                }
            } catch (error) {
                console.error('Error adding occasion:', error);
            }
        }
    }

    async viewUpcomingOccasions() {
        try {
            const response = await fetch(`${window.api}marketing_automation/occasions/upcoming?days=30`);
            const occasions = await response.json();
            
            // Display upcoming occasions
            const occasionsList = occasions.map(o => `${o.occasionName} - ${new Date(o.timing?.startDate).toLocaleDateString()}`).join('\n');
            alert(`Upcoming Occasions:\n${occasionsList}`);
            
        } catch (error) {
            console.error('Error loading upcoming occasions:', error);
        }
    }

    async tagProductWithOccasion() {
        const productId = prompt('Enter product ID to tag:');
        const occasionId = prompt('Enter occasion ID:');
        
        if (productId && occasionId) {
            try {
                const response = await fetch(`${window.api}marketing_automation/products/tag-occasion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: productId,
                        occasionId: occasionId,
                        relevanceScore: 1.0
                    })
                });
                
                if (response.ok) {
                    if (window.notiflix) {
                        window.notiflix.Notify.success('Product Tagged!', 'Product tagged with occasion successfully');
                    }
                }
            } catch (error) {
                console.error('Error tagging product:', error);
            }
        }
    }

    async createMarketingWorkflow() {
        const workflowData = {
            workflowName: prompt('Enter workflow name:'),
            triggerType: prompt('Enter trigger type (purchase, birthday, anniversary, etc.):'),
            conditions: [
                {
                    type: 'customer_segment',
                    value: 'all'
                }
            ],
            actions: [
                {
                    type: 'send_email',
                    template: 'default',
                    delay: 0
                }
            ]
        };
        
        if (workflowData.workflowName && workflowData.triggerType) {
            try {
                const response = await fetch(`${window.api}marketing_automation/workflows`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workflowData)
                });
                
                if (response.ok) {
                    this.loadMarketingWorkflows();
                    if (window.notiflix) {
                        window.notiflix.Notify.success('Workflow Created!', 'Marketing workflow created successfully');
                    }
                }
            } catch (error) {
                console.error('Error creating workflow:', error);
            }
        }
    }

    async sendPersonalizedMessage() {
        const message = prompt('Enter personalized message:');
        const channel = prompt('Enter channel (email/sms/push):');
        
        if (message && channel) {
            // In real implementation, this would integrate with email/SMS services
            if (window.notiflix) {
                window.notiflix.Notify.success('Message Sent!', `Personalized ${channel} message sent successfully`);
            }
        }
    }

    async executeMarketingTrigger() {
        const triggerType = prompt('Enter trigger type (purchase, birthday, anniversary):');
        
        if (triggerType) {
            try {
                const response = await fetch(`${window.api}marketing_automation/triggers/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        triggerType: triggerType,
                        customerId: this.selectedCustomer,
                        data: {
                            orderValue: 1000,
                            daysSinceLastPurchase: 30
                        }
                    })
                });
                
                if (response.ok) {
                    if (window.notiflix) {
                        window.notiflix.Notify.success('Trigger Executed!', 'Marketing trigger executed successfully');
                    }
                }
            } catch (error) {
                console.error('Error executing trigger:', error);
            }
        }
    }

    // Load marketing data methods
    async loadMarketingCampaigns() {
        try {
            const response = await fetch(`${window.api}marketing_automation/campaigns`);
            this.marketingCampaigns = await response.json();
        } catch (error) {
            console.error('Error loading campaigns:', error);
        }
    }

    async loadOccasions() {
        try {
            const response = await fetch(`${window.api}marketing_automation/occasions/active`);
            this.occasions = await response.json();
        } catch (error) {
            console.error('Error loading occasions:', error);
        }
    }

    async loadMarketingWorkflows() {
        try {
            const response = await fetch(`${window.api}marketing_automation/workflows`);
            this.marketingWorkflows = await response.json();
        } catch (error) {
            console.error('Error loading workflows:', error);
        }
    }

    async loadCustomerOccasions(customerId) {
        try {
            const response = await fetch(`${window.api}marketing_automation/customers/${customerId}/occasions`);
            this.customerOccasions[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading customer occasions:', error);
        }
    }

    async loadPersonalizedRecommendations(customerId) {
        try {
            const response = await fetch(`${window.api}marketing_automation/recommendations/${customerId}`);
            this.personalizedRecommendations[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    async loadMarketingSegments(customerId) {
        try {
            const response = await fetch(`${window.api}marketing_automation/segments/${customerId}`);
            this.marketingSegments[customerId] = await response.json();
        } catch (error) {
            console.error('Error loading marketing segments:', error);
        }
    }

    // Enhanced selectCustomer to load marketing data
    async selectCustomer(customerId) {
        this.selectedCustomer = customerId;
        await Promise.all([
            this.loadCustomerPreferences(customerId),
            this.loadCustomerBehavior(customerId),
            this.loadCustomerSegments(customerId),
            this.loadRecommendations(customerId),
            this.loadCustomerLoyaltyProfile(customerId),
            this.loadPersonalizedRecommendations(customerId),
            this.loadMarketingSegments(customerId),
            this.loadCustomerOccasions(customerId)
        ]);
        
        // Load marketing campaigns and occasions
        await Promise.all([
            this.loadMarketingCampaigns(),
            this.loadOccasions(),
            this.loadMarketingWorkflows()
        ]);
        
        this.renderCustomerDetail();
    }
}

// Make CustomersModule available globally
window.CustomersModule = CustomersModule;