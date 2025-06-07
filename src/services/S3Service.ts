import { PutObjectCommand } from "@aws-sdk/client-s3";
const { s3Client } = require("../config/S3Config");

class S3Service {
  private static instance: S3Service;
  private readonly bucketName: string;

  private constructor() {
    this.bucketName = process.env.AWS_BUCKET_NAME || "hellofi-new-og";
  }

  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return key;
  }

  public async uploadImageWithoutResize(fileStream: NodeJS.ReadableStream, mimetype: string, key: string): Promise<string> {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk) => chunks.push(chunk));
      fileStream.on("end", () => resolve(Buffer.concat(chunks)));
      fileStream.on("error", (error) => reject(error));
    });

    return this.uploadToS3(buffer, key, mimetype);
  }
}

export default S3Service; 