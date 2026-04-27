from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    CLIENT = "client"
    USER = "user"


class UserGrade(str, Enum):
    GRADE_10 = "10"
    GRADE_11 = "11"
    GRADE_UNDEFINED = "undefined"


class UserLanguage(str, Enum):
    RUSSIAN = "ru"
    KAZAKH = "kz"


class Feature(Enum):
    TERM_SEARCH = ("term_search_forbidden", 5)
    DEFINITION_SEARCH = ("definition_search_forbidden", 3)
    RANDOM_TERM = ("random_term_forbidden", 5)

    def __init__(self, forbidden: str, limit: int):
        self.forbidden = forbidden
        self.limit = limit
