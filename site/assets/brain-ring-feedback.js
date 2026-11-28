function normalizeShortAnswer(value) {
  return value.normalize("NFC").toLowerCase().trim().replace(/\s+/gu, " ");
}

export function matchesShortAnswer(value, accepted) {
  const normalized = normalizeShortAnswer(value);
  return normalized !== "" && accepted.some((answer) => normalizeShortAnswer(answer) === normalized);
}

export function getBrainRingFeedback(messages, question, outcome) {
  if (!Object.hasOwn(messages, outcome)) {
    throw new RangeError(`Unknown Brain Ring outcome: ${outcome}`);
  }

  const result = messages[outcome];
  return {
    message: result.message,
    points: result.points,
    answer: result.show_answer ? question.answer_text : null,
    digest: question.digest,
    authorExplanation: question.author_explanation ?? null,
    authorNote: question.author_note?.text ?? null,
    links: question.links,
  };
}
