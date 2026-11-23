// Text arrows, numbers, letters and mathematical signs can also have an emoji
// presentation. Keep their ordinary text forms, and reject pictographs, flags,
// keycaps and explicitly emoji-styled forms wherever they occur in a title.
const titleEmoji = /\p{RGI_Emoji}|[\p{Extended_Pictographic}--[\p{Math}\p{L}\p{N}\u2190-\u21ff©®™‼⁉]]|[\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u20E3]/v;

export function hasTitleEmoji(title) {
  return titleEmoji.test(title);
}
