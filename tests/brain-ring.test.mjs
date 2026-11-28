import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";
import { getBrainRingFeedback, matchesShortAnswer } from "../site/assets/brain-ring-feedback.js";

const colonSource = "br-2023-09-16-q02";
const banks = Object.fromEntries(["ru", "en"].map((language) => {
  const file = new URL(`../site/_data/brain_ring/${language}.yaml`, import.meta.url);
  return [language, parse(readFileSync(file, "utf8"))];
}));

test("short input accepts the colon and phrases without regard to case or spacing", () => {
  const russian = banks.ru.questions.find(({ source_id }) => source_id === colonSource);
  const english = banks.en.questions.find(({ source_id }) => source_id === colonSource);
  for (const value of ["   ДВОЕТОЧИЕ  ", "в двоеточии", " :", "В\t:", "НЕ ПОСТАВИЛ  ДВОЕТОЧИЕ\nГДЕ НУЖНО",
    "после двадцать пропущено двоеточие", "забыл поставить двоеточие после слова «двадцать»"]) {
    assert.ok(matchesShortAnswer(value, russian.answer.accepted), value);
  }
  for (const value of [":", "   A COLON ", "HE FORGOT  THE COLON AFTER TWENTY"]) {
    assert.ok(matchesShortAnswer(value, english.answer.accepted), value);
  }
  for (const value of ["", "  ", ";", "запятая", "двоеточие уже стоит", "colon is present"]) {
    assert.equal(matchesShortAnswer(value, russian.answer.accepted), false, value);
    assert.equal(matchesShortAnswer(value, english.answer.accepted), false, value);
  }
  assert.equal(matchesShortAnswer("n", ["n!"]), false);
});

test("all outcomes share the explanation and the publication in the edition language", () => {
  const source = "br-2023-09-02-q02";
  for (const bank of Object.values(banks)) {
    const question = bank.questions.find(({ source_id }) => source_id === source);
    assert.ok(question.links.length > 0);
    const right = getBrainRingFeedback(bank.feedback, question, "correct");
    assert.equal(right.points, 1);
    assert.equal(right.answer, null);
    for (const outcome of ["incorrect", "timeout"]) {
      const result = getBrainRingFeedback(bank.feedback, question, outcome);
      assert.equal(result.points, 0);
      assert.equal(result.answer, question.answer_text);
      assert.equal(result.digest, right.digest);
      assert.deepEqual(result.links, right.links);
    }
    assert.throws(() => getBrainRingFeedback(bank.feedback, question, "unknown"), RangeError);
  }
});

test("questions have unique source IDs, explanations and correctly localized publication paths", () => {
  const ids = new Set(banks.ru.questions.map(({ source_id }) => source_id));
  for (const bank of Object.values(banks)) {
    const ownIds = new Set();
    for (const question of bank.questions) {
      assert.ok(ids.has(question.source_id), question.id);
      assert.ok(!ownIds.has(question.source_id), question.id);
      assert.ok(question.source_ids.includes(question.source_id), question.id);
      ownIds.add(question.source_id);
      assert.ok(question.digest.trim(), question.id);
      const publication = bank.language === "ru" ? /^\/ru\/publications\/.+-ru\/$/ : /^\/publications\/.+-en\/$/;
      for (const { title, url } of question.links) {
        assert.ok(title.trim(), question.id);
        assert.match(url, publication, question.id);
      }
      if (question.format === "short_input") {
        assert.ok(question.answer.accepted.length > 0, question.id);
        assert.ok(question.answer.accepted.every((value) => typeof value === "string" && value.trim()), question.id);
      }
    }
  }
});
