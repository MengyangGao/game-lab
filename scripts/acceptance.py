"""Verify the browser application and publish README screenshots locally."""
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from threading import Thread
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
GAMES = {
    "mirror": "匣里流光",
    "flood": "溢彩画",
    "crate": "庸人的容器",
    "voxel": "枘凿六合·Remake",
    "mosaic": "筑梦拼图",
    "echo": "黄金替罪羊",
    "relay": "熄灯",
    "circuit": "继电石",
}
START = "<!-- screenshot-gallery:start -->"
END = "<!-- screenshot-gallery:end -->"


class StaticHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    readme = ROOT / "README.md"
    original = readme.read_text(encoding="utf-8")
    if original.count(START) != 1 or original.count(END) != 1:
        raise SystemExit("README must contain exactly one screenshot gallery marker pair.")

    handler = partial(StaticHandler, directory=str(ROOT / "public"))
    with tempfile.TemporaryDirectory(prefix="game-lab-acceptance-") as scratch:
        with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                env = os.environ | {
                    "GAME_LAB_URL": f"http://127.0.0.1:{server.server_port}/",
                    "GAME_LAB_SCREENSHOTS": scratch,
                }
                subprocess.run([sys.executable, "tests/browser.py"], cwd=ROOT, env=env, check=True)
            finally:
                server.shutdown()
                thread.join()

        shots = ROOT / "docs" / "screenshots"
        files = {game: Path(scratch) / f"desktop-{game}.png" for game in GAMES}
        if not all(path.is_file() for path in files.values()):
            raise SystemExit("Browser verification passed but did not produce all expected screenshots.")
        shots.mkdir(exist_ok=True)
        for game, path in files.items():
            copyfile(path, shots / f"{game}.png")
        copyfile(Path(scratch) / "desktop-home.png", shots / "home.png")
        copyfile(Path(scratch) / "mobile-home.png", shots / "mobile-home.png")
        copyfile(Path(scratch) / "mobile-mosaic.png", shots / "mobile-mosaic.png")
        gallery = "\n\n".join(
            f"### {title}\n\n![{title}实机截图](docs/screenshots/{game}.png)" for game, title in GAMES.items()
        )
        updated = re.sub(re.escape(START) + ".*?" + re.escape(END), f"{START}\n\n{gallery}\n\n{END}", original, flags=re.S)
        readme.write_text(updated, encoding="utf-8")
    print("PASS browser acceptance and README screenshots.")


if __name__ == "__main__":
    main()
