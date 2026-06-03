// Unified platform posting function.
// The post worker calls this with the platform ID and resolved credentials.

import { postToInstagram, postCarouselToInstagram } from './instagram.js';
import { postToFacebook, postMultiPhotoToFacebook } from './facebook.js';
import { postToX }         from './x.js';
import { supabase }        from '../lib/supabase.js';

export interface PlatformPostResult {
  platform: string;
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface PostParams {
  platform: 'instagram' | 'facebook' | 'x';
  playerId: string;
  graphicUrl: string;
  /** PNG buffer — only needed for X (fetches image to re-upload to Twitter CDN) */
  imageBuffer?: Buffer;
  caption: string;
  /**
   * Override the access token instead of querying the DB.
   * Used for club-level connections (club_social_connections table).
   */
  accessToken?: string;
  platformUsername?: string;
  /**
   * Carousel / multi-image extensions.
   * When provided (length > 1), the post uses the carousel/multi-image path.
   * For Instagram: true carousel (swipeable slides).
   * For Facebook: multi-photo post with attached_media.
   * For X: multiple media IDs in one tweet (max 4).
   */
  carouselUrls?: string[];     // all slide image URLs (including primary)
  carouselBuffers?: Buffer[];  // all slide PNG buffers (for X, which re-uploads to CDN)
}

/**
 * Post to a single social platform.
 * Resolves the stored access token for the player, then calls the platform client.
 * Returns a result object (never throws) so the caller can log per-platform outcomes.
 */
export async function postToPlatform(params: PostParams): Promise<PlatformPostResult> {
  const {
    platform,
    playerId,
    graphicUrl,
    imageBuffer,
    caption,
    accessToken: tokenOverride,
    platformUsername: usernameOverride,
    carouselUrls,
    carouselBuffers,
  } = params;

  // Carousel / multi-image mode: when carouselUrls has 2+ items
  const isCarousel = carouselUrls && carouselUrls.length > 1;

  try {
    let token: string;
    let username: string;

    if (tokenOverride) {
      token    = tokenOverride;
      username = usernameOverride ?? '';
    } else {
      const { data: conn } = await supabase
        .from('social_connections' as 'social_connections')
        .select('access_token, platform_username')
        .eq('player_id', playerId)
        .eq('platform', platform)
        .eq('is_active', true)
        .maybeSingle();

      if (!conn?.access_token) {
        return { platform, success: false, error: 'No active connection found' };
      }

      token    = conn.access_token as string;
      username = (conn.platform_username as string | null) ?? '';
    }

    switch (platform) {
      case 'instagram': {
        if (isCarousel) {
          const r = await postCarouselToInstagram(token, carouselUrls!, caption);
          return { platform, success: true, platformPostId: r.mediaId };
        }
        const r = await postToInstagram(token, graphicUrl, caption);
        return { platform, success: true, platformPostId: r.mediaId };
      }
      case 'facebook': {
        if (isCarousel) {
          const r = await postMultiPhotoToFacebook(token, carouselUrls!, caption);
          return { platform, success: true, platformPostId: r.postId };
        }
        const r = await postToFacebook(token, graphicUrl, caption);
        return { platform, success: true, platformPostId: r.postId };
      }
      case 'x': {
        if (isCarousel && carouselBuffers && carouselBuffers.length > 0) {
          const [primary, ...extras] = carouselBuffers;
          const r = await postToX(token, primary, caption, username, extras);
          return { platform, success: true, platformPostId: r.tweetId };
        }
        if (!imageBuffer) throw new Error('imageBuffer required for X posting');
        const r = await postToX(token, imageBuffer, caption, username);
        return { platform, success: true, platformPostId: r.tweetId };
      }
      default:
        return { platform, success: false, error: `Unknown platform: ${platform}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { platform, success: false, error: message };
  }
}
