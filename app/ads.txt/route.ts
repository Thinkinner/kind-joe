import { ADS_TXT_BODY, adsTxtHeaders } from "@/lib/ads/ads-txt";

export function GET() {
  return new Response(ADS_TXT_BODY, {
    status: 200,
    headers: adsTxtHeaders(),
  });
}
