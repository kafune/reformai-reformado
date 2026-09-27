// Arquivos em S3-compatível (MinIO local, S3/R2 em produção). Nunca públicos:
// download só por URL assinada de curta duração (PLAN.md §4.7).
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET ?? "reformai";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export async function uploadFile(key: string, body: Uint8Array, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

/** URL assinada válida por 1 hora; o navegador baixa/abre com o nome original. */
export async function signedDownloadUrl(key: string, fileName: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
    }),
    { expiresIn: 60 * 60 },
  );
}

/** Nome de arquivo seguro para compor a chave no storage. */
export function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-100) || "arquivo";
}
