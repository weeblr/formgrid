import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

/**
 * Extended Request interface with user authentication data
 */
export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
    };
}

/**
 * JWT Authentication Middleware
 * 
 * Behavior:
 * - Reads Authorization header "Bearer <token>"
 * - Verifies JWT token using env.JWT_SECRET
 * - On success: attaches req.user = { id: payload.sub, email: payload.email }
 * - On failure: responds with 401 JSON error
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: 'Authorization header is required'
            });
            return;
        }

        // Check if header starts with "Bearer "
        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authorization header must start with "Bearer "'
            });
            return;
        }

        // Extract token (remove "Bearer " prefix)
        const token = authHeader.substring(7);

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Token is required'
            });
            return;
        }

        // Verify JWT token
        // [weeblr] Algorithm pinned
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;

        // Check if payload has required fields
        if (!payload.sub || !payload.email) {
            res.status(401).json({
                success: false,
                error: 'Invalid token payload'
            });
            return;
        }

        // Attach user data to request
        (req as AuthRequest).user = {
            id: payload.sub,
            email: payload.email
        };

        // Continue to next middleware/route handler
        next();

    } catch (error) {
        // Handle JWT verification errors
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
            return;
        }

        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token has expired'
            });
            return;
        }

        if (error instanceof jwt.NotBeforeError) {
            res.status(401).json({
                success: false,
                error: 'Token not active'
            });
            return;
        }

        // Handle other errors
        res.status(401).json({
            success: false,
            error: 'Token verification failed'
        });
    }
};

/**
 * Optional middleware for routes that can work with or without authentication
 * Similar to authMiddleware but doesn't return 401 on missing token
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user data
            next();
            return;
        }

        const token = authHeader.substring(7);

        if (!token) {
            next();
            return;
        }

        // Try to verify token
        // [weeblr] Algorithm pinned
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;

        if (payload.sub && payload.email) {
            // Attach user data if token is valid
            (req as AuthRequest).user = {
                id: payload.sub,
                email: payload.email
            };
        }

        next();

    } catch (error) {
        // Token verification failed, continue without user data
        next();
    }
};
