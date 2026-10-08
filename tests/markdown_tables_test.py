"""Protect table cells and literal code when reusing the 1337 formatter."""
import unittest
from tools.markdown_tables import AlignMarkdown, SplitRow


class MarkdownTablesTest(unittest.TestCase):
    def test_alignment_preserves_escaped_pipes_math_and_cyrillic(self):
        source = '| Имя | Значение |\n| :--- | ---: |\n| Румовский | $x_1$ \\| y |\n'
        result = AlignMarkdown(source)
        self.assertEqual(SplitRow(source.splitlines()[2]), SplitRow(result.splitlines()[2]))
        self.assertEqual(AlignMarkdown(result), result)
        self.assertTrue(SplitRow(result.splitlines()[1])[0].startswith(':'))
        self.assertTrue(SplitRow(result.splitlines()[1])[1].endswith(':'))

    def test_fenced_and_indented_examples_are_untouched(self):
        table = '| A | B |\n| --- | --- |\n| long | x |\n'
        for source in ['```markdown\n' + table + '```\n', '~~~\n' + table + '~~~\n', ''.join('    ' + row for row in table.splitlines(keepends=True))]:
            self.assertEqual(AlignMarkdown(source), source)

    def test_crlf_and_absent_final_newline_are_preserved(self):
        source = '| A | B |\r\n| --- | --- |\r\n| long | x |'
        result = AlignMarkdown(source)
        self.assertEqual(result.count('\r\n'), 2)
        self.assertFalse(result.endswith('\n'))


if __name__ == '__main__':
    unittest.main()
