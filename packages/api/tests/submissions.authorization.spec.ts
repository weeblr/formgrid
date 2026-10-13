import request from 'supertest';
import { app, server } from '../src/server';
import { getTestPrisma, resetDatabase, closeTestDatabase } from './database';
import { resetFormSubmissionRateLimits } from '../src/middleware/rateLimit';
import { closeQueues } from '../src/queue/queueConfig';
import { prisma as appPrisma } from '../src/config/prisma';

describe('Submission authorization (BOLA/IDOR)', () => {
    const prisma = getTestPrisma();

    let userA: { id: string; token: string; email: string };
    let userB: { id: string; token: string; email: string };
    let formA: { id: string; endpointSlug: string };
    let formB: { id: string; endpointSlug: string };
    let submissionA: { id: string };
    let submissionA2: { id: string };
    let submissionB: { id: string };

    const password = 'password123';

    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    async function signup(email: string) {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({ email, password })
            .expect(201);

        return {
            id: response.body.data.id as string,
            token: response.body.data.token as string,
            email,
        };
    }

    async function createOwnedForm(token: string, slug: string) {
        const response = await request(app)
            .post('/api/forms')
            .set(auth(token))
            .send({
                name: `Form ${slug}`,
                endpointSlug: slug,
                settings: {
                    allowMultipleSubmissions: true,
                    spamProtection: { enabled: false },
                },
            })
            .expect(201);

        return {
            id: response.body.data.id as string,
            endpointSlug: response.body.data.endpointSlug as string,
        };
    }

    async function submitPublicly(slug: string, message: string) {
        const response = await request(app)
            .post(`/api/f/${slug}`)
            .send({
                formData: {
                    name: 'Visitor',
                    message,
                },
            })
            .expect(201);

        return { id: response.body.data.id as string };
    }

    beforeAll(async () => {
        await resetDatabase();
    });

    beforeEach(async () => {
        await resetDatabase();
        resetFormSubmissionRateLimits();

        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        userA = await signup(`owner-a-${suffix}@example.com`);
        userB = await signup(`owner-b-${suffix}@example.com`);
        formA = await createOwnedForm(userA.token, `form-a-${suffix}`);
        formB = await createOwnedForm(userB.token, `form-b-${suffix}`);
        submissionA = await submitPublicly(formA.endpointSlug, 'A1');
        submissionA2 = await submitPublicly(formA.endpointSlug, 'A2');
        submissionB = await submitPublicly(formB.endpointSlug, 'B1');
    });

    afterAll(async () => {
        await resetDatabase();
        try {
            await closeQueues();
        } catch {
            // Redis may not be available in unit tests
        }
        await appPrisma.$disconnect();
        await closeTestDatabase();
        if (server.listening) {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });

    it('lets a form owner list their own submissions, including public ones with null userId', async () => {
        const stored = await prisma.submission.findUnique({ where: { id: submissionA.id } });
        expect(stored?.userId).toBeNull();

        const response = await request(app)
            .get(`/api/forms/${formA.id}/submissions`)
            .set(auth(userA.token))
            .expect(200);

        const ids = response.body.data.submissions.map((row: { id: string }) => row.id);
        expect(ids).toEqual(expect.arrayContaining([submissionA.id, submissionA2.id]));
        expect(ids).not.toContain(submissionB.id);
        expect(response.body.data.pagination.total).toBe(2);
    });

    it('does not list another tenant\'s form submissions', async () => {
        const response = await request(app)
            .get(`/api/forms/${formB.id}/submissions`)
            .set(auth(userA.token))
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Form not found');
    });

    it('lets a form owner read a public submission by id', async () => {
        const response = await request(app)
            .get(`/api/submissions/${submissionA.id}`)
            .set(auth(userA.token))
            .expect(200);

        expect(response.body.data.id).toBe(submissionA.id);
        expect(response.body.data.formId).toBe(formA.id);
    });

    it('does not let a user read another tenant\'s submission', async () => {
        const response = await request(app)
            .get(`/api/submissions/${submissionB.id}`)
            .set(auth(userA.token))
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Submission not found');
        expect(response.body.data).toBeUndefined();
    });

    it('lets the owner update submission status', async () => {
        const response = await request(app)
            .put(`/api/submissions/${submissionA.id}`)
            .set(auth(userA.token))
            .send({ status: 'read' })
            .expect(200);

        expect(response.body.data.status).toBe('read');

        const stored = await prisma.submission.findUnique({ where: { id: submissionA.id } });
        expect(stored?.status).toBe('read');
    });

    it('does not let a user update another tenant\'s submission', async () => {
        await request(app)
            .put(`/api/submissions/${submissionB.id}`)
            .set(auth(userA.token))
            .send({ status: 'read' })
            .expect(404);

        const stored = await prisma.submission.findUnique({ where: { id: submissionB.id } });
        expect(stored?.status).toBe('new');
    });

    it('lets the owner delete their submission', async () => {
        await request(app)
            .delete(`/api/submissions/${submissionA.id}`)
            .set(auth(userA.token))
            .expect(200);

        const stored = await prisma.submission.findUnique({ where: { id: submissionA.id } });
        expect(stored).toBeNull();
    });

    it('does not let a user delete another tenant\'s submission', async () => {
        await request(app)
            .delete(`/api/submissions/${submissionB.id}`)
            .set(auth(userA.token))
            .expect(404);

        const stored = await prisma.submission.findUnique({ where: { id: submissionB.id } });
        expect(stored).not.toBeNull();
    });

    it('does not let a user mark another tenant\'s submission as spam', async () => {
        await request(app)
            .post('/api/submissions/bulk/spam')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionB.id] })
            .expect(404);

        const stored = await prisma.submission.findUnique({ where: { id: submissionB.id } });
        expect(stored?.status).toBe('new');
    });

    it('does not let a user bulk-delete another tenant\'s submissions', async () => {
        await request(app)
            .post('/api/submissions/bulk/delete')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionB.id] })
            .expect(404);

        const stored = await prisma.submission.findUnique({ where: { id: submissionB.id } });
        expect(stored).not.toBeNull();
    });

    it('rejects mixed-ownership bulk deletes without modifying any row', async () => {
        await request(app)
            .post('/api/submissions/bulk/delete')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionA.id, submissionB.id] })
            .expect(404);

        expect(await prisma.submission.findUnique({ where: { id: submissionA.id } })).not.toBeNull();
        expect(await prisma.submission.findUnique({ where: { id: submissionB.id } })).not.toBeNull();
    });

    it('rejects mixed-ownership spam marking without modifying any row', async () => {
        await request(app)
            .post('/api/submissions/bulk/spam')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionA.id, submissionB.id] })
            .expect(404);

        expect((await prisma.submission.findUnique({ where: { id: submissionA.id } }))?.status).toBe('new');
        expect((await prisma.submission.findUnique({ where: { id: submissionB.id } }))?.status).toBe('new');
    });

    it('lets the owner bulk-delete only their submissions', async () => {
        await request(app)
            .post('/api/submissions/bulk/delete')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionA.id, submissionA2.id] })
            .expect(200);

        expect(await prisma.submission.findUnique({ where: { id: submissionA.id } })).toBeNull();
        expect(await prisma.submission.findUnique({ where: { id: submissionA2.id } })).toBeNull();
        expect(await prisma.submission.findUnique({ where: { id: submissionB.id } })).not.toBeNull();
    });

    it('lets the owner mark their submissions as spam', async () => {
        await request(app)
            .post('/api/submissions/bulk/spam')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionA.id] })
            .expect(200);

        expect((await prisma.submission.findUnique({ where: { id: submissionA.id } }))?.status).toBe('spam');
    });

    it('rejects unauthenticated access to protected submission endpoints', async () => {
        await request(app).get(`/api/submissions/${submissionA.id}`).expect(401);
        await request(app).get(`/api/forms/${formA.id}/submissions`).expect(401);
        await request(app).get('/api/user/submissions').expect(401);
        await request(app).put(`/api/submissions/${submissionA.id}`).send({ status: 'read' }).expect(401);
        await request(app).delete(`/api/submissions/${submissionA.id}`).expect(401);
        await request(app).post('/api/submissions/bulk/delete').send({ submissionIds: [submissionA.id] }).expect(401);
        await request(app).post('/api/submissions/bulk/spam').send({ submissionIds: [submissionA.id] }).expect(401);
    });

    it('still accepts anonymous submissions to a published form', async () => {
        const response = await request(app)
            .post(`/api/f/${formA.endpointSlug}`)
            .send({
                formData: {
                    name: 'Walk-in',
                    message: 'Table for two',
                },
            })
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeTruthy();
        expect(response.body.data.status).toBe('new');
    });

    it('lists an owner\'s submissions across their forms, not another tenant\'s', async () => {
        const response = await request(app)
            .get('/api/user/submissions')
            .set(auth(userA.token))
            .expect(200);

        const ids = response.body.data.submissions.map((row: { id: string }) => row.id);
        expect(ids).toEqual(expect.arrayContaining([submissionA.id, submissionA2.id]));
        expect(ids).not.toContain(submissionB.id);
    });

    it('handles missing and invalid resource ids without leaking existence', async () => {
        await request(app)
            .get('/api/submissions/not-a-real-id')
            .set(auth(userA.token))
            .expect(404);

        await request(app)
            .put('/api/submissions/not-a-real-id')
            .set(auth(userA.token))
            .send({ status: 'read' })
            .expect(404);

        await request(app)
            .delete('/api/submissions/not-a-real-id')
            .set(auth(userA.token))
            .expect(404);

        await request(app)
            .get('/api/forms/not-a-real-id/submissions')
            .set(auth(userA.token))
            .expect(404);

        await request(app)
            .post('/api/submissions/bulk/delete')
            .set(auth(userA.token))
            .send({ submissionIds: [submissionA.id, 'missing-id'] })
            .expect(404);

        expect(await prisma.submission.findUnique({ where: { id: submissionA.id } })).not.toBeNull();
    });

    it('ignores ownership claims in the request body', async () => {
        await request(app)
            .put(`/api/submissions/${submissionB.id}`)
            .set(auth(userA.token))
            .send({
                status: 'read',
                userId: userA.id,
                ownerId: userA.id,
                formId: formA.id,
            })
            .expect(404);

        const stored = await prisma.submission.findUnique({ where: { id: submissionB.id } });
        expect(stored?.status).toBe('new');
        expect(stored?.formId).toBe(formB.id);
    });
});
