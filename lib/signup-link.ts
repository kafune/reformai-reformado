import { headers } from "next/headers";

import QRCode from "qrcode";

/** Link de cadastro do condomínio (AUTH_URL ou o host da requisição) e o QR em SVG. */
export async function signupLink(signupCode: string): Promise<{ url: string; qrSvg: string }> {
  let base = process.env.AUTH_URL?.replace(/\/+$/, "");
  if (!base) {
    const h = await headers();
    base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  }
  const url = `${base}/cadastro/${signupCode}`;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 180 });
  return { url, qrSvg };
}
