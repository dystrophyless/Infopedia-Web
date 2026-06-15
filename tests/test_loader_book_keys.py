import unittest

from src.loader import parse_book_key


class LoaderBookKeyTests(unittest.TestCase):
    def test_parse_book_key_extracts_publisher_and_grade(self):
        publisher, grade = parse_book_key("Алматыкітап: 7-сынып")

        self.assertEqual(publisher, "Алматыкітап")
        self.assertEqual(grade, 7)

    def test_parse_book_key_rejects_missing_separator(self):
        with self.assertRaisesRegex(ValueError, "Неверный формат имени книги"):
            parse_book_key("Алматыкітап 7-сынып")

    def test_parse_book_key_rejects_missing_grade(self):
        with self.assertRaisesRegex(ValueError, "Не удалось извлечь класс"):
            parse_book_key("Алматыкітап: седьмой класс")


if __name__ == "__main__":
    unittest.main()
