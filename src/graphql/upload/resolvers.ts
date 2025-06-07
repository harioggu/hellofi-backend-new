import { GraphQLError } from 'graphql';
import S3Service from '../../services/S3Service';
import { Readable } from 'stream';

export const uploadResolvers = {
  Mutation: {
    uploadFile: async (_: any, { file, folder }: { file: any; folder?: string }, context: any) => {
      // if (!context.user) {
      //   throw new GraphQLError('Not authenticated');
      // }

      try {
        console.log("File object received by resolver:", file);
        const { createReadStream, filename, mimetype } = await file.promise;
        console.log("Destructured file properties:", { createReadStream: !!createReadStream, filename, mimetype });
        const stream = createReadStream();
        
        // Generate a unique key for the file
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = folder 
          ? `${folder}/${timestamp}-${sanitizedFilename}`
          : `${timestamp}-${sanitizedFilename}`;

        // Upload to S3
        const s3Service = S3Service.getInstance();
        console.log("Uploading to S3 with details:", { filename, mimetype, key, bucketName: process.env.AWS_BUCKET_NAME, region: process.env.AWS_REGION });
        const uploadedKey = await s3Service.uploadImageWithoutResize(
          stream as Readable,
          mimetype,
          key
        );

        // Construct the URL
        const bucketName = process.env.AWS_BUCKET_NAME || 'hellofi-new-og';
        const region = process.env.AWS_REGION || 'ap-south-1';
        const url = `https://${bucketName}.s3.${region}.amazonaws.com/${uploadedKey}`;

        return {
          url,
          key: uploadedKey
        };
      } catch (error) {
        console.error('File upload error in resolver:', error);
        throw new GraphQLError('Failed to upload file');
      }
    }
  }
}; 