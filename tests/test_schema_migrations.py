import unittest

from src.topics.migrations import migrate_book_table_schema


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar(self):
        return self.value


class FakeConnection:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        statement_text = str(statement)
        self.statements.append(statement_text)
        if "to_regclass" in statement_text:
            return FakeResult("book")
        return FakeResult(None)


class SchemaMigrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_migrate_book_table_schema_repairs_existing_book_table(self):
        connection = FakeConnection()

        await migrate_book_table_schema(connection)

        sql = "\n".join(connection.statements)
        self.assertIn("ADD COLUMN IF NOT EXISTS publisher", sql)
        self.assertIn("ADD COLUMN IF NOT EXISTS grade", sql)
        self.assertIn("uq_book_publisher_grade", sql)


if __name__ == "__main__":
    unittest.main()
