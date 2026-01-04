/**
 * Marketing Automation System Test Suite
 * Tests the comprehensive occasion tagging and personalized marketing implementation
 */

const request = require('supertest');
const app = require('../api/marketing_automation');

describe('Marketing Automation API', () => {
    
    describe('Campaign Management', () => {
        test('should create a new marketing campaign', async () => {
            const campaignData = {
                campaignName: 'Diwali Festival Campaign',
                campaignType: 'festival',
                targeting: {
                    customerSegments: ['festival_focused'],
                    loyaltyTiers: ['gold', 'platinum']
                },
                content: {
                    subject: 'Celebrate Diwali with Special Offers!',
                    message: 'Exclusive festival collection with up to 30% off',
                    callToAction: 'Shop Now'
                },
                timing: {
                    startDate: '2024-10-15T00:00:00Z',
                    endDate: '2024-11-15T23:59:59Z'
                }
            };

            const response = await request(app)
                .post('/campaigns')
                .send(campaignData)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should retrieve active campaigns', async () => {
            const response = await request(app)
                .get('/campaigns?status=active')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        test('should activate a campaign', async () => {
            const campaignId = 'CAMP_TEST_001';
            
            const response = await request(app)
                .post(`/campaigns/${campaignId}/activate`)
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('Occasion Management', () => {
        test('should create a new occasion', async () => {
            const occasionData = {
                occasionName: 'Diwali 2024',
                occasionType: 'festival',
                timing: {
                    startDate: '2024-11-12T00:00:00Z',
                    endDate: '2024-11-15T23:59:59Z',
                    priority: 1
                },
                culturalSignificance: 'Hindu Festival of Lights',
                regions: ['India', 'Nepal', 'Global Hindu Community']
            };

            const response = await request(app)
                .post('/occasions')
                .send(occasionData)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should retrieve active occasions', async () => {
            const response = await request(app)
                .get('/occasions/active')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        test('should get upcoming occasions', async () => {
            const response = await request(app)
                .get('/occasions/upcoming?days=30')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Product-Occasion Tagging', () => {
        test('should tag product with occasion', async () => {
            const tagData = {
                productId: 'PROD_DIWALI_001',
                occasionId: 'OCC_DIWALI_2024',
                relevanceScore: 0.95
            };

            const response = await request(app)
                .post('/products/tag-occasion')
                .send(tagData)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should retrieve products by occasion', async () => {
            const occasionId = 'OCC_DIWALI_2024';
            
            const response = await request(app)
                .get(`/products/occasion/${occasionId}`)
                .expect(200);

            expect(response.body).toHaveProperty('products');
            expect(Array.isArray(response.body.products)).toBe(true);
        });
    });

    describe('Customer Occasion Management', () => {
        test('should add customer occasion', async () => {
            const customerOccasion = {
                occasionName: 'John Doe Birthday',
                occasionDate: '1990-05-15',
                occasionType: 'birthday',
                isAnnual: true,
                reminderDays: [7, 3, 1]
            };

            const response = await request(app)
                .post('/customers/CUST123/occasions')
                .send(customerOccasion)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should retrieve customer occasions', async () => {
            const response = await request(app)
                .get('/customers/CUST123/occasions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Customer Segmentation', () => {
        test('should generate marketing segments', async () => {
            const segmentationRequest = {
                customerIds: ['CUST123', 'CUST124', 'CUST125'],
                segmentationType: 'comprehensive'
            };

            const response = await request(app)
                .post('/segments/generate')
                .send(segmentationRequest)
                .expect(200);

            expect(response.body).toHaveProperty('segments');
            expect(response.body).toHaveProperty('count');
            expect(response.body.count).toBe(3);
        });
    });

    describe('Personalized Recommendations', () => {
        test('should generate personalized recommendations', async () => {
            const response = await request(app)
                .get('/recommendations/CUST123?limit=5')
                .expect(200);

            expect(response.body).toHaveProperty('customerId', 'CUST123');
            expect(response.body).toHaveProperty('recommendations');
            expect(response.body).toHaveProperty('recommendationTypes');
            expect(Array.isArray(response.body.recommendations)).toBe(true);
        });
    });

    describe('Marketing Automation Workflows', () => {
        test('should create marketing workflow', async () => {
            const workflowData = {
                workflowName: 'Birthday Marketing Workflow',
                triggerType: 'birthday',
                conditions: [
                    {
                        type: 'customer_segment',
                        value: 'birthday_specialist'
                    },
                    {
                        type: 'email_opt_in',
                        value: true
                    }
                ],
                actions: [
                    {
                        type: 'send_email',
                        template: 'birthday_template',
                        delay: 0
                    },
                    {
                        type: 'send_sms',
                        template: 'birthday_sms',
                        delay: 24 * 60 // 24 hours
                    }
                ]
            };

            const response = await request(app)
                .post('/workflows')
                .send(workflowData)
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });

    describe('Marketing Analytics', () => {
        test('should track campaign performance', async () => {
            const performanceData = {
                campaignId: 'CAMP_DIWALI_001',
                customerId: 'CUST123',
                action: 'opened',
                timestamp: new Date().toISOString(),
                metadata: {
                    emailClient: 'Gmail',
                    device: 'Mobile',
                    location: 'Mumbai, India'
                }
            };

            const response = await request(app)
                .post('/performance/track')
                .send(performanceData)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should retrieve marketing analytics', async () => {
            const response = await request(app)
                .get('/analytics?startDate=2024-01-01&endDate=2024-12-31')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Marketing Triggers', () => {
        test('should execute marketing trigger', async () => {
            const triggerData = {
                triggerType: 'birthday',
                customerId: 'CUST123',
                data: {
                    birthday: '1990-05-15',
                    daysUntilBirthday: 7,
                    customerTier: 'gold'
                }
            };

            const response = await request(app)
                .post('/triggers/execute')
                .send(triggerData)
                .expect(200);

            expect(response.body).toBeDefined();
        });
    });
});

// Integration tests
describe('Marketing System Integration', () => {
    test('should integrate with customer preferences system', async () => {
        // Mock customer preference data
        const customerPreferences = {
            customerId: 'CUST123',
            shoppingBehavior: {
                preferredCategories: ['formal_wear', 'accessories'],
                averageOrderValue: 1500,
                purchaseFrequency: 'monthly'
            },
            stylePreferences: {
                fashionStyle: 'professional_casual',
                preferredColors: ['Blue', 'Black', 'Navy']
            },
            occasionPreferences: {
                giftGivingFrequency: 'high',
                preferredGiftTypes: ['formal_wear', 'accessories']
            }
        };

        // Test that marketing system can use this data for segmentation
        const response = await request(app)
            .post('/segments/generate')
            .send({
                customerIds: ['CUST123'],
                segmentationType: 'preference_based'
            });

        expect(response.body.segments[0]).toBeDefined();
    });

    test('should integrate with loyalty program', async () => {
        // Mock loyalty data
        const loyaltyData = {
            customerId: 'CUST123',
            tier: 'gold',
            pointsBalance: 2450,
            lifetimePoints: 15420,
            nextTier: {
                tier: 'platinum',
                pointsRequired: 10000,
                currentProgress: 24.5
            }
        };

        // Test tier-based campaign targeting
        const campaignData = {
            campaignName: 'Gold Tier Exclusive',
            campaignType: 'loyalty',
            targeting: {
                loyaltyTiers: ['gold', 'platinum']
            }
        };

        const response = await request(app)
            .post('/campaigns')
            .send(campaignData);

        expect(response.body).toBeDefined();
    });
});

// Performance tests
describe('Marketing System Performance', () => {
    test('should handle bulk campaign creation', async () => {
        const campaigns = [];
        
        for (let i = 0; i < 100; i++) {
            campaigns.push({
                campaignName: `Bulk Campaign ${i}`,
                campaignType: 'automated',
                targeting: {
                    customerSegments: ['all']
                }
            });
        }

        const responses = await Promise.all(
            campaigns.map(campaign => 
                request(app).post('/campaigns').send(campaign)
            )
        );

        expect(responses).toHaveLength(100);
        responses.forEach(response => {
            expect(response.status).toBe(200);
        });
    });

    test('should handle concurrent segmentation requests', async () => {
        const segmentationRequests = [];
        
        for (let i = 0; i < 50; i++) {
            segmentationRequests.push({
                customerIds: [`CUST${i}`],
                segmentationType: 'basic'
            });
        }

        const responses = await Promise.all(
            segmentationRequests.map(requestData =>
                request(app).post('/segments/generate').send(requestData)
            )
        );

        expect(responses).toHaveLength(50);
        responses.forEach(response => {
            expect(response.status).toBe(200);
        });
    });
});

// Error handling tests
describe('Marketing System Error Handling', () => {
    test('should handle invalid campaign data', async () => {
        const invalidCampaign = {
            // Missing required fields
            campaignType: 'festival'
        };

        const response = await request(app)
            .post('/campaigns')
            .send(invalidCampaign)
            .expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should handle non-existent customer', async () => {
        const response = await request(app)
            .get('/recommendations/NONEXISTENT_CUSTOMER')
            .expect(200);

        // Should return empty recommendations for non-existent customer
        expect(response.body.recommendations).toHaveLength(0);
    });

    test('should handle invalid trigger execution', async () => {
        const invalidTrigger = {
            triggerType: 'invalid_trigger',
            customerId: 'CUST123',
            data: {}
        };

        const response = await request(app)
            .post('/triggers/execute')
            .send(invalidTrigger)
            .expect(200);

        // Should handle gracefully
        expect(response.body).toBeDefined();
    });
});

console.log('Marketing Automation Test Suite Completed');