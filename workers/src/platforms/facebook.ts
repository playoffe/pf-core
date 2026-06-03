// Meta / Facebook Graph API client.
// Posts a photo to the authenticated user's feed timeline.
// Requires pages_manage_posts or publish_to_groups permission from Phase 11A OAuth.

const BASE = 'https://graph.facebook.com/v19.0';

export interface FacebookPostResult {
  postId: string;
}

// ── Multi-photo post (group-stage draw carousel) ──────────────────────────────
// For Facebook Pages: upload each photo with published=false to get photo IDs,
// then create one feed post with attached_media referencing all IDs.

/** Post multiple images as one multi-photo post to a Facebook Page feed. */
export async function postMultiPhotoToFacebook(
  accessToken: string,
  imageUrls: string[],   // 2–10 public HTTPS URLs
  caption: string,
): Promise<FacebookPostResult> {
  if (imageUrls.length < 2) {
    return postToFacebook(accessToken, imageUrls[0], caption);
  }

  // Clamp to 10 photos
  const urls = imageUrls.slice(0, 10);

  // Step 1: Upload each photo without publishing → get photo IDs
  const photoIds: string[] = [];
  for (const url of urls) {
    const res = await fetch(`${BASE}/me/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        published:    false,   // don't create a standalone post yet
        access_token: accessToken,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook photo upload (unpublished) failed: ${err}`);
    }
    const data = (await res.json()) as { id?: string };
    if (data.id) photoIds.push(data.id);
  }

  if (photoIds.length === 0) throw new Error('No Facebook photo IDs returned');

  // Step 2: Create a single feed post that attaches all photos
  const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));

  const feedRes = await fetch(`${BASE}/me/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message:        caption,
      attached_media: attachedMedia,
      access_token:   accessToken,
    }),
  });
  if (!feedRes.ok) {
    const err = await feedRes.text();
    throw new Error(`Facebook multi-photo feed post failed: ${err}`);
  }
  const feedData = (await feedRes.json()) as { id?: string };
  return { postId: feedData.id ?? 'unknown' };
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
