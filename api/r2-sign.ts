import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: any, res: any) {
  try {
    const { fileName, contentType } = req.body;

    // 🔥 enforce MP4 (VERY IMPORTANT)
    if (contentType !== "video/mp4") {
      return res.status(400).json({
        error: "Only MP4 videos allowed",
      });
    }

    const key = `videos/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: 60 * 5,
    });

    const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

    return res.status(200).json({
      signedUrl,
      publicUrl,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: "Failed to sign URL" });
  }
}