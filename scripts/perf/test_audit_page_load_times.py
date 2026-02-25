import importlib.util
import pathlib
import sys
import unittest

MODULE_PATH = pathlib.Path(__file__).with_name("audit_page_load_times.py")
SPEC = importlib.util.spec_from_file_location("audit_page_load_times", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PercentileTests(unittest.TestCase):
    def test_uses_nearest_rank_for_median_with_even_sample_size(self) -> None:
        values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        self.assertEqual(MODULE.percentile(values, 50), 5)

    def test_uses_nearest_rank_for_run_count_used_by_script(self) -> None:
        values = [10, 20, 30, 40, 50, 60, 70]
        self.assertEqual(MODULE.percentile(values, 90), 70)

    def test_returns_first_value_for_zero_percent(self) -> None:
        values = [2.0, 5.0, 8.0]
        self.assertEqual(MODULE.percentile(values, 0), 2.0)


if __name__ == "__main__":
    unittest.main()
