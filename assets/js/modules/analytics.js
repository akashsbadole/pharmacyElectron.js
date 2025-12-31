/**
 * Analytics Module - Restaurant Analytics Dashboard
 * Provides comprehensive business intelligence and reporting
 */

class AnalyticsModule {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.currentView = 'dashboard';
        this.dateRange = {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            end: new Date()
        };
        this.analyticsData = {};
        this.loading = false;
        this.refreshInterval = null;
    }

    initialize() {
        console.log('Analytics module initialized');
        this.setupEventListeners();
    }

    onActivate() {
        this.loadAnalyticsData();
        this.startAutoRefresh();
        this.initializeCharts();
    }

    onDeactivate() {
        this.stopAutoRefresh();
    }

    setupEventListeners() {
        // Handle view switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-analytics-view]')) {
                e.preventDefault();
                const view = e.target.getAttribute('data-analytics-view');
                this.switchView(view);
            }
        });

        // Handle date range changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-date-range]')) {
                this.updateDateRange();
            }
        });

        // Handle export actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-export]')) {
                e.preventDefault();
                const format = e.target.getAttribute('data-export');
                this.exportData(format);
            }
        });

        // Handle refresh
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-refresh-analytics]')) {
                e.preventDefault();
                this.refreshData();
            }
        });
    }

    async initializeCharts() {
        // Wait for Chart.js to be loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, charts will not be available');
            return;
        }

        // Set Chart.js defaults
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        Chart.defaults.color = '#6c757d';
        Chart.defaults.plugins.legend.position = 'bottom';
        Chart.defaults.plugins.legend.labels.padding = 20;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        
        // Initialize charts after DOM is ready
        setTimeout(() => {
            this.createAllCharts();
        }, 100);
    }

    createAllCharts() {
        this.createRevenueTrendChart();
        this.createPeakHoursChart();
        this.createSalesCharts();
        this.createMenuCharts();
        this.createMenuEngineeringCharts();
        this.createKitchenCharts();
        this.createTableCharts();
        this.createComboCharts();
        this.createCustomerCharts();
        this.createFinancialCharts();
        this.createOperationalCharts();
    }

    createRevenueTrendChart() {
        const canvas = document.getElementById('revenue-trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.sales?.revenue_trends || {};
        
        const labels = Object.keys(data).sort();
        const revenues = labels.map(date => data[date].revenue);
        const orders = labels.map(date => data[date].orders);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Orders',
                    data: orders,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        },
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Orders'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    createPeakHoursChart() {
        const canvas = document.getElementById('peak-hours-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.sales?.hourly_patterns || {};
        
        const hours = Array.from({length: 24}, (_, i) => i);
        const revenues = hours.map(hour => data[hour]?.revenue || 0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Revenue by Hour',
                    data: revenues,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createSalesCharts() {
        this.createSalesTrendChart();
        this.createHourlySalesChart();
        this.createDailySalesChart();
    }

    createSalesTrendChart() {
        const canvas = document.getElementById('sales-trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.sales?.revenue_trends || {};
        
        const labels = Object.keys(data).sort();
        const revenues = labels.map(date => data[date].revenue);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Revenue',
                    data: revenues,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales Trend Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        }
                    }
                }
            }
        });
    }

    createHourlySalesChart() {
        const canvas = document.getElementById('hourly-sales-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.sales?.hourly_patterns || {};
        
        const hours = Array.from({length: 24}, (_, i) => i);
        const revenues = hours.map(hour => data[hour]?.revenue || 0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Hourly Revenue',
                    data: revenues,
                    backgroundColor: 'rgba(255, 193, 7, 0.6)',
                    borderColor: '#ffc107',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales by Hour of Day'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hour'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        }
                    }
                }
            }
        });
    }

    createDailySalesChart() {
        const canvas = document.getElementById('daily-sales-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.sales?.daily_patterns || {};
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const revenues = [0, 1, 2, 3, 4, 5, 6].map(day => data[day]?.revenue || 0);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: dayNames,
                datasets: [{
                    label: 'Revenue by Day',
                    data: revenues,
                    backgroundColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffce56',
                        '#4bc0c0',
                        '#9966ff',
                        '#ff9f40',
                        '#ff6384'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales by Day of Week'
                    }
                }
            }
        });
    }

    createMenuCharts() {
        this.createCategoryPerformanceChart();
        this.createMenuEngineeringChart();
    }

    createMenuEngineeringCharts() {
        this.createMenuEngineeringMatrixChart();
        this.createMenuEngineeringScatterChart();
    }

    createCategoryPerformanceChart() {
        const canvas = document.getElementById('category-performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.menu_performance?.category_performance || {};
        
        const categories = Object.keys(data);
        const revenues = categories.map(cat => data[cat].revenue);
        const sales = categories.map(cat => data[cat].sales);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: '#4bc0c0',
                    borderWidth: 2
                }, {
                    label: 'Items Sold',
                    data: sales,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: '#9966ff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Category Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createMenuEngineeringChart() {
        const canvas = document.getElementById('menu-engineering-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const engineering = this.analyticsData.menu_performance?.menu_engineering || {};
        
        const categories = ['Stars', 'Plow Horses', 'Puzzles', 'Dogs'];
        const data = [
            engineering.stars?.length || 0,
            engineering.plow_horses?.length || 0,
            engineering.puzzles?.length || 0,
            engineering.dogs?.length || 0
        ];

        new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: categories,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.6)',
                        'rgba(255, 193, 7, 0.6)',
                        'rgba(220, 53, 69, 0.6)',
                        'rgba(108, 117, 125, 0.6)'
                    ],
                    borderColor: [
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#6c757d'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Menu Engineering Matrix'
                    }
                }
            }
        });
    }

    createKitchenCharts() {
        this.createStationPerformanceChart();
        this.createKitchenHourlyChart();
    }

    createStationPerformanceChart() {
        const canvas = document.getElementById('station-performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.kitchen?.station_performance || {};
        
        const stations = Object.keys(data);
        const completionRates = stations.map(station => data[station].completion_rate || 0);
        const avgPrepTimes = stations.map(station => data[station].average_prep_time || 0);

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: stations,
                datasets: [{
                    label: 'Completion Rate (%)',
                    data: completionRates,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderWidth: 2
                }, {
                    label: 'Avg Prep Time (min)',
                    data: avgPrepTimes,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Kitchen Station Performance'
                    }
                }
            }
        });
    }

    createKitchenHourlyChart() {
        const canvas = document.getElementById('kitchen-hourly-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.kitchen?.hourly_breakdown || {};
        
        const hours = Array.from({length: 24}, (_, i) => i);
        const orderCounts = hours.map(hour => data[hour] || 0);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Orders per Hour',
                    data: orderCounts,
                    borderColor: '#fd7e14',
                    backgroundColor: 'rgba(253, 126, 20, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Kitchen Order Volume by Hour'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Orders'
                        }
                    }
                }
            }
        });
    }

    createTableCharts() {
        this.createTableUtilizationChart();
        this.createRevenuePerTableChart();
    }

    createTableUtilizationChart() {
        const canvas = document.getElementById('table-utilization-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.table_analytics?.table_utilization || {};
        
        const tables = Object.values(data);
        const tableNumbers = tables.map(table => `Table ${table.table_number}`);
        const utilizationRates = tables.map(table => table.utilization_percentage || 0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: tableNumbers,
                datasets: [{
                    label: 'Utilization Rate (%)',
                    data: utilizationRates,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: '#36a2eb',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Table Utilization Rates'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Utilization (%)'
                        }
                    }
                }
            }
        });
    }

    createRevenuePerTableChart() {
        const canvas = document.getElementById('revenue-per-table-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.table_analytics?.revenue_per_table || {};
        
        const tableNumbers = Object.keys(data);
        const revenues = tableNumbers.map(table => data[table].total_revenue || 0);

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: tableNumbers.map(table => `Table ${table}`),
                datasets: [{
                    label: 'Revenue by Table',
                    data: revenues,
                    backgroundColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffce56',
                        '#4bc0c0',
                        '#9966ff',
                        '#ff9f40',
                        '#ff6384',
                        '#36a2eb'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue Distribution by Table'
                    }
                }
            }
        });
    }

    createComboCharts() {
        this.createComboPerformanceChart();
        this.createComboCategoryChart();
    }

    createComboPerformanceChart() {
        const canvas = document.getElementById('combo-performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.combo_performance?.top_performing_combos || [];
        
        if (data.length === 0) return;
        
        const comboNames = data.slice(0, 5).map(combo => combo.combo_name);
        const sales = data.slice(0, 5).map(combo => combo.total_sold || 0);
        const revenues = data.slice(0, 5).map(combo => combo.revenue_generated || 0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: comboNames,
                datasets: [{
                    label: 'Units Sold',
                    data: sales,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: '#ff6384',
                    borderWidth: 2
                }, {
                    label: 'Revenue ($)',
                    data: revenues,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: '#36a2eb',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 5 Combo Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createComboCategoryChart() {
        const canvas = document.getElementById('combo-category-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.combo_performance?.category_performance || {};
        
        const categories = Object.keys(data);
        const revenues = categories.map(cat => data[cat].revenue || 0);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Revenue by Category',
                    data: revenues,
                    backgroundColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffce56',
                        '#4bc0c0',
                        '#9966ff'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Combo Revenue by Category'
                    }
                }
            }
        });
    }

    createCustomerCharts() {
        this.createCustomerSegmentsChart();
        this.createVisitPatternsChart();
    }

    createCustomerSegmentsChart() {
        const canvas = document.getElementById('customer-segments-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.customer_analytics?.customer_segments || {};
        
        const segments = Object.keys(data);
        const counts = segments.map(segment => data[segment]);

        new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: segments,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)'
                    ],
                    borderColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffce56',
                        '#4bc0c0'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Customer Segments Distribution'
                    }
                }
            }
        });
    }

    createVisitPatternsChart() {
        const canvas = document.getElementById('visit-patterns-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.customer_analytics?.visit_patterns?.peak_hours || [];
        
        if (data.length === 0) return;
        
        const hours = data.map(item => `${item.hour}:00`);
        const visits = data.map(item => item.visits);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Customer Visits',
                    data: visits,
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Peak Visit Hours'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Visits'
                        }
                    }
                }
            }
        });
    }

    createFinancialCharts() {
        this.createRevenueCostsChart();
        this.createCostBreakdownChart();
    }

    createRevenueCostsChart() {
        const canvas = document.getElementById('revenue-costs-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.financial;
        
        if (!data) return;
        
        const revenue = data.revenue_analytics?.total_revenue || 0;
        const costs = data.cost_analysis?.total_operating_costs || 0;
        const profit = data.profitability_metrics?.net_profit || 0;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Revenue', 'Operating Costs', 'Net Profit'],
                datasets: [{
                    label: 'Amount ($)',
                    data: [revenue, costs, profit],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.6)',
                        'rgba(220, 53, 69, 0.6)',
                        'rgba(255, 193, 7, 0.6)'
                    ],
                    borderColor: [
                        '#28a745',
                        '#dc3545',
                        '#ffc107'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue vs Costs Analysis'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        }
                    }
                }
            }
        });
    }

    createCostBreakdownChart() {
        const canvas = document.getElementById('cost-breakdown-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.financial?.cost_analysis || {};
        
        const costs = [
            data.total_cogs || 0,
            data.labor_cost_estimate || 0,
            data.operating_expenses_estimate || 0
        ];

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['COGS', 'Labor Costs', 'Operating Expenses'],
                datasets: [{
                    data: costs,
                    backgroundColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffce56'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cost Breakdown'
                    }
                }
            }
        });
    }

    createOperationalCharts() {
        this.createEfficiencyMetricsChart();
        this.createQualityIndicatorsChart();
    }

    createEfficiencyMetricsChart() {
        const canvas = document.getElementById('efficiency-metrics-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.operational?.efficiency_metrics || {};
        
        const metrics = [
            data.order_completion_rate || 0,
            data.table_turnover_rate || 0,
            data.kitchen_utilization || 0
        ];

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Order Completion', 'Table Turnover', 'Kitchen Utilization'],
                datasets: [{
                    label: 'Efficiency (%)',
                    data: metrics,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Operational Efficiency Metrics'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    createQualityIndicatorsChart() {
        const canvas = document.getElementById('quality-indicators-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.operational?.quality_metrics || {};

        const indicators = [
            data.on_time_delivery_rate || 0,
            data.customer_satisfaction_estimate || 0,
            data.order_accuracy_rate || 0
        ];

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['On-Time Delivery', 'Customer Satisfaction', 'Order Accuracy'],
                datasets: [{
                    data: indicators,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.6)',
                        'rgba(0, 123, 255, 0.6)',
                        'rgba(255, 193, 7, 0.6)'
                    ],
                    borderColor: [
                        '#28a745',
                        '#007bff',
                        '#ffc107'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Quality Performance Indicators'
                    }
                }
            }
        });
    }

    createMenuEngineeringMatrixChart() {
        const canvas = document.getElementById('menu-engineering-matrix-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.menu_engineering?.matrix || {};

        const categories = ['Stars', 'Plow Horses', 'Puzzles', 'Dogs'];
        const counts = [
            data.stars?.length || 0,
            data.plow_horses?.length || 0,
            data.puzzles?.length || 0,
            data.dogs?.length || 0
        ];

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Number of Items',
                    data: counts,
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        '#28a745',
                        '#ffc107',
                        '#ffc107',
                        '#dc3545'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Menu Engineering Matrix Distribution'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Menu Items'
                        }
                    }
                }
            }
        });
    }

    createMenuEngineeringScatterChart() {
        const canvas = document.getElementById('menu-engineering-scatter-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.menu_engineering?.matrix_data || [];
        const averages = this.analyticsData.menu_engineering?.matrix?.averages || {};

        if (data.length === 0) return;

        // Prepare datasets for different categories
        const datasets = [
            {
                label: 'Stars',
                data: data.filter(item => item.category === 'star').map(item => ({
                    x: item.popularity,
                    y: item.profitability
                })),
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: '#28a745',
                borderWidth: 2,
                pointRadius: 6
            },
            {
                label: 'Plow Horses',
                data: data.filter(item => item.category === 'plowhorse').map(item => ({
                    x: item.popularity,
                    y: item.profitability
                })),
                backgroundColor: 'rgba(255, 193, 7, 0.8)',
                borderColor: '#ffc107',
                borderWidth: 2,
                pointRadius: 6
            },
            {
                label: 'Puzzles',
                data: data.filter(item => item.category === 'puzzle').map(item => ({
                    x: item.popularity,
                    y: item.profitability
                })),
                backgroundColor: 'rgba(23, 162, 184, 0.8)',
                borderColor: '#17a2b8',
                borderWidth: 2,
                pointRadius: 6
            },
            {
                label: 'Dogs',
                data: data.filter(item => item.category === 'dog').map(item => ({
                    x: item.popularity,
                    y: item.profitability
                })),
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: '#dc3545',
                borderWidth: 2,
                pointRadius: 6
            }
        ];

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Profitability vs Popularity Matrix'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const item = data.find(d => d.popularity === context.parsed.x && d.profitability === context.parsed.y);
                                return item ? `${item.name}: Profit ${context.parsed.y.toFixed(1)}%, Popularity ${context.parsed.x}` : '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Popularity (Sales Volume)'
                        },
                        grid: {
                            drawOnChartArea: true
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Profitability (%)'
                        },
                        grid: {
                            drawOnChartArea: true
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            },
            plugins: [{
                id: 'quadrants',
                afterDraw: function(chart) {
                    const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;

                    // Draw quadrant lines
                    const avgProfitability = averages.profitability || 0;
                    const avgPopularity = averages.popularity || 0;

                    const profitY = y.getPixelForValue(avgProfitability);
                    const popularX = x.getPixelForValue(avgPopularity);

                    ctx.save();
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);

                    // Vertical line (average popularity)
                    ctx.beginPath();
                    ctx.moveTo(popularX, top);
                    ctx.lineTo(popularX, bottom);
                    ctx.stroke();

                    // Horizontal line (average profitability)
                    ctx.beginPath();
                    ctx.moveTo(left, profitY);
                    ctx.lineTo(right, profitY);
                    ctx.stroke();

                    ctx.restore();
                }
            }]
        });
    }

    async loadAnalyticsData() {
        if (this.loading) return;

        this.loading = true;
        this.updateLoadingState(true);

        try {
            const params = new URLSearchParams({
                start_date: this.dateRange.start.toISOString(),
                end_date: this.dateRange.end.toISOString()
            });

            // Fetch dashboard data
            const dashboardResponse = await fetch(`${window.api}analytics/dashboard?${params}`);
            if (dashboardResponse.ok) {
                this.analyticsData = await dashboardResponse.json();
            } else {
                throw new Error('Failed to load analytics data');
            }

            // Fetch additional menu engineering data
            try {
                const menuEngResponse = await fetch(`${window.api}analytics/menu-engineering?${params}`);
                if (menuEngResponse.ok) {
                    this.analyticsData.menu_engineering = await menuEngResponse.json();
                }
            } catch (error) {
                console.warn('Menu engineering data not available:', error);
                this.analyticsData.menu_engineering = {};
            }

            this.render();
        } catch (error) {
            console.error('Error loading analytics data:', error);
            this.showError('Failed to load analytics data');
        } finally {
            this.loading = false;
            this.updateLoadingState(false);
        }
    }

    switchView(view) {
        this.currentView = view;
        this.render();
    }

    updateDateRange() {
        const startInput = document.querySelector('[data-date-range="start"]');
        const endInput = document.querySelector('[data-date-range="end"]');

        if (startInput && endInput) {
            this.dateRange.start = new Date(startInput.value);
            this.dateRange.end = new Date(endInput.value);
            this.loadAnalyticsData();
        }
    }

    async refreshData() {
        await this.loadAnalyticsData();
        this.showSuccess('Analytics data refreshed');
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.loadAnalyticsData();
        }, 300000); // Refresh every 5 minutes
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    updateLoadingState(loading) {
        const loadingElements = document.querySelectorAll('.analytics-loading');
        loadingElements.forEach(el => {
            if (loading) {
                el.classList.add('loading');
            } else {
                el.classList.remove('loading');
            }
        });
    }

    showError(message) {
        if (window.notiflix) {
            window.notiflix.Report.failure('Error', message, 'Ok');
        }
    }

    showSuccess(message) {
        if (window.notiflix) {
            window.notiflix.Report.success('Success', message, 'Ok');
        }
    }

    async exportData(format) {
        try {
            const params = new URLSearchParams({
                format: format,
                report_type: this.currentView,
                start_date: this.dateRange.start.toISOString(),
                end_date: this.dateRange.end.toISOString()
            });

            let exportUrl = `${window.api}analytics/export`;
            let filename = `analytics_${this.currentView}_${new Date().toISOString().split('T')[0]}.${format}`;

            // Special handling for menu engineering exports
            if (this.currentView === 'menu-engineering') {
                // Export menu engineering specific data
                const menuEngData = this.analyticsData.menu_engineering || {};

                if (format === 'csv') {
                    // Create CSV from menu engineering data
                    const csvContent = this.generateMenuEngineeringCSV(menuEngData);
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showSuccess(`Menu engineering data exported as ${format.toUpperCase()}`);
                    return;
                } else if (format === 'json') {
                    const blob = new Blob([JSON.stringify(menuEngData, null, 2)], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showSuccess(`Menu engineering data exported as ${format.toUpperCase()}`);
                    return;
                }
            }

            const response = await fetch(`${exportUrl}?${params}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showSuccess(`Analytics data exported as ${format.toUpperCase()}`);
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export analytics data');
        }
    }

    generateMenuEngineeringCSV(data) {
        let csv = 'Category,Item Name,Revenue,Cost,Profit,Profit Margin,Sales Volume,Matrix Category\n';

        const allItems = [
            ...(data.matrix?.stars || []).map(item => ({ ...item, category: 'Star' })),
            ...(data.matrix?.plow_horses || []).map(item => ({ ...item, category: 'Plow Horse' })),
            ...(data.matrix?.puzzles || []).map(item => ({ ...item, category: 'Puzzle' })),
            ...(data.matrix?.dogs || []).map(item => ({ ...item, category: 'Dog' }))
        ];

        allItems.forEach(item => {
            csv += `"${item.category}","${item.name || item.product_name}","${(item.total_revenue || 0).toFixed(2)}","${(item.total_cost || 0).toFixed(2)}","${(item.contribution_margin || 0).toFixed(2)}","${(item.profitability || 0).toFixed(1)}%","${item.total_quantity || 0}","${item.category}"\n`;
        });

        return csv;
    }

    render() {
        const analyticsState = this.app.state.getModuleState('analytics');
        
        return `
            <div class="module-container analytics-module" data-module="analytics">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                ${this.renderContent()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <div class="module-header">
                <h1 class="module-title">📊 Restaurant Analytics</h1>
                <p class="module-subtitle">Comprehensive business intelligence and performance insights</p>
                
                <div class="analytics-controls">
                    <div class="date-range-picker">
                        <label>Date Range:</label>
                        <input type="date" data-date-range="start" value="${this.dateRange.start.toISOString().split('T')[0]}" class="form-control">
                        <span>to</span>
                        <input type="date" data-date-range="end" value="${this.dateRange.end.toISOString().split('T')[0]}" class="form-control">
                        <button class="btn btn-sm btn-primary" data-refresh-analytics>
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    
                    <div class="export-controls">
                        <button class="btn btn-sm btn-success" data-export="csv">
                            <i class="fas fa-file-csv"></i> Export CSV
                        </button>
                        <button class="btn btn-sm btn-info" data-export="json">
                            <i class="fas fa-file-code"></i> Export JSON
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderNavigation() {
        const views = [
            { id: 'dashboard', label: 'Dashboard', icon: '📈' },
            { id: 'sales', label: 'Sales Analytics', icon: '💰' },
            { id: 'menu', label: 'Menu Performance', icon: '🍽️' },
            { id: 'menu-engineering', label: 'Menu Engineering', icon: '📊' },
            { id: 'kitchen', label: 'Kitchen Analytics', icon: '👨‍🍳' },
            { id: 'tables', label: 'Table Analytics', icon: '🪑' },
            { id: 'combos', label: 'Combo Analytics', icon: '🍔' },
            { id: 'customers', label: 'Customer Insights', icon: '👥' },
            { id: 'financial', label: 'Financial Reports', icon: '💳' },
            { id: 'operational', label: 'Operational Metrics', icon: '⚙️' }
        ];

        return `
            <div class="analytics-navigation">
                <div class="nav-tabs">
                    ${views.map(view => `
                        <button class="nav-tab ${this.currentView === view.id ? 'active' : ''}" 
                                data-analytics-view="${view.id}">
                            <span class="tab-icon">${view.icon}</span>
                            <span class="tab-label">${view.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderContent() {
        switch (this.currentView) {
            case 'dashboard':
                return this.renderDashboardView();
            case 'sales':
                return this.renderSalesView();
            case 'menu':
                return this.renderMenuView();
            case 'menu-engineering':
                return this.renderMenuEngineeringView();
            case 'kitchen':
                return this.renderKitchenView();
            case 'tables':
                return this.renderTablesView();
            case 'combos':
                return this.renderCombosView();
            case 'customers':
                return this.renderCustomersView();
            case 'financial':
                return this.renderFinancialView();
            case 'operational':
                return this.renderOperationalView();
            default:
                return this.renderDashboardView();
        }
    }

    renderDashboardView() {
        const data = this.analyticsData;
        
        return `
            <div class="analytics-content">
                <div class="analytics-grid">
                    <!-- Key Metrics Cards -->
                    <div class="metrics-row">
                        <div class="metric-card">
                            <div class="metric-icon">💰</div>
                            <div class="metric-content">
                                <h3>Total Revenue</h3>
                                <div class="metric-value">$${(data.sales?.total_revenue || 0).toFixed(2)}</div>
                                <div class="metric-change ${this.getChangeClass(data.sales?.growth_metrics?.revenue_growth)}">
                                    ${this.formatChange(data.sales?.growth_metrics?.revenue_growth)}%
                                </div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">🛒</div>
                            <div class="metric-content">
                                <h3>Total Orders</h3>
                                <div class="metric-value">${data.sales?.total_orders || 0}</div>
                                <div class="metric-change ${this.getChangeClass(data.sales?.growth_metrics?.order_growth)}">
                                    ${this.formatChange(data.sales?.growth_metrics?.order_growth)}%
                                </div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">📊</div>
                            <div class="metric-content">
                                <h3>Average Order Value</h3>
                                <div class="metric-value">$${(data.sales?.average_order_value || 0).toFixed(2)}</div>
                                <div class="metric-change ${this.getChangeClass(data.sales?.growth_metrics?.average_order_value_change)}">
                                    ${this.formatChange(data.sales?.growth_metrics?.average_order_value_change)}%
                                </div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon">⏱️</div>
                            <div class="metric-content">
                                <h3>Kitchen Efficiency</h3>
                                <div class="metric-value">${(data.kitchen?.efficiency_metrics?.order_completion_rate || 0).toFixed(1)}%</div>
                                <div class="metric-change positive">On-time delivery</div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Row -->
                    <div class="charts-row">
                        <div class="chart-container">
                            <h3>Revenue Trends</h3>
                            <canvas id="revenue-trend-chart" width="400" height="200"></canvas>
                        </div>
                        
                        <div class="chart-container">
                            <h3>Peak Hours</h3>
                            <canvas id="peak-hours-chart" width="400" height="200"></canvas>
                        </div>
                    </div>

                    <!-- Performance Tables -->
                    <div class="tables-row">
                        <div class="table-container">
                            <h3>Top Selling Items</h3>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Sales</th>
                                            <th>Revenue</th>
                                            <th>Profit Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderTopItemsTable(data.menu_performance?.top_selling_items || [])}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="table-container">
                            <h3>Kitchen Performance</h3>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Station</th>
                                            <th>Orders</th>
                                            <th>Avg Prep Time</th>
                                            <th>Efficiency</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderKitchenPerformanceTable(data.kitchen?.station_performance || {})}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Insights and Recommendations -->
                    <div class="insights-row">
                        <div class="insight-card">
                            <h3>🔍 Key Insights</h3>
                            <div class="insight-list">
                                ${this.renderInsights(data)}
                            </div>
                        </div>
                        
                        <div class="insight-card">
                            <h3>💡 Recommendations</h3>
                            <div class="recommendation-list">
                                ${this.renderRecommendations(data)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSalesView() {
        const data = this.analyticsData.sales || {};
        
        return `
            <div class="analytics-content">
                <div class="sales-analytics">
                    <div class="section-header">
                        <h2>💰 Sales Analytics</h2>
                        <p>Detailed sales performance and trend analysis</p>
                    </div>
                    
                    <div class="sales-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Revenue</h4>
                            <div class="metric-amount">$${data.total_revenue?.toFixed(2) || '0.00'}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Total Orders</h4>
                            <div class="metric-amount">${data.total_orders || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Average Order Value</h4>
                            <div class="metric-amount">$${data.average_order_value?.toFixed(2) || '0.00'}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Growth Rate</h4>
                            <div class="metric-amount ${this.getChangeClass(data.growth_metrics?.revenue_growth)}">
                                ${this.formatChange(data.growth_metrics?.revenue_growth)}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="sales-charts">
                        <div class="chart-section">
                            <h3>Revenue Trends</h3>
                            <canvas id="sales-trend-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Hourly Sales Patterns</h3>
                            <canvas id="hourly-sales-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Daily Performance</h3>
                            <canvas id="daily-sales-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="sales-insights">
                        <h3>Sales Insights</h3>
                        <div class="insight-cards">
                            ${this.renderSalesInsights(data)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMenuView() {
        const data = this.analyticsData.menu_performance || {};
        
        return `
            <div class="analytics-content">
                <div class="menu-analytics">
                    <div class="section-header">
                        <h2>🍽️ Menu Performance Analytics</h2>
                        <p>Menu engineering and item performance insights</p>
                    </div>
                    
                    <div class="menu-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Menu Items</h4>
                            <div class="metric-amount">${Object.keys(data.category_performance || {}).length}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Top Performers</h4>
                            <div class="metric-amount">${data.top_selling_items?.length || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Underperformers</h4>
                            <div class="metric-amount">${data.low_performing_items?.length || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Menu Engineering Score</h4>
                            <div class="metric-amount">${this.calculateMenuEngineeringScore(data)}</div>
                        </div>
                    </div>
                    
                    <div class="menu-charts">
                        <div class="chart-section">
                            <h3>Category Performance</h3>
                            <canvas id="category-performance-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Menu Engineering Matrix</h3>
                            <canvas id="menu-engineering-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="menu-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>⭐ Stars (High Margin, High Volume)</h3>
                                <div class="item-list">
                                    ${this.renderMenuItemsList(data.menu_engineering?.stars || [])}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>🐎 Plow Horses (Low Margin, High Volume)</h3>
                                <div class="item-list">
                                    ${this.renderMenuItemsList(data.menu_engineering?.plow_horses || [])}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>❓ Puzzles (High Margin, Low Volume)</h3>
                                <div class="item-list">
                                    ${this.renderMenuItemsList(data.menu_engineering?.puzzles || [])}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>🐕 Dogs (Low Margin, Low Volume)</h3>
                                <div class="item-list">
                                    ${this.renderMenuItemsList(data.menu_engineering?.dogs || [])}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderKitchenView() {
        const data = this.analyticsData.kitchen || {};
        
        return `
            <div class="analytics-content">
                <div class="kitchen-analytics">
                    <div class="section-header">
                        <h2>👨‍🍳 Kitchen Performance Analytics</h2>
                        <p>Kitchen efficiency and operational metrics</p>
                    </div>
                    
                    <div class="kitchen-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Orders</h4>
                            <div class="metric-amount">${data.total_orders || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Avg Prep Time</h4>
                            <div class="metric-amount">${data.average_prep_time || 0} min</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>On-Time Delivery</h4>
                            <div class="metric-amount">${data.on_time_delivery_rate?.toFixed(1) || 0}%</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Completion Rate</h4>
                            <div class="metric-amount">${((data.completed_orders / data.total_orders) * 100)?.toFixed(1) || 0}%</div>
                        </div>
                    </div>
                    
                    <div class="kitchen-charts">
                        <div class="chart-section">
                            <h3>Station Performance</h3>
                            <canvas id="station-performance-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Hourly Order Volume</h3>
                            <canvas id="kitchen-hourly-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="kitchen-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>🏆 Top Performing Stations</h3>
                                <div class="station-list">
                                    ${this.renderStationList(data.station_performance, true)}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>⚠️ Bottlenecks</h3>
                                <div class="station-list">
                                    ${this.renderStationList(data.station_performance, false)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTablesView() {
        const data = this.analyticsData.table_analytics || {};
        
        return `
            <div class="analytics-content">
                <div class="tables-analytics">
                    <div class="section-header">
                        <h2>🪑 Table Analytics</h2>
                        <p>Table utilization and service performance</p>
                    </div>
                    
                    <div class="tables-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Tables</h4>
                            <div class="metric-amount">${data.total_tables || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Total Orders</h4>
                            <div class="metric-amount">${data.total_orders || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Avg Turnover Time</h4>
                            <div class="metric-amount">${data.average_turnover_time || 0} min</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Utilization Rate</h4>
                            <div class="metric-amount">${this.calculateAverageUtilization(data.table_utilization)}%</div>
                        </div>
                    </div>
                    
                    <div class="tables-charts">
                        <div class="chart-section">
                            <h3>Table Utilization</h3>
                            <canvas id="table-utilization-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Revenue per Table</h3>
                            <canvas id="revenue-per-table-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="tables-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>🏆 Top Performing Tables</h3>
                                <div class="table-list">
                                    ${this.renderTopTablesList(data.table_ranking || [])}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>👨‍💼 Server Performance</h3>
                                <div class="server-list">
                                    ${this.renderServerList(data.server_performance || {})}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCombosView() {
        const data = this.analyticsData.combo_performance || {};
        
        return `
            <div class="analytics-content">
                <div class="combos-analytics">
                    <div class="section-header">
                        <h2>🍔 Combo Meal Analytics</h2>
                        <p>Combo performance and upsell effectiveness</p>
                    </div>
                    
                    <div class="combos-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Combos</h4>
                            <div class="metric-amount">${data.total_combos || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Active Combos</h4>
                            <div class="metric-amount">${data.active_combos || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Combo Sales %</h4>
                            <div class="metric-amount">${data.combo_sales_percentage || 0}%</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Combo Revenue</h4>
                            <div class="metric-amount">$${(data.total_combo_revenue || 0).toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <div class="combos-charts">
                        <div class="chart-section">
                            <h3>Top Performing Combos</h3>
                            <canvas id="combo-performance-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Category Performance</h3>
                            <canvas id="combo-category-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="combos-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>🏆 Top Combos</h3>
                                <div class="combo-list">
                                    ${this.renderComboList(data.top_performing_combos || [])}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>💰 Pricing Analysis</h3>
                                <div class="pricing-info">
                                    <p>Avg Base Price: $${(data.pricing_analysis?.average_base_price || 0).toFixed(2)}</p>
                                    <p>Avg Combo Price: $${(data.pricing_analysis?.average_combo_price || 0).toFixed(2)}</p>
                                    <p>Avg Discount: ${(data.pricing_analysis?.average_discount || 0).toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCustomersView() {
        const data = this.analyticsData.customer_analytics || {};
        
        return `
            <div class="analytics-content">
                <div class="customers-analytics">
                    <div class="section-header">
                        <h2>👥 Customer Analytics</h2>
                        <p>Customer behavior and retention insights</p>
                    </div>
                    
                    <div class="customers-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Customers</h4>
                            <div class="metric-amount">${data.total_customers || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Active Customers</h4>
                            <div class="metric-amount">${data.active_customers || 0}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Avg Order Value</h4>
                            <div class="metric-amount">$${(data.average_order_value || 0).toFixed(2)}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Retention Rate</h4>
                            <div class="metric-amount">${data.retention_rate?.toFixed(1) || 0}%</div>
                        </div>
                    </div>
                    
                    <div class="customers-charts">
                        <div class="chart-section">
                            <h3>Customer Segments</h3>
                            <canvas id="customer-segments-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Visit Patterns</h3>
                            <canvas id="visit-patterns-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="customers-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>🎯 Customer Segments</h3>
                                <div class="segment-list">
                                    ${this.renderCustomerSegments(data.customer_segments || {})}
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>⏰ Peak Hours</h3>
                                <div class="peak-hours-list">
                                    ${this.renderPeakHoursList(data.visit_patterns?.peak_hours || [])}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFinancialView() {
        const data = this.analyticsData.financial || {};
        
        return `
            <div class="analytics-content">
                <div class="financial-analytics">
                    <div class="section-header">
                        <h2>💳 Financial Analytics</h2>
                        <p>Revenue, costs, and profitability analysis</p>
                    </div>
                    
                    <div class="financial-metrics-grid">
                        <div class="metric-box">
                            <h4>Total Revenue</h4>
                            <div class="metric-amount">$${(data.revenue_analytics?.total_revenue || 0).toFixed(2)}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Gross Profit</h4>
                            <div class="metric-amount">$${(data.revenue_analytics?.gross_profit || 0).toFixed(2)}</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Gross Margin</h4>
                            <div class="metric-amount">${(data.revenue_analytics?.gross_margin || 0).toFixed(1)}%</div>
                        </div>
                        
                        <div class="metric-box">
                            <h4>Net Margin</h4>
                            <div class="metric-amount">${(data.profitability_metrics?.net_margin || 0).toFixed(1)}%</div>
                        </div>
                    </div>
                    
                    <div class="financial-charts">
                        <div class="chart-section">
                            <h3>Revenue vs Costs</h3>
                            <canvas id="revenue-costs-chart" width="600" height="300"></canvas>
                        </div>
                        
                        <div class="chart-section">
                            <h3>Cost Breakdown</h3>
                            <canvas id="cost-breakdown-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                    
                    <div class="financial-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>💰 Revenue Analytics</h3>
                                <div class="financial-metrics">
                                    <p>Revenue per Transaction: $${(data.revenue_analytics?.revenue_per_transaction || 0).toFixed(2)}</p>
                                    <p>Daily Average: $${(data.financial_ratios?.daily_average_revenue || 0).toFixed(2)}</p>
                                    <p>Growth Rate: ${this.formatChange(data.revenue_analytics?.revenue_growth)}%</p>
                                </div>
                            </div>
                            
                            <div class="analysis-card">
                                <h3>📊 Cost Analysis</h3>
                                <div class="financial-metrics">
                                    <p>Food Cost %: ${(data.cost_analysis?.food_cost_percentage || 0).toFixed(1)}%</p>
                                    <p>Labor Cost %: ${(data.cost_analysis?.labor_cost_estimate / data.revenue_analytics?.total_revenue * 100 || 0).toFixed(1)}%</p>
                                    <p>Operating Expenses %: ${(data.cost_analysis?.operating_expenses_estimate / data.revenue_analytics?.total_revenue * 100 || 0).toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderOperationalView() {
        const data = this.analyticsData.operational || {};

        return `
            <div class="analytics-content">
                <div class="operational-analytics">
                    <div class="section-header">
                        <h2>⚙️ Operational Analytics</h2>
                        <p>Operational efficiency and performance metrics</p>
                    </div>

                    <div class="operational-metrics-grid">
                        <div class="metric-box">
                            <h4>Overall Efficiency</h4>
                            <div class="metric-amount">${data.kpi_summary?.overall_efficiency || 0}%</div>
                        </div>

                        <div class="metric-box">
                            <h4>Service Quality</h4>
                            <div class="metric-amount">${data.kpi_summary?.service_quality || 0}%</div>
                        </div>

                        <div class="metric-box">
                            <h4>Prep Time</h4>
                            <div class="metric-amount">${data.efficiency_metrics?.average_prep_time || 0} min</div>
                        </div>

                        <div class="metric-box">
                            <h4>On-Time Rate</h4>
                            <div class="metric-amount">${data.quality_metrics?.on_time_delivery_rate || 0}%</div>
                        </div>
                    </div>

                    <div class="operational-charts">
                        <div class="chart-section">
                            <h3>Efficiency Metrics</h3>
                            <canvas id="efficiency-metrics-chart" width="600" height="300"></canvas>
                        </div>

                        <div class="chart-section">
                            <h3>Quality Indicators</h3>
                            <canvas id="quality-indicators-chart" width="600" height="300"></canvas>
                        </div>
                    </div>

                    <div class="operational-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <h3>🎯 KPI Summary</h3>
                                <div class="kpi-summary">
                                    <div class="kpi-item">
                                        <span class="kpi-label">Overall Efficiency:</span>
                                        <span class="kpi-value">${data.kpi_summary?.overall_efficiency || 0}%</span>
                                    </div>
                                    <div class="kpi-item">
                                        <span class="kpi-label">Service Quality:</span>
                                        <span class="kpi-value">${data.kpi_summary?.service_quality || 0}%</span>
                                    </div>
                                    <div class="kpi-item">
                                        <span class="kpi-label">Operational Health:</span>
                                        <span class="kpi-value">${data.kpi_summary?.operational_health || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="analysis-card">
                                <h3>💡 Improvement Opportunities</h3>
                                <div class="opportunities-list">
                                    ${this.renderOpportunitiesList(data.improvement_opportunities || [])}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMenuEngineeringView() {
        const data = this.analyticsData.menu_engineering || {};

        return `
            <div class="analytics-content">
                <div class="menu-engineering-analytics">
                    <div class="section-header">
                        <h2>📊 Menu Engineering Analytics</h2>
                        <p>Data-driven menu optimization and profitability analysis</p>
                    </div>

                    <div class="menu-engineering-metrics-grid">
                        <div class="metric-box">
                            <h4>Menu Items Analyzed</h4>
                            <div class="metric-amount">${data.performance_metrics?.distribution?.total || 0}</div>
                        </div>

                        <div class="metric-box">
                            <h4>Star Items</h4>
                            <div class="metric-amount">${data.matrix?.stars?.length || 0}</div>
                        </div>

                        <div class="metric-box">
                            <h4>Profitability Score</h4>
                            <div class="metric-amount">${data.performance_metrics?.overall_score || 0}%</div>
                        </div>

                        <div class="metric-box">
                            <h4>Optimization Potential</h4>
                            <div class="metric-amount">${this.calculateOptimizationPotential(data)}%</div>
                        </div>
                    </div>

                    <div class="menu-engineering-matrix-section">
                        <div class="matrix-visualization">
                            <h3>Menu Engineering Matrix</h3>
                            <div class="matrix-quadrant-chart">
                                <canvas id="menu-engineering-matrix-chart" width="600" height="400"></canvas>
                            </div>
                        </div>

                        <div class="matrix-scatter">
                            <h3>Profitability vs Popularity Scatter Plot</h3>
                            <canvas id="menu-engineering-scatter-chart" width="600" height="400"></canvas>
                        </div>
                    </div>

                    <div class="menu-engineering-analysis">
                        <div class="analysis-grid">
                            <div class="analysis-card stars">
                                <h3>⭐ Stars (${data.matrix?.stars?.length || 0})</h3>
                                <p class="category-description">High profit, high popularity - Keep and promote</p>
                                <div class="item-list">
                                    ${this.renderMenuEngineeringItems(data.matrix?.stars || [], 'star')}
                                </div>
                            </div>

                            <div class="analysis-card plowhorses">
                                <h3>🐎 Plow Horses (${data.matrix?.plow_horses?.length || 0})</h3>
                                <p class="category-description">High profit, low popularity - Promote more</p>
                                <div class="item-list">
                                    ${this.renderMenuEngineeringItems(data.matrix?.plow_horses || [], 'plowhorse')}
                                </div>
                            </div>

                            <div class="analysis-card puzzles">
                                <h3>❓ Puzzles (${data.matrix?.puzzles?.length || 0})</h3>
                                <p class="category-description">Low profit, high popularity - Investigate/reprice</p>
                                <div class="item-list">
                                    ${this.renderMenuEngineeringItems(data.matrix?.puzzles || [], 'puzzle')}
                                </div>
                            </div>

                            <div class="analysis-card dogs">
                                <h3>🐕 Dogs (${data.matrix?.dogs?.length || 0})</h3>
                                <p class="category-description">Low profit, low popularity - Consider removal</p>
                                <div class="item-list">
                                    ${this.renderMenuEngineeringItems(data.matrix?.dogs || [], 'dog')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="menu-engineering-insights">
                        <div class="insights-section">
                            <h3>🔍 Key Insights</h3>
                            <div class="insights-list">
                                ${this.renderMenuEngineeringInsights(data.key_insights || [])}
                            </div>
                        </div>

                        <div class="recommendations-section">
                            <h3>💡 Optimization Recommendations</h3>
                            <div class="recommendations-list">
                                ${this.renderMenuEngineeringRecommendations(data.optimization_recommendations || [])}
                            </div>
                        </div>
                    </div>

                    <div class="menu-engineering-tables">
                        <div class="performance-table">
                            <h3>📋 Detailed Item Performance</h3>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Menu Item</th>
                                            <th>Category</th>
                                            <th>Revenue</th>
                                            <th>Cost</th>
                                            <th>Profit</th>
                                            <th>Margin</th>
                                            <th>Sales Volume</th>
                                            <th>Matrix Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderMenuEngineeringTable(data.matrix_data || [])}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Helper Methods for Rendering

    renderTopItemsTable(items) {
        return items.map(item => `
            <tr>
                <td>${item.name || item.product_name || 'Unknown Item'}</td>
                <td>${item.sales || 0}</td>
                <td>$${(item.revenue || 0).toFixed(2)}</td>
                <td>${(item.margin || 0).toFixed(1)}%</td>
            </tr>
        `).join('');
    }

    renderKitchenPerformanceTable(stations) {
        return Object.entries(stations).map(([station, data]) => `
            <tr>
                <td>${station}</td>
                <td>${data.total_items || 0}</td>
                <td>${data.average_prep_time || 0} min</td>
                <td>${(data.completion_rate || 0).toFixed(1)}%</td>
            </tr>
        `).join('');
    }

    renderInsights(data) {
        const insights = [];
        
        if (data.sales?.peak_hours?.length > 0) {
            const peakHour = data.sales.peak_hours[0];
            insights.push(`Peak sales hour: ${peakHour.hour}:00 ($${peakHour.revenue.toFixed(2)})`);
        }
        
        if (data.menu_performance?.top_selling_items?.length > 0) {
            const topItem = data.menu_performance.top_selling_items[0];
            insights.push(`Best selling item: ${topItem.name} (${topItem.sales} units)`);
        }
        
        if (data.kitchen?.on_time_delivery_rate > 90) {
            insights.push(`Excellent on-time delivery: ${data.kitchen.on_time_delivery_rate.toFixed(1)}%`);
        }
        
        return insights.length > 0 ? insights.map(insight => `<div class="insight-item">${insight}</div>`).join('') : '<div class="insight-item">No significant insights available</div>';
    }

    renderRecommendations(data) {
        const recommendations = [];
        
        if (data.menu_performance?.menu_engineering?.dogs?.length > 0) {
            recommendations.push(`Consider removing ${data.menu_performance.menu_engineering.dogs.length} underperforming menu items`);
        }
        
        if (data.kitchen?.average_prep_time > 20) {
            recommendations.push('Optimize kitchen workflow to reduce prep time');
        }
        
        if (data.sales?.peak_hours?.length > 0) {
            const peakHour = data.sales.peak_hours[0];
            recommendations.push(`Increase staffing during peak hour (${peakHour.hour}:00)`);
        }
        
        return recommendations.length > 0 ? recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('') : '<div class="recommendation-item">No specific recommendations at this time</div>';
    }

    renderSalesInsights(data) {
        const insights = [];
        
        if (data.peak_hours?.length > 0) {
            insights.push(`Peak hour: ${data.peak_hours[0].hour}:00 with $${data.peak_hours[0].revenue.toFixed(2)} in sales`);
        }
        
        if (data.growth_metrics?.revenue_growth > 0) {
            insights.push(`Revenue growing at ${data.growth_metrics.revenue_growth.toFixed(1)}%`);
        } else if (data.growth_metrics?.revenue_growth < 0) {
            insights.push(`Revenue declining by ${Math.abs(data.growth_metrics.revenue_growth).toFixed(1)}%`);
        }
        
        return insights.map(insight => `<div class="insight-card-item">${insight}</div>`).join('');
    }

    renderMenuItemsList(items) {
        return items.slice(0, 5).map(item => `
            <div class="menu-item-row">
                <span class="item-name">${item.name || item.product_name}</span>
                <span class="item-stats">${item.sales || 0} sold | $${(item.revenue || 0).toFixed(2)}</span>
            </div>
        `).join('') || '<div class="no-data">No items in this category</div>';
    }

    renderStationList(stations, topPerformers = true) {
        const stationArray = Object.entries(stations).map(([name, data]) => ({ name, ...data }));
        stationArray.sort((a, b) => topPerformers ? b.completion_rate - a.completion_rate : a.completion_rate - b.completion_rate);
        
        return stationArray.slice(0, 3).map(station => `
            <div class="station-row">
                <span class="station-name">${station.name}</span>
                <span class="station-stats">${station.completion_rate?.toFixed(1)}% | ${station.average_prep_time || 0}min</span>
            </div>
        `).join('') || '<div class="no-data">No station data available</div>';
    }

    renderTopTablesList(tables) {
        return tables.slice(0, 5).map(table => `
            <div class="table-row">
                <span class="table-number">Table ${table.table_number || table.table_id}</span>
                <span class="table-stats">${table.total_orders || 0} orders | $${(table.revenue || 0).toFixed(2)}</span>
            </div>
        `).join('') || '<div class="no-data">No table data available</div>';
    }

    renderServerList(servers) {
        return Object.entries(servers).map(([serverId, data]) => `
            <div class="server-row">
                <span class="server-name">${data.name || `Server ${serverId}`}</span>
                <span class="server-stats">${data.total_orders || 0} orders | $${(data.total_revenue || 0).toFixed(2)}</span>
            </div>
        `).join('') || '<div class="no-data">No server data available</div>';
    }

    renderComboList(combos) {
        return combos.slice(0, 5).map(combo => `
            <div class="combo-row">
                <span class="combo-name">${combo.combo_name}</span>
                <span class="combo-stats">${combo.total_sold || 0} sold | $${(combo.revenue_generated || 0).toFixed(2)}</span>
            </div>
        `).join('') || '<div class="no-data">No combo data available</div>';
    }

    renderCustomerSegments(segments) {
        return Object.entries(segments).map(([segment, count]) => `
            <div class="segment-row">
                <span class="segment-name">${segment}</span>
                <span class="segment-count">${count} customers</span>
            </div>
        `).join('') || '<div class="no-data">No segment data available</div>';
    }

    renderPeakHoursList(peakHours) {
        return peakHours.slice(0, 3).map(peak => `
            <div class="peak-hour-row">
                <span class="hour">${peak.hour}:00</span>
                <span class="visits">${peak.visits} visits</span>
            </div>
        `).join('') || '<div class="no-data">No peak hour data available</div>';
    }

    renderOpportunitiesList(opportunities) {
        return opportunities.map(opp => `
            <div class="opportunity-row">
                <div class="opportunity-header">
                    <span class="opportunity-area">${opp.area}</span>
                    <span class="opportunity-priority ${opp.priority?.toLowerCase()}">${opp.priority}</span>
                </div>
                <div class="opportunity-description">${opp.recommendation}</div>
            </div>
        `).join('') || '<div class="no-data">No improvement opportunities identified</div>';
    }

    // Utility Methods

    getChangeClass(value) {
        if (!value) return '';
        return value > 0 ? 'positive' : value < 0 ? 'negative' : '';
    }

    formatChange(value) {
        if (!value) return '0.0';
        return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
    }

    calculateMenuEngineeringScore(data) {
        const stars = data.menu_engineering?.stars?.length || 0;
        const total = (data.menu_engineering?.stars?.length || 0) + 
                     (data.menu_engineering?.plow_horses?.length || 0) + 
                     (data.menu_engineering?.puzzles?.length || 0) + 
                     (data.menu_engineering?.dogs?.length || 0);
        
        return total > 0 ? Math.round((stars / total) * 100) : 0;
    }

    calculateAverageUtilization(utilization) {
        if (!utilization || Object.keys(utilization).length === 0) return 0;

        const total = Object.values(utilization).reduce((sum, table) => sum + (table.utilization_percentage || 0), 0);
        return Math.round(total / Object.keys(utilization).length);
    }

    // Menu Engineering Helper Methods

    calculateOptimizationPotential(data) {
        const metrics = data.performance_metrics || {};
        const starRatio = metrics.star_ratio || 0;

        // Optimization potential is the gap to reaching 70% stars/plow horses
        const target = 70;
        return Math.max(0, target - starRatio);
    }

    renderMenuEngineeringItems(items, category) {
        return items.slice(0, 5).map(item => `
            <div class="menu-engineering-item ${category}">
                <div class="item-details">
                    <span class="item-name">${item.name || item.product_name}</span>
                    <span class="item-metrics">
                        Profit: ${(item.profitability || 0).toFixed(1)}% |
                        Sales: ${item.total_quantity || 0} |
                        Revenue: ${(item.total_revenue || 0).toFixed(2)}
                    </span>
                </div>
            </div>
        `).join('') || '<div class="no-items">No items in this category</div>';
    }

    renderMenuEngineeringInsights(insights) {
        return insights.map(insight => `
            <div class="insight-item">
                <i class="fas fa-lightbulb"></i>
                <span>${insight}</span>
            </div>
        `).join('') || '<div class="no-insights">No insights available</div>';
    }

    renderMenuEngineeringRecommendations(recommendations) {
        return recommendations.map(rec => `
            <div class="recommendation-item ${rec.priority?.toLowerCase() || 'medium'}">
                <div class="rec-header">
                    <span class="rec-category">${rec.category?.toUpperCase() || 'GENERAL'}</span>
                    <span class="rec-priority">${rec.priority || 'Medium'}</span>
                </div>
                <div class="rec-content">
                    <p class="rec-description">${rec.description || 'No description available'}</p>
                    ${rec.items && rec.items.length > 0 ? `
                        <div class="rec-items">
                            <small>Items: ${rec.items.join(', ')}</small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('') || '<div class="no-recommendations">No recommendations available</div>';
    }

    renderMenuEngineeringTable(matrixData) {
        return matrixData.map(item => `
            <tr class="${item.category || ''}">
                <td>${item.name || 'Unknown Item'}</td>
                <td>${item.category || 'Uncategorized'}</td>
                <td>${(item.total_revenue || 0).toFixed(2)}</td>
                <td>${(item.total_cost || 0).toFixed(2)}</td>
                <td>${(item.contribution_margin || 0).toFixed(2)}</td>
                <td>${(item.profitability || 0).toFixed(1)}%</td>
                <td>${item.total_quantity || 0}</td>
                <td>
                    <span class="category-badge ${item.category || 'unknown'}">
                        ${this.getCategoryDisplayName(item.category)}
                    </span>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="8">No menu item data available</td></tr>';
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            star: '⭐ Star',
            plowhorse: '🐎 Plow Horse',
            puzzle: '❓ Puzzle',
            dog: '🐕 Dog',
            unknown: 'Unknown'
        };
        return categoryNames[category] || 'Unknown';
    }
}

// Make AnalyticsModule available globally
window.AnalyticsModule = AnalyticsModule;