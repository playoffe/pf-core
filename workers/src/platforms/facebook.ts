// Meta / Facebook Graph API client.
// Posts a photo to the authenticated user's feed timeline.
// Requires pages_manage_posts or publish_to_groups permission from Phase 11A OAuth.

const BASE = 'https://graph.facebook.com/v19.0';

export interface FacebookPostResult {
  postId: string;
}

/** Post an image to the user's Facebook feed. graphicUrl must be a public HTTPS URL. */
export async function postToFacebook(
  accessToken: string,
  graphicUrl: string,
  caption: string,
): Promise<FacebookPostResult> {
  const res = await fetch(`${BASE}/me/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: graphicUrl,
      caption,
      access_token: accessToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook photo post failed: ${err}`);
  }

  const data = (await res.json()) as { id?: string; post_id?: string };
  // Facebook returns { id: "photoId_postId" } or { post_id: "..." }
  const postId = data.post_id ?? data.id ?? 'unknown';
  return { postId };
}
