/**
 * Click-to-load YouTube embed ("facade").
 *
 * An <iframe> from YouTube downloads ~1 MB of player code and sets Google cookies on
 * page load, even if nobody presses play. Instead the page shows the poster with a
 * play button, and the real player is only created on click. youtube-nocookie.com
 * avoids tracking cookies until playback starts; autoplay=1 makes that first click
 * also start the video.
 *
 * Markup: <button class="yt-facade" data-youtube-id="..." data-youtube-title="...">
 */
export function initYouTubeFacades() {
  document.querySelectorAll('.yt-facade[data-youtube-id]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        const id = encodeURIComponent(button.dataset.youtubeId);
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
        iframe.title = button.dataset.youtubeTitle || 'YouTube video';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.className = 'yt-frame';
        button.replaceWith(iframe);
        iframe.focus();
      },
      { once: true },
    ),
  );
}
