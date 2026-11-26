import os
import tempfile
import time
import unittest

from cache_prune import prune

DAY = 86400


def scene(root, name, size, age_days, now):
    d = os.path.join(root, name)
    os.makedirs(d)
    for f, n in (("segment.mp4", size), ("meta.json", 10)):
        p = os.path.join(d, f)
        with open(p, "wb") as fh:
            fh.write(b"x" * n)
        t = now - age_days * DAY
        os.utime(p, (t, t))
    t = now - age_days * DAY
    os.utime(d, (t, t))
    return d


class PruneTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.now = time.time()

    def tearDown(self):
        self.tmp.cleanup()

    def test_removes_only_scenes_older_than_the_limit(self):
        scene(self.root, "old", 1000, 60, self.now)
        scene(self.root, "fresh", 1000, 3, self.now)
        r = prune(self.root, max_age_days=45, now=self.now)
        self.assertEqual((r["removed"], r["kept"]), (1, 1))
        self.assertEqual(sorted(os.listdir(self.root)), ["fresh"])

    def test_drops_the_oldest_first_when_over_the_size_cap(self):
        scene(self.root, "a", 5000, 20, self.now)   # oldest of the kept ones
        scene(self.root, "b", 5000, 10, self.now)
        scene(self.root, "c", 5000, 1, self.now)
        r = prune(self.root, max_age_days=45, max_bytes=11000, now=self.now)
        self.assertEqual(sorted(os.listdir(self.root)), ["b", "c"])
        self.assertLessEqual(r["left_bytes"], 11000)

    def test_dry_run_changes_nothing(self):
        scene(self.root, "old", 1000, 90, self.now)
        r = prune(self.root, max_age_days=45, now=self.now, dry_run=True)
        self.assertEqual(r["removed"], 1)
        self.assertEqual(os.listdir(self.root), ["old"])

    def test_ignores_stray_files_and_a_missing_folder(self):
        with open(os.path.join(self.root, "notes.txt"), "w") as fh:
            fh.write("x")
        self.assertEqual(prune(self.root, now=self.now)["removed"], 0)
        self.assertEqual(prune(os.path.join(self.root, "nope"), now=self.now)["kept"], 0)

    def test_a_recently_used_scene_survives_even_if_its_folder_is_old(self):
        d = scene(self.root, "reused", 1000, 90, self.now)
        recent = self.now - 2 * DAY
        os.utime(os.path.join(d, "segment.mp4"), (recent, recent))
        self.assertEqual(prune(self.root, max_age_days=45, now=self.now)["removed"], 0)


if __name__ == "__main__":
    unittest.main()
