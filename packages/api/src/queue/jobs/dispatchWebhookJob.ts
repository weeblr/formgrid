import { Job } from 'bull';
import { DispatchWebhookData } from '../queueConfig';
// [weeblr] Strip the Jev API key from webhook payloads
import { withoutSecrets } from '../../weeblr/spamFiltering';

/**
 * Dispatch webhook job processor
 */
export class DispatchWebhookJob {
    /**
     * Process webhook job
     * @param job - Bull job instance
     */
    async process(job: Job<DispatchWebhookData>): Promise<void> {
        const { submissionId, formId, webhookUrl, webhookSecret, submissionData, formData } = job.data;

        try {
            console.log(`Processing webhook job for submission ${submissionId}`);

            const payload = this.generateWebhookPayload(submissionData, formData);
            const headers = this.generateHeaders(payload, webhookSecret);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
            }

            console.log(`Webhook sent successfully for submission ${submissionId}`);
        } catch (error) {
            console.error(`Failed to send webhook for submission ${submissionId}:`, error);
            throw error; // Re-throw to trigger retry mechanism
        }
    }

    /**
     * Generate webhook payload
     * @param submissionData - The submission data
     * @param formData - The form data
     * @returns object - Webhook payload
     */
    private generateWebhookPayload(submissionData: any, formData: any): object {
        return {
            event: 'submission.created',
            timestamp: new Date().toISOString(),
            data: {
                submission: {
                    id: submissionData.id,
                    formId: submissionData.formId,
                    payload: submissionData.payload,
                    name: submissionData.name,
                    email: submissionData.email,
                    status: submissionData.status,
                    ip: submissionData.ip,
                    userAgent: submissionData.userAgent,
                    createdAt: submissionData.createdAt,
                    updatedAt: submissionData.updatedAt,
                },
                form: {
                    id: formData.id,
                    name: formData.name,
                    description: formData.description,
                    endpointSlug: formData.endpointSlug,
                    // [weeblr] Without the Jev API key
                    settings: withoutSecrets(formData.settings),
                    isActive: formData.isActive,
                    createdAt: formData.createdAt,
                    updatedAt: formData.updatedAt,
                },
            },
        };
    }

    /**
     * Generate webhook headers
     * @param payload - The webhook payload
     * @param secret - Optional webhook secret
     * @returns object - Headers for the webhook request
     */
    private generateHeaders(payload: object, secret?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'FormAPI-Webhook/1.0',
        };

        if (secret) {
            const signature = this.generateSignature(JSON.stringify(payload), secret);
            headers['X-Webhook-Signature'] = signature;
        }

        return headers;
    }

    /**
     * Generate HMAC signature for webhook verification
     * @param payload - The webhook payload as string
     * @param secret - The webhook secret
     * @returns string - HMAC signature
     */
    private generateSignature(payload: string, secret: string): string {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    /**
     * Verify webhook signature
     * @param payload - The webhook payload as string
     * @param signature - The received signature
     * @param secret - The webhook secret
     * @returns boolean - True if signature is valid
     */
    static verifySignature(payload: string, signature: string, secret: string): boolean {
        const crypto = require('crypto');
        const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
}
