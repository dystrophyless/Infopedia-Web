import unittest

from sqlalchemy import ForeignKeyConstraint, PrimaryKeyConstraint

from src.database import Base
from src.favorites.models import FavoriteTerm


class FavoriteTermSchemaTests(unittest.TestCase):
    def test_model_is_registered_with_expected_columns_and_constraints(self):
        table = Base.metadata.tables["favorite_term"]

        self.assertEqual(
            {column.name for column in table.columns},
            {"user_id", "term_id", "created_at"},
        )
        primary_key = next(
            constraint
            for constraint in table.constraints
            if isinstance(constraint, PrimaryKeyConstraint)
        )
        self.assertEqual([column.name for column in primary_key.columns], ["user_id", "term_id"])

        foreign_keys = {
            (constraint.columns[0].name, next(iter(constraint.elements)).target_fullname)
            for constraint in table.constraints
            if isinstance(constraint, ForeignKeyConstraint)
        }
        self.assertEqual(
            foreign_keys,
            {("user_id", "user.id"), ("term_id", "term.id")},
        )
        self.assertTrue(
            all(
                next(iter(constraint.elements)).ondelete == "CASCADE"
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            )
        )

    def test_created_at_and_lookup_index(self):
        table = FavoriteTerm.__table__
        created_at = table.c.created_at
        self.assertTrue(created_at.type.timezone)
        self.assertIn("TIMEZONE('utc', now())", str(created_at.server_default.arg))
        self.assertIn(
            ("ix_favorite_term_user_created_at", ("user_id", "created_at")),
            {(index.name, tuple(column.name for column in index.columns)) for index in table.indexes},
        )
