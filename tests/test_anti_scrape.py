import asyncio
import unittest

from src.security.anti_scrape import (
    RateLimitExceeded,
    classify_user_agent,
    consume_rate_limit,
)


class FakeRedis:
    def __init__(self):
        self.values: dict[str, int] = {}
        self.expirations: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds

    async def ttl(self, key: str) -> int:
        return self.expirations.get(key, -1)


class AntiScrapeTest(unittest.TestCase):
    def test_classify_user_agent_blocks_obvious_automation(self):
        self.assertEqual(classify_user_agent(""), "missing_user_agent")
        self.assertEqual(
            classify_user_agent("python-requests/2.32"),
            "automation_user_agent",
        )
        self.assertEqual(
            classify_user_agent("Scrapy/2.11 (+https://scrapy.org)"),
            "automation_user_agent",
        )
        self.assertIsNone(
            classify_user_agent("Mozilla/5.0 AppleWebKit/537.36 Chrome/124.0"),
        )

    def test_consume_rate_limit_allows_until_limit_and_sets_ttl(self):
        redis = FakeRedis()

        async def run_check():
            first = await consume_rate_limit(
                redis,
                key="anti-scrape:test",
                limit=2,
                window_seconds=60,
            )
            second = await consume_rate_limit(
                redis,
                key="anti-scrape:test",
                limit=2,
                window_seconds=60,
            )
            return first, second

        first, second = asyncio.run(run_check())

        self.assertEqual(first.remaining, 1)
        self.assertEqual(second.remaining, 0)
        self.assertEqual(redis.expirations["anti-scrape:test"], 60)

    def test_consume_rate_limit_raises_after_limit(self):
        redis = FakeRedis()

        async def run_check():
            await consume_rate_limit(
                redis,
                key="anti-scrape:test",
                limit=1,
                window_seconds=60,
            )

            with self.assertRaises(RateLimitExceeded) as exc:
                await consume_rate_limit(
                    redis,
                    key="anti-scrape:test",
                    limit=1,
                    window_seconds=60,
                )
            return exc.exception

        exceeded = asyncio.run(run_check())

        self.assertEqual(exceeded.retry_after_seconds, 60)
