import {readFileSync} from 'node:fs';
export function reportLanguage(branch = '') {
  return branch.endsWith('-ru') ? 'ru' : 'en';
}

export const messages = JSON.parse(readFileSync(new URL('../schemas/messages.json', import.meta.url), 'utf8'));

export const requiredChecks = ['source', 'build', 'output', 'browser'];

export function overall(report) {
  if (report.findings.some(item => item.severity === 'error')) return 'fail';
  if (requiredChecks.some(key => report.checks[key] !== 'pass')) return 'incomplete';
  return 'pass';
}

export function humanReport(report) {
  const m = messages[report.language];
  const result = overall(report);
  const detail = item => {
    const value = item.detail ?? '';
    if (item.code === 'HM_REQUIRED' && m.checks[value]) return m.checks[value];
    for (const [prefix, localized] of Object.entries(m.details ?? {})) if (value.startsWith(prefix)) return localized + value.slice(prefix.length);
    // Original article questions and third-party diagnostics retain their supplied text.
    return value;
  };
  return `${m[result]}\n\n${m.commit}: \`${report.commit}\`\n\n` +
    Object.entries(report.checks).map(([key, state]) => `- ${m.checks[key]}: ${m.states[state]}`).join('\n') +
    `\n\n${m.issues}:\n\n` + (report.findings.length ? report.findings.map(item =>
      `- **${item.code}** (${m.severity[item.severity]}) \`${item.file ?? ''}${item.line ? ':' + item.line : ''}\`: ${m[item.code]} ${detail(item)}`).join('\n') : '—') +
    `\n\n${m.preview}: ${report.artifact_url ?? 'test-results/article-preview/'}\n`;
}
