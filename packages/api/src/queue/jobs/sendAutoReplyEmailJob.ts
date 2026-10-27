import { Job } from 'bull';
import { SendAutoReplyEmailData } from '../queueConfig';
import { MailerService, EmailTemplateData } from '../../services/mailerService';
// [weeblr] Emails in the form's language, with escaped values
import { sendAutoReplyEmail } from '../../weeblr/emails';

/**
 * Send auto-reply email job processor
 */
export class SendAutoReplyEmailJob {
    private mailerService: MailerService;

    constructor(mailerService?: MailerService) {
        this.mailerService = mailerService || new MailerService();
    }

    /**
     * Process auto-reply email job
     * @param job - Bull job instance
     */
    async process(job: Job<SendAutoReplyEmailData>): Promise<void> {
        const { submissionId, formId, submitterEmail, submissionData, formData } = job.data;

        try {
            console.log(`Processing auto-reply email job for submission ${submissionId}`);

            // Prepare template data
            const templateData: EmailTemplateData = {
                formName: formData.name,
                formDescription: formData.description,
                submissionId: submissionData.id,
                submittedAt: new Date(submissionData.createdAt).toLocaleString(),
                submitterName: submissionData.name,
                submitterEmail: submissionData.email,
                ipAddress: submissionData.ip,
                formData: submissionData.payload,
                fields: this.prepareFieldsData(submissionData.payload, formData.settings),
            };

            // [weeblr] Emails in the form's language, with escaped values
            await sendAutoReplyEmail(this.mailerService, submitterEmail, { data: templateData, settings: formData.settings, createdAt: submissionData.createdAt });

            console.log(`Auto-reply email sent successfully for submission ${submissionId}`);
        } catch (error) {
            console.error(`Failed to send auto-reply email for submission ${submissionId}:`, error);
            throw error; // Re-throw to trigger retry mechanism
        }
    }

    /**
     * Prepare fields data for template rendering
     * @param payload - Submission payload
     * @param settings - Form settings
     * @returns Array of field data
     */
    private prepareFieldsData(payload: any, settings: any): Array<{ id: string; label: string; value: any }> {
        if (!payload || typeof payload !== 'object') {
            return [];
        }

        return Object.entries(payload).map(([key, value]) => ({
            id: key,
            label: this.getFieldLabel(key, settings),
            value,
        }));
    }

    /**
     * Get field label from form settings or use field key
     * @param fieldKey - The field key
     * @param settings - The form settings
     * @returns string - Field label
     */
    private getFieldLabel(fieldKey: string, settings: any): string {
        if (settings?.fields) {
            const field = settings.fields.find((f: any) => f.id === fieldKey);
            if (field?.label) {
                return field.label;
            }
        }
        return fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1);
    }
}
