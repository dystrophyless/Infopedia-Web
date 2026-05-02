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
