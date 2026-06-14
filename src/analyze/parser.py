import re


def clean_from_table(text: str) -> str:
    lines = text.splitlines()

    cleaned_lines = [line for line in lines if line.lstrip().startswith("|")]

    for index, line in enumerate(cleaned_lines):
        if line.strip().startswith("| Информатика"):
            return "\n".join(cleaned_lines[index:])


def split_table_cells(line: str) -> list[str]:
    stripped = line.strip()

    if not stripped:
        return []

    return [cell.strip() for cell in stripped.strip("|").split("|")]


def is_table_header(line: str) -> bool:
    cells = split_table_cells(line)

    if len(cells) < 5:
        return False

    columns_text = " ".join(cells[1:]).lower()

    return ("сұрақ" in columns_text and "ұпай" in columns_text) or (
        "вопрос" in columns_text and "балл" in columns_text
    )


def parse_int_cell(cell: str) -> int | None:
    match = re.search(r"\b\d{1,3}\b", cell)
    return int(match.group()) if match else None


def row_is_complete(row: dict) -> bool:
    return all(
        row[key] is not None
        for key in ("question_count", "max_score", "score", "percentage")
    )


def has_numeric_conflict(previous: dict, current: dict) -> bool:
    return any(
        previous[key] is not None and current[key] is not None
        for key in ("question_count", "max_score", "score", "percentage")
    )


def fills_missing_numeric_value(previous: dict, current: dict) -> bool:
    return any(
        previous[key] is None and current[key] is not None
        for key in ("question_count", "max_score", "score", "percentage")
    )


def is_continuation_row(previous: dict, current: dict) -> bool:
    if row_is_complete(previous):
        return False

    if has_numeric_conflict(previous, current):
        return False

    return fills_missing_numeric_value(previous, current)


def merge_table_row(target: dict, values: dict) -> None:
    if values["topic"]:
        target["topic"] = f"{target['topic']} {values['topic']}".strip()

    for key, value in values.items():
        if target[key] is None and value is not None:
            target[key] = value


def clean_topic(topic: str) -> str:
    return topic.replace("[X]", "").strip()


def parse_table(text: str) -> list[dict]:
    cleaned_text = clean_from_table(text)
    parsed_data = []
    pending_row = None

    for line in cleaned_text.splitlines():
        cells = split_table_cells(line)

        if is_table_header(line):
            continue

        row_data = {
            "topic": clean_topic(cells[0]),
            "question_count": parse_int_cell(cells[1]),
            "max_score": parse_int_cell(cells[2]),
            "score": parse_int_cell(cells[3]),
            "percentage": parse_int_cell(cells[4]),
        }

        if pending_row is None:
            pending_row = row_data
            continue

        if is_continuation_row(pending_row, row_data):
            merge_table_row(pending_row, row_data)
            continue

        parsed_data.append(pending_row)
        pending_row = row_data

    if pending_row is not None:
        parsed_data.append(pending_row)

    return parsed_data
