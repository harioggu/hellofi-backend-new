import { S3Client, ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function testS3Access() {
  try {
    // 1. Test listing buckets
    console.log('Testing S3 access...');
    const listCommand = new ListBucketsCommand({});
    const buckets = await s3Client.send(listCommand);
    console.log('Successfully connected to AWS S3!');
    console.log('Available buckets:', buckets.Buckets?.map(b => b.Name));

    // 2. Test uploading a small file
    const bucketName = process.env.AWS_BUCKET_NAME || 'hellofi-new-og';
    const testKey = `test-${Date.now()}.txt`;
    const testContent = 'Hello, this is a test file!';

    console.log(`\nTesting file upload to bucket: ${bucketName}`);
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });

    await s3Client.send(uploadCommand);
    console.log('Successfully uploaded test file!');
    console.log(`File URL: https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`);

  } catch (error) {
    console.error('Error testing S3:', error);
  }
}

// Run the test
testS3Access(); 