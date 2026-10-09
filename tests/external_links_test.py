import unittest
from scripts.check_site import ExternalLocaleError, PageParser


class ExternalLinksTest(unittest.TestCase):
    def test_known_locale_routes_reject_missing_wrong_or_duplicate_languages(self):
        pairs = [
            ('https://fuzzy-technologies.github.io/ru/', 'https://fuzzy-technologies.github.io/'),
            ('https://history-math.blogspot.com/?hl=ru', 'https://history-math.blogspot.com/?hl=en'),
            ('https://commons.wikimedia.org/wiki/File:Rumovsky.jpg?uselang=ru', 'https://commons.wikimedia.org/wiki/File:Rumovsky.jpg?uselang=en'),
            ('https://creativecommons.org/licenses/by-sa/3.0/deed.ru', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'),
        ]
        for russian, english in pairs:
            self.assertFalse(ExternalLocaleError(russian, 'ru'))
            self.assertFalse(ExternalLocaleError(english, 'en'))
            self.assertTrue(ExternalLocaleError(russian, 'en'))
            self.assertTrue(ExternalLocaleError(english, 'ru'))
        self.assertTrue(ExternalLocaleError('https://history-math.blogspot.com/', 'ru'))
        self.assertTrue(ExternalLocaleError('https://history-math.blogspot.com/?hl=ru&hl=en', 'ru'))
        self.assertTrue(ExternalLocaleError('https://creativecommons.org/licenses/by-sa/3.0/', 'ru'))
        self.assertFalse(ExternalLocaleError('https://oeis.org/A000396', 'ru'))
        self.assertFalse(ExternalLocaleError('https://ridero.ru/books/istoriya_matematiki/', 'en'))
        self.assertFalse(ExternalLocaleError('https://fuzzy-technologies.github.io/history_math/', 'ru'))

    def test_russian_fallback_template_has_its_own_link_language(self):
        parser = PageParser()
        parser.feed('<html lang="en"><a href="https://fuzzy-technologies.github.io/">Company</a>'
                    '<template id="russian-error-page"><a href="https://fuzzy-technologies.github.io/ru/">Company</a></template>'
                    '<a href="https://history-math.blogspot.com/?hl=en">Archive</a></html>')
        self.assertEqual([language for _, language in parser.externalAnchors], ['en', 'ru', 'en'])
        self.assertFalse(any(ExternalLocaleError(url, language) for url, language in parser.externalAnchors))


if __name__ == '__main__':
    unittest.main()
