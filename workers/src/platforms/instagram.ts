// Instagram Graph API client.
// Requires the Business/Creator account linked via Facebook App — the standard
// Instagram Basic Display API does NOT support posting.
//
// Flow:
//  1. Create a media container (image_url must be a publicly accessible HTTPS URL)
//  2. Wait for the container to be ready (status = FINISHED)
//  3. Publish the container → returns the live media ID

const BASE = 'https://graph.instagram.com/v19.0';

export interface InstagramPostResult {
  mediaId: string;
}

/** Post a single image to Instagram. graphicUrl must be a public HTTPS URL. */
export async function postToInstagram(
  accessToken: string,
  graphicUrl: string,
  caption: string,
): Promise<InstagramPostResult> {
  // Step 1: Get the IG user ID
  const meRes = await fetch(`${BASE}/me?fields=id&access_token=${accessToken}`);
  if (!meRes.ok) {
    const err = await meRes.text();
    throw new Error(`Instagram /me failed: ${err}`);
  }
  const { id: igUserId } = (await meRes.json()) as { id: string };

  // Step 2: Create media container
  const createRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: graphicUrl,
      caption,
      access_token: accessToken,
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Instagram media container creation failed: ${err}`);
  }
  const { id: creationId } = (await createRes.json()) as { id: string };

  // Step 3: Poll until container is FINISHED (usually < 5 seconds)
  await waitForInstagramContainer(igUserId, creationId, accessToken);

  // Step 4: Publish
  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });
  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publish failed: ${err}`);
  }
  const { id: mediaId } = (await publishRes.json()) as { id: string };
  return { mediaId };
}

async function waitForInstagramContainer(
  igUserId: string,
  creationId: string,
  accessToken: string,
  maxAttempts = 10,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(
      `${BASE}/${igUserId}/media?fields=status_code&creation_id=${creationId}&access_token=${accessToken}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { data?: { status_code?: string }[] };
      const status = data.data?.[0]?.status_code;
      if (status === 'FINISHED') return;
      if (status === 'ERROR') throw new Error('Instagram media container entered ERROR state');
    }
    await sleep(2000);
  }
  throw new Error('Instagram media container did not finish in time');
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
