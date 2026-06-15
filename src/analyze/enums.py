from difflib import SequenceMatcher
from enum import Enum


class Chapter(str, Enum):
    COMPUTER_DEVICES = "COMPUTER_DEVICES"
    COMPUTER_NETWORKS = "COMPUTER_NETWORKS"
    INFORMATION_REPRESENTATION_AND_CODING = "INFORMATION_REPRESENTATION_AND_CODING"
    NUMBER_SYSTEMS = "NUMBER_SYSTEMS"
    LOGIC_BASICS = "LOGIC_BASICS"
    PYTHON_PROGRAMMING = "PYTHON_PROGRAMMING"
    ALGORITHMS_AND_PROGRAMMING = "ALGORITHMS_AND_PROGRAMMING"
    HARDWARE_AND_SOFTWARE = "HARDWARE_AND_SOFTWARE"
    RELATIONAL_DATABASES = "RELATIONAL_DATABASES"
    DATABASES_AND_QUERIES = "DATABASES_AND_QUERIES"
    IT_TECHNOLOGIES = "IT_TECHNOLOGIES"
    INFORMATION_OBJECTS = "INFORMATION_OBJECTS"
    WEB_DESIGN = "WEB_DESIGN"


def normalize_chapter(value: str) -> str:
    return " ".join(value.casefold().strip().split())


CHAPTER_ALIASES = {
    Chapter.COMPUTER_DEVICES: [
        "Компьютердің құрылғылары",
        "Устройства компьютера",
    ],
    Chapter.COMPUTER_NETWORKS: [
        "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру",
        "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру. Ақпараттық қауіпсіздік",
        "Компьютерные сети. Организация компьютерных сетей",
    ],
    Chapter.INFORMATION_REPRESENTATION_AND_CODING: [
        "Ақпаратты ұсыну және өлшеу. Ақпаратты кодтау",
        "Представление и измерение информации. Кодирование информации",
    ],
    Chapter.NUMBER_SYSTEMS: [
        "Есептеу жүйелері",
        "Системы счисления",
    ],
    Chapter.LOGIC_BASICS: [
        "Компьютердің логикалық негіздері",
        "Логические основы компьютера",
    ],
    Chapter.PYTHON_PROGRAMMING: [
        "Python программалау тілінде алгоритмдерді программалау",
        "Программирование алгоритмов на языке программирования Python",
    ],
    Chapter.ALGORITHMS_AND_PROGRAMMING: [
        "Алгоритмдер және программалау (функция, рекурсия, жолдармен жұмыс, файлдармен жұмыс, сұрыптау, граф)",
        "Алгоритмы и программы (функция, рекурсия, работа со строками, работа с файлами, сортировка, граф)",
    ],
    Chapter.HARDWARE_AND_SOFTWARE: [
        "Аппараттық қамтамасыз ету. Программалық қамтамасыз ету",
        "Аппаратное обеспечение. Программное обеспечение",
    ],
    Chapter.RELATIONAL_DATABASES: [
        "Реляциондық деректер қоры",
        "Реляционные базы данных",
    ],
    Chapter.DATABASES_AND_QUERIES: [
        "Мәліметтер қорын жасау. Құрылымдалған сұраныстар.",
        "Разработка базы данных. Структурированные запросы",
    ],
    Chapter.IT_TECHNOLOGIES: [
        "Ақпараттық технологияларды дамытудағы қазіргі заманғы үрдістер. IT Startup (ай-ти-стартап). 3D жобалау",
        "Современные тенденции развития информационных технологий. IT Startup (ай-ти-стартап). 3D моделирования"
    ],
    Chapter.INFORMATION_OBJECTS: [
        "Ақпараттық объектілерді құру және түрлендіру",
        "Создание и преобразование информационных объектов",
    ],
    Chapter.WEB_DESIGN: [
        "Web-жобалау",
        "Веб-проектирование",
    ],
}

CHAPTER_BY_ALIAS = {
    normalize_chapter(alias): chapter
    for chapter, aliases in CHAPTER_ALIASES.items()
    for alias in aliases
}

CHAPTER_MATCH_THRESHOLD = 0.92


def match_chapter_fuzzy(normalized: str) -> Chapter | None:
    best_chapter: Chapter | None = None
    best_score = 0.0

    for alias, chapter in CHAPTER_BY_ALIAS.items():
        score = SequenceMatcher(None, normalized, alias).ratio()
        if score > best_score:
            best_chapter = chapter
            best_score = score

    if best_score >= CHAPTER_MATCH_THRESHOLD:
        return best_chapter

    return None


def resolve_chapter(value: str) -> Chapter:
    normalized = normalize_chapter(value)

    if normalized in CHAPTER_BY_ALIAS:
        return CHAPTER_BY_ALIAS[normalized]

    fuzzy_chapter = match_chapter_fuzzy(normalized)
    if fuzzy_chapter is not None:
        return fuzzy_chapter

    raise ValueError("Неизвестная глава.")
