// Storage configuration for multiple storage options
export interface StorageConfig {
    type: 'local' | 's3' | 'gcs'; // [weeblr] No MinIO: the project is abandoned
    uploadPath?: string;
    bucketName?: string;
    region?: string;
    baseUrl?: string;
    endpoint?: string;
    accessKey?: string | undefined;
    secretKey?: string | undefined;
}

export const getStorageConfig = (): StorageConfig => {
    const storageType = process.env.FILE_STORAGE_TYPE || 'local';

    switch (storageType) {
        case 's3':
            return {
                type: 's3',
                bucketName: process.env.AWS_S3_BUCKET || 'your-bucket-name',
                region: process.env.AWS_REGION || 'us-east-1',
                accessKey: process.env.AWS_ACCESS_KEY_ID,
                secretKey: process.env.AWS_SECRET_ACCESS_KEY,
                baseUrl: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`
            };

        case 'gcs':
            return {
                type: 'gcs',
                bucketName: process.env.GCS_BUCKET_NAME || 'your-bucket-name',
                region: process.env.GCS_REGION || 'us-central1',
                baseUrl: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}`
            };

        // [weeblr] No MinIO: FILE_STORAGE_TYPE=minio falls back to local storage
        case 'local':
        default:
            return {
                type: 'local',
                uploadPath: process.env.UPLOAD_PATH || '/app/uploads',
                baseUrl: process.env.APP_URL || 'http://localhost:4001'
            };
    }
};

// Helper function to get file URL based on storage type
export const getFileUrl = (filename: string, storageConfig: StorageConfig): string => {
    switch (storageConfig.type) {
        case 's3':
        case 'gcs': // [weeblr] No MinIO
            return `${storageConfig.baseUrl}/uploads/${filename}`;
        case 'local':
        default:
            return `${storageConfig.baseUrl}/uploads/${filename}`;
    }
};

// File upload limits configuration
export const getUploadLimits = () => {
    return {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        maxFiles: parseInt(process.env.MAX_FILES || '10'),
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip',
            'application/x-zip-compressed'
        ]
    };
};
