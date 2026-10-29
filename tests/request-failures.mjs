// Navigating away cancels an in-flight search fetch. Real asset failures still fail.
export function recordRequestFailure(report, request) {
  const error = request.failure()?.errorText;
  const path = new URL(request.url()).pathname;
  if (error === 'net::ERR_ABORTED' && request.resourceType() === 'fetch' &&
      /^\/history_math\/assets\/(?:search|discovery)-(ru|en)\.json$/.test(path)) return;
  report.requestFailures.push(`${request.url()} (${error ?? 'unknown failure'})`);
}

export function attachmentRequestFailure(request) {
  return {url: request.url(), error: request.failure()?.errorText ?? 'unknown failure',
    type: request.resourceType(), navigation: request.isNavigationRequest()};
}

// Chromium cancels document navigation when an attachment takes over. Accept
// that cancellation only after the exact download has completed and been hashed.
export function unexpectedAttachmentFailures(failures, verifiedDownloads) {
  return failures.filter(failure => !(failure.error === 'net::ERR_ABORTED' &&
    failure.type === 'document' && failure.navigation === true && verifiedDownloads.has(failure.url)));
}
