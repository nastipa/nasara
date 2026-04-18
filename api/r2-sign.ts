import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req: any, res: any) {
  try {
    const R2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    });

    const key = `reels/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.mp4`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: "video/mp4",
    });

    const uploadUrl = await getSignedUrl(R2, command, {
      expiresIn: 60,
    });

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return res.status(200).json({
      uploadUrl,
      fileUrl,
    });

  } catch (error) {
    console.log("R2 SIGN ERROR:", error);

    return res.status(500).json({
      error: "Failed to generate signed URL",
    });
  }
}