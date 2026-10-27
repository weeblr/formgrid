import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, User } from '@prisma/client';
import { env } from '../config/env';
import { EmailProvider } from '../infrastructure/email/EmailProvider';
import { signupSchema, loginSchema } from '../auth/auth.validation';
import { accountsEnabled } from './config';

// [weeblr] Email verification, disabled in the open source version.
// Mounted before the upstream auth routes: signup is replaced, login is only pre-checked.

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_INTERVAL_MS = 5 * 60 * 1000;

const sendVerificationEmail = async (prisma: PrismaClient, emailProvider: EmailProvider, user: User): Promise<void> => {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

    await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken, verificationTokenExpires },
    });

    const verifyLink = `${env.APP_URL}/api/auth/verify?token=${verificationToken}`;
    const emailHtml = `
        <h1>Verify your email address</h1>
        <p>Please confirm your email address to activate your account:</p>
        <a href="${verifyLink}" style="background-color: #111827; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify email address</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
    `;

    await emailProvider.send(user.email, 'Verify your email address', emailHtml);
};

/**
 * A new link is sent at most every RESEND_INTERVAL_MS. The send time is
 * derived from the token expiry, so no extra column is needed.
 */
const canResend = (user: User): boolean => {
    if (!user.verificationTokenExpires) {
        return true;
    }
    const sentAt = user.verificationTokenExpires.getTime() - VERIFICATION_TTL_MS;
    return Date.now() - sentAt >= RESEND_INTERVAL_MS;
};

export function createWeeblrAuthRoutes(prisma: PrismaClient, emailProvider: EmailProvider): Router {
    const router = Router();

    /**
     * POST /api/auth/signup
     * Create an unverified account and email a verification link. No login token is issued.
     */
    router.post('/signup', async (req: Request, res: Response): Promise<void> => {
        if (!accountsEnabled()) {
            res.status(403).json({
                success: false,
                message: 'Account creation is disabled',
            });
            return;
        }

        try {
            const validationResult = signupSchema.safeParse(req.body);
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

            const { email, password } = validationResult.data;

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                res.status(400).json({
                    success: false,
                    message: 'User with this email already exists',
                });
                return;
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    isEmailVerified: false,
                    profile: { create: {} },
                },
            });

            try {
                await sendVerificationEmail(prisma, emailProvider, user);
            } catch (error) {
                console.error(`Failed to send verification email to user ${user.id}:`, error);
            }

            res.status(201).json({
                success: true,
                message: 'Account created. Please check your email to verify your address before logging in.',
                data: {
                    id: user.id,
                    email: user.email,
                },
            });
        } catch (error) {
            console.error('Signup failed:', error);
            res.status(400).json({
                success: false,
                message: 'Signup failed. Please try again.',
            });
        }
    });

    /**
     * POST /api/auth/login (pre-check)
     * Refuses unverified accounts once the password is known to be right, and
     * sends a new verification link. Everything else goes on to the upstream login.
     */
    router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const validationResult = loginSchema.safeParse(req.body);
            if (!validationResult.success) {
                next();
                return;
            }

            const { email, password } = validationResult.data;
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || user.isEmailVerified || !user.passwordHash) {
                next();
                return;
            }

            if (!(await bcrypt.compare(password, user.passwordHash))) {
                next();
                return;
            }

            let message = 'Please verify your email address first. Check your inbox for the verification link.';
            if (canResend(user)) {
                try {
                    await sendVerificationEmail(prisma, emailProvider, user);
                    message = 'Please verify your email address first. We sent you a new verification link.';
                } catch (error) {
                    console.error(`Failed to send verification email to user ${user.id}:`, error);
                }
            }

            res.status(403).json({
                success: false,
                message,
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
