import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { getStorageConfig, getUploadLimits, getFileUrl as getConfigFileUrl } from '../config/storage';

// Get storage configuration
const storageConfig = getStorageConfig();
const uploadLimits = getUploadLimits();

// Create uploads directory if using local storage
if (storageConfig.type === 'local') {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

// Configure multer based on storage type
let upload: multer.Multer;

if (storageConfig.type === 'local') {
    // Local disk storage
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = storageConfig.uploadPath || path.join(process.cwd(), 'uploads');
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext);
            cb(null, `${name}-${uniqueSuffix}${ext}`);
        }
    });

    upload = multer({
        storage: storage,
        limits: {
            fileSize: uploadLimits.maxFileSize,
            files: uploadLimits.maxFiles
        },
        fileFilter: (req, file, cb) => {
            if (uploadLimits.allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`File type ${file.mimetype} not allowed`));
            }
        }
    });
} else {
    // Memory storage for cloud uploads
    const memoryStorage = multer.memoryStorage();

    upload = multer({
        storage: memoryStorage,
        limits: {
            fileSize: uploadLimits.maxFileSize,
            files: uploadLimits.maxFiles
        },
        fileFilter: (req, file, cb) => {
            if (uploadLimits.allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`File type ${file.mimetype} not allowed`));
            }
        }
    });
}

// Lazy load cloud storage clients to avoid import errors when not used
let s3Client: any = null;
let gcsClient: any = null; // [weeblr] No MinIO client

// Initialize cloud storage clients
const initializeCloudClients = async () => {
    switch (storageConfig.type) {
        case 's3':
            if (storageConfig.accessKey && storageConfig.secretKey) {
                try {
                    const { S3Client } = await import('@aws-sdk/client-s3');
                    s3Client = new S3Client({
                        region: storageConfig.region || 'us-east-1',
                        credentials: {
                            accessKeyId: storageConfig.accessKey,
                            secretAccessKey: storageConfig.secretKey,
                        },
                    });
                } catch (error) {
                    console.warn('AWS SDK not installed, S3 storage will not work');
                }
            }
            break;

        case 'gcs':
            try {
                const { Storage } = await import('@google-cloud/storage');
                const config: any = {};
                if (process.env.GCS_PROJECT_ID) config.projectId = process.env.GCS_PROJECT_ID;
                if (process.env.GOOGLE_APPLICATION_CREDENTIALS) config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

                gcsClient = new Storage(config);
            } catch (error) {
                console.warn('Google Cloud Storage SDK not installed, GCS storage will not work');
            }
            break;
        // [weeblr] No MinIO
    }
};

// Upload file to cloud storage
const uploadToCloud = async (file: Express.Multer.File): Promise<string> => {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;

    switch (storageConfig.type) {
        case 's3':
            if (!s3Client || !storageConfig.bucketName) {
                throw new Error('S3 client not initialized');
            }

            const { PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Command = new PutObjectCommand({
                Bucket: storageConfig.bucketName,
                Key: `uploads/${filename}`,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            });

            await s3Client.send(s3Command);
            return filename;

        case 'gcs':
            if (!gcsClient || !storageConfig.bucketName) {
                throw new Error('GCS client not initialized');
            }

            const bucket = gcsClient.bucket(storageConfig.bucketName);
            const fileUpload = bucket.file(`uploads/${filename}`);

            await fileUpload.save(file.buffer, {
                metadata: {
                    contentType: file.mimetype,
                },
            });

            await fileUpload.makePublic();
            return filename;

        // [weeblr] No MinIO
        default:
            throw new Error(`Unsupported storage type: ${storageConfig.type}`);
    }
};

// Middleware to handle file uploads
export const handleFileUpload = (req: Request, res: any, next: any) => {
    upload.any()(req, res, async (err: any) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        // If using cloud storage, upload files to cloud
        if (storageConfig.type !== 'local' && req.files && Array.isArray(req.files)) {
            try {
                // Initialize cloud clients if not already done
                if (!s3Client && !gcsClient) { // [weeblr] No MinIO client
                    await initializeCloudClients();
                }

                const uploadedFiles = [];

                for (const file of req.files) {
                    const filename = await uploadToCloud(file);
                    uploadedFiles.push({
                        ...file,
                        filename: filename,
                        url: getConfigFileUrl(filename, storageConfig)
                    });
                }

                req.files = uploadedFiles;
            } catch (error) {
                console.error('Cloud upload error:', error);
                return res.status(500).json({ error: 'Failed to upload files to cloud storage' });
            }
        }

        next();
    });
};

// Helper function to get the URL for an uploaded file
export const getFileUrl = (filename: string): string => {
    return getConfigFileUrl(filename, storageConfig);
};

// Helper function to delete a file
export const deleteFile = async (filename: string): Promise<void> => {
    switch (storageConfig.type) {
        case 's3':
            if (s3Client && storageConfig.bucketName) {
                const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: storageConfig.bucketName,
                    Key: `uploads/${filename}`,
                }));
            }
            break;

        case 'gcs':
            if (gcsClient && storageConfig.bucketName) {
                const bucket = gcsClient.bucket(storageConfig.bucketName);
                await bucket.file(`uploads/${filename}`).delete();
            }
            break;

        // [weeblr] No MinIO
        case 'local':
        default:
            // Local file deletion
            return new Promise((resolve, reject) => {
                const uploadDir = storageConfig.uploadPath || path.join(process.cwd(), 'uploads');
                const filePath = path.join(uploadDir, filename);
                fs.unlink(filePath, (err) => {
                    if (err && err.code !== 'ENOENT') {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
    }
};

// Export the upload instance for backward compatibility
export { upload };