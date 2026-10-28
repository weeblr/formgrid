import { Router } from 'express';
import { FormController } from './form.controller';
import { authMiddleware } from '../presentation/middleware/auth';

/**
 * Form routes
 */
export function createFormRoutes(formController?: FormController): Router {
    const router = Router();
    const controller = formController || new FormController();

    // Bind methods to preserve 'this' context
    const getAllForms = controller.getAllForms.bind(controller);
    const createForm = controller.createForm.bind(controller);
    const getFormById = controller.getFormById.bind(controller);
    const getFormByEndpointSlug = controller.getFormByEndpointSlug.bind(controller);
    const updateForm = controller.updateForm.bind(controller);
    const deleteForm = controller.deleteForm.bind(controller);
    const getUserForms = controller.getUserForms.bind(controller);
    const generateEndpointSlug = controller.generateEndpointSlug.bind(controller);
    const getFormStatistics = controller.getFormStatistics.bind(controller);

    // Protected routes (authentication required)
    // [weeblr] Lookup by slug is signed-in and owner only: forms are not hosted here, only submissions received
    router.get('/slug/:endpointSlug', authMiddleware, getFormByEndpointSlug);
    router.get('/', authMiddleware, getAllForms);
    router.post('/', authMiddleware, createForm);
    router.post('/generate-slug', authMiddleware, generateEndpointSlug);
    router.get('/user/:userId', authMiddleware, getUserForms);
    router.get('/:id/statistics', authMiddleware, getFormStatistics); // Must come before /:id
    router.get('/:id', authMiddleware, getFormById);
    router.put('/:id', authMiddleware, updateForm);
    router.delete('/:id', authMiddleware, deleteForm);

    return router;
}

// Export individual route handlers for testing
export { FormController };

