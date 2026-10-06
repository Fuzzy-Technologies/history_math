// Navigating away cancels an in-flight search fetch. Real asset failures still fail.
export function recordRequestFailure(report, request) {
  const error = request.failure()?.errorText;
  const path = new URL(request.url()).pathname;
  if (error === 'net::ERR_ABORTED' && request.resourceType() === 'fetch' &&
      /^\/history_math\/assets\/search-(ru|en)\.json$/.test(path)) return;
  report.requestFailures.push(`${request.url()} (${error ?? 'unknown failure'})`);
}
