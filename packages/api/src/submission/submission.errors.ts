/**
 * Thrown when a submission (or its parent form) is missing or not owned
 * by the authenticated user. Controllers map this to 404 so that
 * cross-tenant probes do not reveal whether the resource exists.
 */
export class SubmissionNotFoundError extends Error {
    constructor(message: string = 'Submission not found') {
        super(message);
        this.name = 'SubmissionNotFoundError';
    }
}
