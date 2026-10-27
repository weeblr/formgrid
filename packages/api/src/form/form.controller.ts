import { Request, Response } from 'express';
import { FormService } from './form.service';
import { FormRepository } from './form.repository';
import { createFormSchema, updateFormSchema, formQuerySchema, endpointSlugSchema } from './form.validation';

/**
 * Form controller for handling HTTP requests
 */
export class FormController {
    private formService: FormService;

    constructor(formService?: FormService) {
        if (formService) {
            this.formService = formService;
        } else {
            // Initialize dependencies for backward compatibility
            const formRepo = new FormRepository();
            this.formService = new FormService(formRepo);
        }
    }

    /**
     * GET /api/forms
     * Get all forms with pagination for the authenticated user
     */
    async getAllForms(req: Request, res: Response): Promise<void> {
        try {
            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            // Validate query parameters
            const queryResult = formQuerySchema.safeParse(req.query);
            if (!queryResult.success) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    errors: queryResult.error.issues.map((err: any) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }

            const { page = 1, limit = 10 } = queryResult.data;
            const result = await this.formService.getAll(page, limit, userId);

            res.status(200).json({
                success: true,
                message: 'Forms retrieved successfully',
                data: {
                    forms: result.forms.map(form => ({
                        id: form.id,
                        name: form.name,
                        description: form.description,
                        endpointSlug: form.endpointSlug,
                        endpointUrl: this.formService.getFormEndpointUrl(form.endpointSlug),
                        isActive: form.isActive,
                        createdAt: form.createdAt,
                        updatedAt: form.updatedAt,
                        submissionCount: (form as any)._count?.submissions || 0,
                    })),
                    pagination: {
                        page,
                        limit,
                        total: result.total,
                        totalPages: result.totalPages,
                    },
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve forms',
                error: (error as Error).message,
            });
        }
    }

    /**
     * POST /api/forms
     * Create a new form
     */
    async createForm(req: Request, res: Response): Promise<void> {
        try {
            // [weeblr] Request body not logged: the settings hold the Jev API key
            // Validate input
            const validationResult = createFormSchema.safeParse(req.body);
            if (!validationResult.success) {
                console.log('Validation errors:', validationResult.error.issues);
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationResult.error.issues.map((err: any) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }

            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const formData: {
                name: string;
                description?: string | null;
                endpointSlug?: string;
                settings?: any;
            } = {
                name: validationResult.data.name,
                description: validationResult.data.description || null,
                ...(validationResult.data.endpointSlug && { endpointSlug: validationResult.data.endpointSlug }),
                ...(validationResult.data.settings && { settings: validationResult.data.settings }),
            };
            const form = await this.formService.create(formData, userId);

            res.status(201).json({
                success: true,
                message: 'Form created successfully',
                data: {
                    id: form.id,
                    name: form.name,
                    description: form.description,
                    endpointSlug: form.endpointSlug,
                    endpointUrl: this.formService.getFormEndpointUrl(form.endpointSlug),
                    isActive: form.isActive,
                    createdAt: form.createdAt,
                },
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    }

    /**
     * GET /api/forms/:id
     * Get a specific form by ID (only for the owner)
     */
    async getFormById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Form ID is required',
                });
                return;
            }

            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const form = await this.formService.getByIdWithUser(id, userId);

            if (!form) {
                res.status(404).json({
                    success: false,
                    message: 'Form not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Form retrieved successfully',
                data: {
                    id: form.id,
                    name: form.name,
                    description: form.description,
                    endpointSlug: form.endpointSlug,
                    endpointUrl: this.formService.getFormEndpointUrl(form.endpointSlug),
                    settings: form.settings,
                    isActive: form.isActive,
                    createdAt: form.createdAt,
                    updatedAt: form.updatedAt,
                    submissionCount: (form as any)._count?.submissions || 0,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve form',
                error: (error as Error).message,
            });
        }
    }

    /**
     * GET /api/forms/slug/:endpointSlug
     * Get a form by its endpoint slug (for public access)
     */
    async getFormByEndpointSlug(req: Request, res: Response): Promise<void> {
        try {
            const { endpointSlug } = req.params;

            if (!endpointSlug) {
                res.status(400).json({
                    success: false,
                    message: 'Endpoint slug is required',
                });
                return;
            }

            // Validate endpoint slug format
            const slugValidation = endpointSlugSchema.safeParse(endpointSlug);
            if (!slugValidation.success) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid endpoint slug format',
                    errors: slugValidation.error.issues.map((err: any) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }

            const form = await this.formService.getByEndpointSlug(endpointSlug);

            if (!form) {
                res.status(404).json({
                    success: false,
                    message: 'Form not found or inactive',
                });
                return;
            }

            // Return only public form data (no user info)
            res.status(200).json({
                success: true,
                message: 'Form retrieved successfully',
                data: {
                    name: form.name,
                    description: form.description,
                    // [weeblr] No settings: they hold notification addresses, the honeypot field name and the Jev API key
                },
            });
        } catch (error) {
            // [weeblr] Public route: the detail is logged, not returned
            console.error('Failed to retrieve form:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve form',
            });
        }
    }

    /**
     * PUT /api/forms/:id
     * Update a specific form
     */
    async updateForm(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Form ID is required',
                });
                return;
            }

            // Validate input
            const validationResult = updateFormSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationResult.error.issues.map((err: any) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }

            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const updateData: Partial<{
                name: string;
                description: string | null;
                endpointSlug: string;
                settings: any;
                isActive: boolean;
            }> = {};

            if (validationResult.data.name !== undefined) updateData.name = validationResult.data.name;
            if (validationResult.data.description !== undefined) updateData.description = validationResult.data.description || null;
            if (validationResult.data.endpointSlug !== undefined) updateData.endpointSlug = validationResult.data.endpointSlug;
            if (validationResult.data.settings !== undefined) updateData.settings = validationResult.data.settings;
            if (validationResult.data.isActive !== undefined) updateData.isActive = validationResult.data.isActive;
            const form = await this.formService.update(id, updateData, userId);

            res.status(200).json({
                success: true,
                message: 'Form updated successfully',
                data: {
                    id: form.id,
                    name: form.name,
                    description: form.description,
                    endpointSlug: form.endpointSlug,
                    endpointUrl: this.formService.getFormEndpointUrl(form.endpointSlug),
                    isActive: form.isActive,
                    updatedAt: form.updatedAt,
                },
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    }

    /**
     * DELETE /api/forms/:id
     * Delete a specific form
     */
    async deleteForm(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Form ID is required',
                });
                return;
            }

            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const form = await this.formService.delete(id, userId);

            res.status(200).json({
                success: true,
                message: 'Form deleted successfully',
                data: {
                    id: form.id,
                    name: form.name,
                },
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    }

    /**
     * GET /api/forms/user/:userId
     * Get all forms for a specific user
     */
    async getUserForms(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }

            // Check if requesting user is the same as the user ID in params
            const requestingUserId = (req as any).user?.id;
            if (!requestingUserId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            if (requestingUserId !== userId) {
                res.status(403).json({
                    success: false,
                    message: 'You can only view your own forms',
                });
                return;
            }

            const forms = await this.formService.getByUserId(userId);

            res.status(200).json({
                success: true,
                message: 'User forms retrieved successfully',
                data: {
                    forms: forms.map(form => ({
                        id: form.id,
                        name: form.name,
                        description: form.description,
                        endpointSlug: form.endpointSlug,
                        endpointUrl: this.formService.getFormEndpointUrl(form.endpointSlug),
                        isActive: form.isActive,
                        createdAt: form.createdAt,
                        updatedAt: form.updatedAt,
                        submissionCount: (form as any)._count?.submissions || 0,
                    })),
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user forms',
                error: (error as Error).message,
            });
        }
    }

    /**
     * POST /api/forms/generate-slug
     * Generate a unique endpoint slug from a form name
     */
    async generateEndpointSlug(req: Request, res: Response): Promise<void> {
        try {
            const { name } = req.body;

            if (!name || typeof name !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Form name is required',
                });
                return;
            }

            // Get user ID from authenticated request
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const endpointSlug = await this.formService.generateUniqueEndpointSlug(name, userId);

            res.status(200).json({
                success: true,
                message: 'Endpoint slug generated successfully',
                data: {
                    endpointSlug,
                    endpointUrl: this.formService.getFormEndpointUrl(endpointSlug),
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate endpoint slug',
                error: (error as Error).message,
            });
        }
    }

    async getFormStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            if (!userId || !id) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized or invalid request',
                });
                return;
            }

            // Get form to verify ownership
            const form = await this.formService.getByIdWithUser(id, userId);
            if (!form) {
                res.status(404).json({
                    success: false,
                    message: 'Form not found',
                });
                return;
            }

            // Get real statistics from database
            const totalSubmissions = await this.formService.getSubmissionCount(id);

            // Calculate this week's submissions from database
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const thisWeekSubmissions = await this.formService.getSubmissionsCountSince(id, oneWeekAgo);

            // Calculate spam rate from actual spam submissions
            const spamSubmissions = await this.formService.getSpamSubmissionsCount(id);
            const spamRate = totalSubmissions > 0 ? (spamSubmissions / totalSubmissions) * 100 : 0;

            const statistics = {
                totalSubmissions,
                thisWeekSubmissions,
                spamRate,
                createdDate: form.createdAt,
            };

            res.json({
                success: true,
                data: statistics,
            });
        } catch (error) {
            console.error('Error fetching form statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch form statistics',
                error: (error as Error).message,
            });
        }
    }
}

