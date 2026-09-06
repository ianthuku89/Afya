import request from 'supertest';

jest.mock('../middleware/auth', () => ({
    authenticate: (req: any, res: any, next: any) => {
        // Mock authentication for test environments
        req.user = { userId: 'test-admin-id', role: 'SUPER_ADMIN' };
        next();
    },
    authorize: (...roles: any[]) => (req: any, res: any, next: any) => {
        // Skip authorization checks in this basic integration test
        next();
    }
}));

import { createApp } from '../app';

describe('FHIR R4 Implementation Endpoints', () => {
    let app: any;

    beforeAll(() => {
        app = createApp();
    });
    
    it('POST /fhir/r4/$process-message should accept valid FHIR Bundles', async () => {
        const payload = {
            resourceType: 'Bundle',
            type: 'message',
            id: 'dha-test-message-001',
        };

        const res = await request(app)
            .post('/api/v1/fhir/r4/$process-message')
            .send(payload);

        if (res.status === 429) {
            console.warn('Rate limit hit during test execution');
            return;
        }

        expect(res.status).toBe(200);
        expect(res.body.resourceType).toBe('Bundle');
        expect(res.body.entry[0].resource.resourceType).toBe('MessageHeader');
        expect(res.body.entry[0].resource.response.identifier).toBe('dha-test-message-001');
    });

    it('POST /fhir/r4/$process-message should reject non-Bundle JSON', async () => {
        const payload = {
            resourceType: 'Patient',
            id: 'pat-123',
        };

        const res = await request(app)
            .post('/api/v1/fhir/r4/$process-message')
            .send(payload);

        if (res.status === 429) return;

        expect(res.status).toBe(400);
        expect(res.body.resourceType).toBe('OperationOutcome');
        expect(res.body.issue[0].diagnostics).toContain('Expected FHIR MessageBundle');
    });

});
