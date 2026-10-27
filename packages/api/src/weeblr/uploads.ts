import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { handleFileUpload } from '../middleware/fileUpload';

// [weeblr] File uploads on public submissions are off unless ENABLE_UPLOADS=true.
// Off: multipart requests are still accepted for their text fields (forms posted as
// multipart/form-data or with FormData), parsed in memory with small limits; any file
// part is refused with 403 before anything is written. On: upstream's upload handling.

export const uploadsEnabled = (): boolean => process.env.ENABLE_UPLOADS === 'true';

const textOnlyMultipart = multer({
    limits: {
        fieldSize: 8 * 1024,
        fields: 100,
        parts: 100,
        files: 0,
    },
}).none();

/**
 * Upload handling for the public submission routes, in place of handleFileUpload.
 */
export const weeblrHandleFileUpload = (req: Request, res: Response, next: NextFunction): void => {
    if (uploadsEnabled()) {
        handleFileUpload(req, res, next);
        return;
    }

    if (!req.is('multipart/form-data')) {
        next();
        return;
    }

    textOnlyMultipart(req, res, (error: unknown) => {
        if (!error) {
            next();
            return;
        }
        const code = error instanceof multer.MulterError ? error.code : '';
        if (code === 'LIMIT_UNEXPECTED_FILE' || code === 'LIMIT_FILE_COUNT') {
            res.sendStatus(403);
            return;
        }
        res.sendStatus(code.startsWith('LIMIT_') ? 413 : 400);
    });
};
