import { z } from 'zod';
// [weeblr] Per-form honeypot field name
import { HONEYPOT_FIELD_PATTERN } from '../weeblr/honeypot';

/**
 * Validation schemas for submission endpoints
 */

// Form field validation schema
export const formFieldSchema = z.object({
    id: z.string(),
    type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file']),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    validation: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        message: z.string().optional(),
    }).optional(),
});

// Form settings validation schema
export const formSettingsSchema = z.object({
    // [weeblr] Multiple submissions allowed by default
    allowMultipleSubmissions: z.boolean().default(true),
    requireEmailNotification: z.boolean().default(false),
    notificationEmail: z.string().email().optional(),
    redirectUrl: z.string().url().optional(),
    customCss: z.string().optional(),
    customJs: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    spamProtection: z.object({
        enabled: z.boolean().default(true),
        honeypot: z.boolean().default(true),
        rateLimit: z.number().default(10), // submissions per minute
        // [weeblr] Per-form honeypot field name
        honeypotField: z.string().regex(HONEYPOT_FIELD_PATTERN, 'Honeypot field name must start with a letter and contain only letters, digits, _ or -').optional(),
    }).optional(),
    fields: z.array(formFieldSchema).optional(),
});

// Submission payload validation
export const submissionPayloadSchema = z.record(z.string(), z.any());

// Create submission validation - completely dynamic
export const createSubmissionSchema = z.object({
    formData: submissionPayloadSchema, // All form fields stored here dynamically
    honeypot: z.string().optional(), // For spam protection
    recaptcha_token: z.string().optional(), // reCAPTCHA token
    'g-recaptcha-response': z.string().optional(), // Alternative reCAPTCHA field name
});

// Update submission validation
export const updateSubmissionSchema = z.object({
    status: z.enum(['new', 'read', 'responded']).optional(),
    payload: submissionPayloadSchema.optional(),
});

// Query parameters validation for submissions
export const submissionQuerySchema = z.object({
    page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
});

// Webhook payload validation
export const webhookPayloadSchema = z.object({
    url: z.string().url(),
    secret: z.string().optional(),
    events: z.array(z.enum(['submission.created', 'submission.updated'])).default(['submission.created']),
});

// Email notification validation
export const emailNotificationSchema = z.object({
    to: z.string().email(),
    subject: z.string(),
    template: z.string().optional(),
    data: z.record(z.string(), z.any()).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSettings = z.infer<typeof formSettingsSchema>;
export type SubmissionPayload = z.infer<typeof submissionPayloadSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type SubmissionQueryInput = z.infer<typeof submissionQuerySchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type EmailNotification = z.infer<typeof emailNotificationSchema>;
