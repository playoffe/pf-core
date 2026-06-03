// X (Twitter) API v2 client.
//
// Flow:
//  1. Upload media via v1.1 INIT→APPEND→FINALIZE (chunked) or simple upload for < 5 MB PNGs
//  2. Create tweet with media_ids via v2 /tweets endpoint
//
// Both endpoints accept the OAuth 2.0 user access token obtained via PKCE flow.

const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEET_URL  = 'https://api.twitter.com/2/tweets';

export interface XPostResult {
  tweetId: string;
  tweetUrl: string;
}

/**
 * Post an image + caption to X.
 * accessToken: user access token from PKCE OAuth 2.0 flow.
 * imageBuffer: raw PNG/JPEG bytes (< 5 MB for simple upload).
 */
export async function postToX(
  accessToken: string,
  imageBuffer: Buffer,
  caption: string,
  username: string,   // for building the tweet URL
): Promise<XPostResult> {
  // Step 1: Upload media
  const mediaId = await uploadMedia(accessToken, imageBuffer);

  // Step 2: Create tweet
  const res = await fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: caption,
      media: { media_ids: [mediaId] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X tweet creation failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const tweetId = data.data?.id ?? 'unknown';
  return {
    tweetId,
    tweetUrl: `https://x.com/${username}/status/${tweetId}`,
  };
}

async function uploadMedia(accessToken: string, buffer: Buffer): Promise<string> {
  // Simple upload (works for images < 5 MB)
  const form = new FormData();
  form.append('media', new Blob([buffer], { type: 'image/png' }), 'graphic.png');
  form.append('media_category', 'tweet_image');

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X media upload failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { media_id_string?: string };
  if (!data.media_id_string) throw new Error('X media upload returned no media_id_string');
  return data.media_id_string;
}
