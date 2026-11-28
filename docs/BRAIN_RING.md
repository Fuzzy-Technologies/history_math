# Brain Ring question banks

Edit `site/_data/brain_ring/ru.yaml` or `site/_data/brain_ring/en.yaml` in a text editor. The Russian bank is the source for shared question identities. English entries can be adapted independently. Keep `source_id` stable across languages and variants so the game can avoid repeating the same original question.

| Field                               | What to edit                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`                            | The question players see.                                                                                                                                                         |
| `answer`                            | The answer key for the selected `format`. For `short_input`, list each acceptable spelling, expression or phrase under `accepted`. Quote punctuation-only and numeric values.     |
| `answer_text`                       | The canonical answer to show on a mistake or timeout.                                                                                                                             |
| `digest`                            | A short explanation in the language of the question. It appears after any outcome.                                                                                                |
| `author_explanation`, `author_note` | Optional longer explanation or a note explicitly connected to the original question. Keep the source ID of an author note in `author_note.source_id`.                             |
| `links`                             | Optional `title` and `url` entries for relevant publications in the same language. Use the exact journal publication path. Leave an empty list when there is no suitable article. |

Short input ignores capitalization, Unicode composition, surrounding whitespace and repeated whitespace. Punctuation can be part of the answer, so add strings such as `':'` explicitly. For questions that require an argument, use `self_check` and provide the solution. Add a separate list item for each valid phrase.

`site/assets/brain-ring-feedback.js` takes the bank's localized messages and a resolved outcome. A correct answer earns one point. A wrong answer or timeout reveals the canonical answer and earns zero. Every outcome returns the explanation and the same publication links. The browser game will use these values in its answer panel.

Run `node --test tests/brain-ring.test.mjs` after installing the repository's pinned development dependencies.
