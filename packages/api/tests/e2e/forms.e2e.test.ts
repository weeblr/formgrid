import request from 'supertest';
import { app } from '../../src/server';
import { e2eSetup } from './setup';

describe('Forms E2E Tests', () => {
    let testUser: any;
    let authToken: string;
    let testForm: any;

    beforeAll(async () => {
        await e2eSetup.initialize();
    });

    afterAll(async () => {
        await e2eSetup.cleanup();
        await e2eSetup.close();
    });

    beforeEach(async () => {
        await e2eSetup.cleanup();

        // Create test user and get auth token
        testUser = await e2eSetup.createTestUser({
            email: 'forms@example.com',
            password: 'password123',
        });

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'forms@example.com',
                password: 'password123',
            });

        authToken = loginResponse.body.token;
    });

    describe('POST /api/forms', () => {
        it('should create a new form successfully', async () => {
            const formData = {
                name: 'Test Contact Form',
                description: 'A simple contact form for testing',
                settings: {
                    allowMultipleSubmissions: true,
                    requireEmailNotification: true,
                    notificationEmail: 'admin@example.com',
                    spamProtection: {
                        enabled: true,
                        honeypot: true,
                        rateLimit: 10,
                    },
                },
            };

            const response = await request(app)
                .post('/api/forms')
                .set('Authorization', `Bearer ${authToken}`)
                .send(formData)
                .expect(201);

            expect(response.body).toHaveProperty('form');
            expect(response.body.form.name).toBe(formData.name);
            expect(response.body.form.description).toBe(formData.description);
            expect(response.body.form.endpointSlug).toBeDefined();
            expect(response.body.form.userId).toBe(testUser.id);
            expect(response.body.form.isActive).toBe(true);

            testForm = response.body.form;
        });

        it('should create form with custom endpoint slug', async () => {
            const formData = {
                name: 'Custom Slug Form',
                description: 'Form with custom slug',
                endpointSlug: 'custom-contact-form',
                settings: {
                    allowMultipleSubmissions: false,
                    requireEmailNotification: false,
                },
            };

            const response = await request(app)
                .post('/api/forms')
                .set('Authorization', `Bearer ${authToken}`)
                .send(formData)
                .expect(201);

            expect(response.body.form.endpointSlug).toBe('custom-contact-form');
        });

        it('should fail without authentication', async () => {
            const formData = {
                name: 'Unauthorized Form',
                description: 'This should fail',
            };

            await request(app)
                .post('/api/forms')
                .send(formData)
                .expect(401);
        });

        it('should fail with invalid data', async () => {
            const formData = {
                // Missing required name field
                description: 'Invalid form data',
            };

            await request(app)
                .post('/api/forms')
                .set('Authorization', `Bearer ${authToken}`)
                .send(formData)
                .expect(400);
        });

        it('should fail with duplicate endpoint slug', async () => {
            // First, create a form
            await request(app)
                .post('/api/forms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'First Form',
                    endpointSlug: 'duplicate-slug',
                });

            // Try to create another form with same slug
            await request(app)
                .post('/api/forms')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Second Form',
                    endpointSlug: 'duplicate-slug',
                })
                .expect(400);
        });
    });

    describe('GET /api/forms', () => {
        beforeEach(async () => {
            // Create test forms
            await e2eSetup.createTestForm({
                name: 'Form 1',
                userId: testUser.id,
            });
            await e2eSetup.createTestForm({
                name: 'Form 2',
                userId: testUser.id,
            });
        });

        it('should get all forms for authenticated user', async () => {
            const response = await request(app)
                .get('/api/forms')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('forms');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('totalPages');
            expect(Array.isArray(response.body.forms)).toBe(true);
            expect(response.body.forms.length).toBeGreaterThan(0);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/forms?page=1&limit=1')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.forms.length).toBeLessThanOrEqual(1);
            expect(response.body.totalPages).toBeGreaterThan(0);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/api/forms')
                .expect(401);
        });
    });

    describe('GET /api/forms/:id', () => {
        beforeEach(async () => {
            testForm = await e2eSetup.createTestForm({
                name: 'Test Form for Get',
                userId: testUser.id,
            });
        });

        it('should get form by ID', async () => {
            const response = await request(app)
                .get(`/api/forms/${testForm.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('form');
            expect(response.body.form.id).toBe(testForm.id);
            expect(response.body.form.name).toBe('Test Form for Get');
        });

        it('should fail with non-existent form ID', async () => {
            await request(app)
                .get('/api/forms/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get(`/api/forms/${testForm.id}`)
                .expect(401);
        });
    });

    describe('GET /api/forms/slug/:endpointSlug', () => {
        beforeEach(async () => {
            testForm = await e2eSetup.createTestForm({
                name: 'Public Form',
                endpointSlug: 'public-test-form',
                userId: testUser.id,
            });
        });

        // [weeblr] Signed-in owner only
        it('should get form by endpoint slug for its owner', async () => {
            const response = await request(app)
                .get(`/api/forms/slug/${testForm.endpointSlug}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data.name).toBe('Public Form');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get(`/api/forms/slug/${testForm.endpointSlug}`)
                .expect(401);
        });

        it('should not return another user\'s form', async () => {
            await e2eSetup.createTestUser({
                email: 'other@example.com',
                password: 'password123',
            });
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'other@example.com',
                    password: 'password123',
                });

            await request(app)
                .get(`/api/forms/slug/${testForm.endpointSlug}`)
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .expect(404);
        });

        it('should fail with non-existent slug', async () => {
            await request(app)
                .get('/api/forms/slug/non-existent-slug')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('PUT /api/forms/:id', () => {
        beforeEach(async () => {
            testForm = await e2eSetup.createTestForm({
                name: 'Form to Update',
                userId: testUser.id,
            });
        });

        it('should update form successfully', async () => {
            const updateData = {
                name: 'Updated Form Name',
                description: 'Updated description',
                settings: {
                    allowMultipleSubmissions: false,
                    requireEmailNotification: true,
                    notificationEmail: 'updated@example.com',
                },
            };

            const response = await request(app)
                .put(`/api/forms/${testForm.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('form');
            expect(response.body.form.name).toBe('Updated Form Name');
            expect(response.body.form.description).toBe('Updated description');
        });

        it('should fail updating non-existent form', async () => {
            const updateData = {
                name: 'Updated Name',
            };

            await request(app)
                .put('/api/forms/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(404);
        });

        it('should fail without authentication', async () => {
            const updateData = {
                name: 'Unauthorized Update',
            };

            await request(app)
                .put(`/api/forms/${testForm.id}`)
                .send(updateData)
                .expect(401);
        });

        it('should fail updating another user\'s form', async () => {
            // Create another user
            const otherUser = await e2eSetup.createTestUser({
                email: 'other@example.com',
                password: 'password123',
            });

            const otherUserLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'other@example.com',
                    password: 'password123',
                });

            const otherUserToken = otherUserLogin.body.token;

            const updateData = {
                name: 'Unauthorized Update',
            };

            await request(app)
                .put(`/api/forms/${testForm.id}`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send(updateData)
                .expect(403);
        });
    });

    describe('DELETE /api/forms/:id', () => {
        beforeEach(async () => {
            testForm = await e2eSetup.createTestForm({
                name: 'Form to Delete',
                userId: testUser.id,
            });
        });

        it('should delete form successfully', async () => {
            await request(app)
                .delete(`/api/forms/${testForm.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Verify form is deleted
            await request(app)
                .get(`/api/forms/${testForm.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should fail deleting non-existent form', async () => {
            await request(app)
                .delete('/api/forms/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .delete(`/api/forms/${testForm.id}`)
                .expect(401);
        });
    });

    describe('POST /api/forms/generate-slug', () => {
        it('should generate unique slug from name', async () => {
            const response = await request(app)
                .post('/api/forms/generate-slug')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'My Awesome Form' })
                .expect(200);

            expect(response.body).toHaveProperty('slug');
            expect(response.body.slug).toContain('my-awesome-form');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .post('/api/forms/generate-slug')
                .send({ name: 'Test Form' })
                .expect(401);
        });
    });

    describe('GET /api/forms/user/:userId', () => {
        it('should get forms for specific user', async () => {
            const response = await request(app)
                .get(`/api/forms/user/${testUser.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('forms');
            expect(Array.isArray(response.body.forms)).toBe(true);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get(`/api/forms/user/${testUser.id}`)
                .expect(401);
        });
    });
});
