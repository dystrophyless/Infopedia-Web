import unittest

from src.security.public_refs import (
    InvalidPublicRef,
    decode_public_ref,
    encode_public_ref,
)


SECRET = "test-secret-with-enough-entropy"


class PublicRefsTest(unittest.TestCase):
    def test_public_ref_round_trips_without_leaking_numeric_id(self):
        public_ref = encode_public_ref("term", 21, secret=SECRET)

        self.assertTrue(public_ref.startswith("term_"))
        self.assertNotIn("21", public_ref)
        self.assertEqual(decode_public_ref("term", public_ref, secret=SECRET), 21)

    def test_public_ref_rejects_tampering_and_wrong_namespace(self):
        public_ref = encode_public_ref("term", 42, secret=SECRET)
        tampered = public_ref[:-1] + ("A" if public_ref[-1] != "A" else "B")

        with self.assertRaises(InvalidPublicRef):
            decode_public_ref("term", tampered, secret=SECRET)

        with self.assertRaises(InvalidPublicRef):
            decode_public_ref("definition", public_ref, secret=SECRET)

    def test_public_ref_is_secret_scoped(self):
        public_ref = encode_public_ref("term", 42, secret=SECRET)

        with self.assertRaises(InvalidPublicRef):
            decode_public_ref("term", public_ref, secret="different-secret")
