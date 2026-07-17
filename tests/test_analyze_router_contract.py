import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
ROUTER_SOURCE = (ROOT_DIR / "src" / "analyze" / "router.py").read_text(encoding="utf-8")


class AnalyzeRouterSourceContractTests(unittest.TestCase):
    def test_create_task_accepts_and_forwards_multipart_locale(self):
        self.assertIn(
            'locale: Annotated[Literal["kk", "ru"], Form()] = "kk",',
            ROUTER_SOURCE,
        )
        self.assertIn('"locale": normalize_analyze_locale(locale),', ROUTER_SOURCE)
        self.assertNotIn(
            '"locale": normalize_analyze_locale(current_user.language),',
            ROUTER_SOURCE,
        )

    def test_latest_route_remains_query_locale_based(self):
        self.assertIn(
            'locale: Annotated[Literal["kk", "ru"], Query()] = "kk",',
            ROUTER_SOURCE,
        )
