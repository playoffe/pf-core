import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl)  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
if (!serviceKey)   throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

/** Service-role admin client — bypasses RLS for all worker operations */
export const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Supabase Storage bucket for rendered social graphics (must be public) */
export const GRAPHICS_BUCKET = process.env.SUPABASE_SOCIAL_GRAPHICS_BUCKET ?? 'social-graphics';

/** Upload a PNG buffer and return its public CDN URL */
export async function uploadGraphic(
  fileName: string,
  pngBuffer: Buffer,
): Promise<string> {
  const { error } = await supabase.storage
    .from(GRAPHICS_BUCKET)
    .upload(fileName, pngBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(GRAPHICS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
