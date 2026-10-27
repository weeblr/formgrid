import { z } from 'zod';
// [weeblr] Per-form honeypot field name
import { HONEYPOT_FIELD_PATTERN } from '../weeblr/honeypot';

/**
 * Validation schemas for form endpoints
 */

// Form settings validation schema
export const formSettingsSchema = z.object({
    // [weeblr] Multiple submissions allowed by default
    allowMultipleSubmissions: z.boolean().default(true),
    requireEmailNotification: z.boolean().default(false),
    notificationEmail: z.string().email().optional(),
    redirectUrl: z.string().url().optional(),
    customCss: z.string().optional(),
    customJs: z.string().optional(),
    spamProtection: z.object({
        enabled: z.boolean().default(true),
        honeypot: z.boolean().default(true),
        rateLimit: z.number().default(10), // submissions per minute
        // [weeblr] Per-form honeypot field name
        honeypotField: z.string().regex(HONEYPOT_FIELD_PATTERN, 'Honeypot field name must start with a letter and contain only letters, digits, _ or -').optional(),
    }).optional(),
    fields: z.array(z.object({
        id: z.string(),
        type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file']),
        label: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(), // For select, radio, checkbox
        validation: z.object({
            min: z.number().optional(),
            max: z.number().optional(),
            pattern: z.string().optional(),
            message: z.string().optional(),
        }).optional(),
    })).optional(),
});

// Create form validation
export const createFormSchema = z.object({
    name: z.string().min(1, 'Form name is required').max(100, 'Name must be less than 100 characters'),
    description: z.string().max(500, 'Description must be less than 500 characters').or(z.literal('')).or(z.null()).optional().transform(val => val === '' || val === null ? undefined : val),
    endpointSlug: z.string()
        .min(3, 'Endpoint slug must be at least 3 characters')
        .max(50, 'Endpoint slug must be less than 50 characters')
        .regex(/^[a-z0-9-]+$/, 'Endpoint slug can only contain lowercase letters, numbers, and hyphens')
        .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), 'Endpoint slug cannot start or end with hyphens')
        .optional(),
    settings: formSettingsSchema.optional(),
});

// Update form validation
export const updateFormSchema = z.object({
    name: z.string().min(1, 'Form name is required').max(100, 'Name must be less than 100 characters').optional(),
    description: z.string().max(500, 'Description must be less than 500 characters').or(z.literal('')).or(z.null()).optional().transform(val => val === '' || val === null ? undefined : val),
    endpointSlug: z.string()
        .min(3, 'Endpoint slug must be at least 3 characters')
        .max(50, 'Endpoint slug must be less than 50 characters')
        .regex(/^[a-z0-9-]+$/, 'Endpoint slug can only contain lowercase letters, numbers, and hyphens')
        .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), 'Endpoint slug cannot start or end with hyphens')
        .optional(),
    settings: formSettingsSchema.optional(),
    isActive: z.boolean().optional(),
});

// Form submission validation (for when forms are submitted)
export const formSubmissionSchema = z.object({
    formData: z.record(z.string(), z.any()), // Dynamic object based on form fields
    name: z.string().optional(),
    email: z.string().email().optional(),
});

// Query parameters validation
export const formQuerySchema = z.object({
    page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
});

// Endpoint slug validation
export const endpointSlugSchema = z.string()
    .min(3, 'Endpoint slug must be at least 3 characters')
    .max(50, 'Endpoint slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Endpoint slug can only contain lowercase letters, numbers, and hyphens')
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), 'Endpoint slug cannot start or end with hyphens');

export type FormSettings = z.infer<typeof formSettingsSchema>;
export type CreateFormInput = z.infer<typeof createFormSchema>;
export type UpdateFormInput = z.infer<typeof updateFormSchema>;
export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>;
export type FormQueryInput = z.infer<typeof formQuerySchema>;
export type EndpointSlugInput = z.infer<typeof endpointSlugSchema>;
