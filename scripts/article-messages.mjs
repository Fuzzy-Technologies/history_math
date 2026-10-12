import {readFileSync} from 'node:fs';
import {editorialQuestionText} from './editorial-question-messages.mjs';
export function reportLanguage(branch = '') {
  return branch.endsWith('-ru') ? 'ru' : 'en';
}

export const messages = JSON.parse(readFileSync(new URL('../schemas/messages.json', import.meta.url), 'utf8'));

export const requiredChecks = Object.freeze(['source', 'build', 'output', 'browser']);
export const reportProfiles = Object.freeze({source: Object.freeze(['source']), full: requiredChecks});

export function checksForProfile(profile = 'full') {
  return Object.hasOwn(reportProfiles, profile) ? reportProfiles[profile] : undefined;
}

export function overall(report) {
  if (report.findings.some(item => item.severity === 'error')) return 'fail';
  const checks = checksForProfile(report.profile);
  if (!checks || checks.some(key => report.checks[key] !== 'pass')) return 'incomplete';
  return 'pass';
}

export function humanReport(report) {
  const m = messages[report.language];
  const result = overall(report);
  const outcome = report.profile === 'source' && result === 'pass' ? m.source_pass : m[result];
  const detail = item => {
    const value = item.detail ?? '';
    if (item.code === 'HM_EDITOR') return editorialQuestionText({question: value,
      ...(item.detail_localizations ? {localizations: item.detail_localizations} : {})}, report.language);
    if (item.code === 'HM_REQUIRED' && m.checks[value]) return m.checks[value];
    for (const [prefix, localized] of Object.entries(m.details ?? {})) if (value.startsWith(prefix)) return localized + value.slice(prefix.length);
    // Third-party diagnostics retain their supplied text beneath localized actions.
    return value;
  };
  return `${outcome}\n\n` + (report.profile === 'source' ? `${m.source_profile}\n\n` : '') +
    `${m.commit}: \`${report.commit}\`\n\n` +
    Object.entries(report.checks).map(([key, state]) => `- ${m.checks[key]}: ${m.states[state]}`).join('\n') +
    `\n\n${m.issues}:\n\n` + (report.findings.length ? report.findings.map(item =>
      `- **${item.code}** (${m.severity[item.severity]}) \`${item.file ?? ''}${item.line ? ':' + item.line : ''}\`: ${m[item.code]} ${detail(item)}`).join('\n') : '—') +
    `\n\n${m.preview}: ${report.artifact_url ?? (report.profile === 'source' ? 'test-results/article-report.json' : 'test-results/article-preview/')}\n`;
}
