"""Download and extract the public handwriting datasets into datasets/ (gitignored).

    python3 -I scripts/eval/fetch_datasets.py [--root datasets]

The archives are untrusted data: each one is downloaded into its own directory,
checked against a known size/hash, and extracted into its own fresh directory
with tarfile's "data" filter (no absolute paths, no "..", no links, no devices).
Nothing inside the archives is ever executed or imported. Always run Python
with -I so a planted module in the current directory cannot be imported.
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
import tarfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    filename: str
    md5: str | None  # None when the publisher gives no hash
    max_bytes: int
    # Top-level entry we expect inside the archive, used to find the data root.
    expect: str


SOURCES = [
    Source(
        name="mathwriting-excerpt",
        url="https://storage.googleapis.com/mathwriting_data/mathwriting-2024-excerpt.tgz",
        filename="mathwriting-2024-excerpt.tgz",
        md5=None,
        max_bytes=10_000_000,
        expect="mathwriting-2024-excerpt",
    ),
    Source(
        name="hasy",
        url="https://zenodo.org/records/259444/files/HASYv2.tar.bz2?download=1",
        filename="HASYv2.tar.bz2",
        md5="fddf23f36e24b5236f6b3a0880c778e3",  # from the Zenodo record
        max_bytes=60_000_000,
        expect="hasy-data-labels.csv",
    ),
]


def download(src: Source, archive_dir: Path) -> Path:
    archive_dir.mkdir(parents=True, exist_ok=True)
    dest = archive_dir / src.filename
    if not dest.exists():
        print(f"downloading {src.url}")
        tmp = dest.with_suffix(dest.suffix + ".part")
        with urllib.request.urlopen(src.url, timeout=120) as resp, open(tmp, "wb") as out:
            total = 0
            while chunk := resp.read(1 << 20):
                total += len(chunk)
                if total > src.max_bytes:
                    tmp.unlink(missing_ok=True)
                    raise SystemExit(f"{src.name}: download exceeds {src.max_bytes} bytes, aborting")
                out.write(chunk)
        tmp.rename(dest)
    if dest.stat().st_size > src.max_bytes:
        raise SystemExit(f"{src.name}: {dest} is larger than expected")
    if src.md5:
        digest = hashlib.md5(dest.read_bytes()).hexdigest()
        if digest != src.md5:
            raise SystemExit(f"{src.name}: md5 {digest} != expected {src.md5}")
    return dest


def extract(src: Source, archive: Path, out_dir: Path) -> Path:
    marker = out_dir / ".extracted"
    if marker.exists():
        return out_dir
    if out_dir.exists():
        shutil.rmtree(out_dir)  # partial previous extraction; only ever our own directory
    out_dir.mkdir(parents=True)
    with tarfile.open(archive) as tar:
        for member in tar:
            if not (member.isfile() or member.isdir()):
                raise SystemExit(f"{src.name}: refusing non-regular member {member.name!r}")
        # "data" filter rejects absolute paths, traversal, links and special files.
        tar.extractall(out_dir, filter="data")
    if not (out_dir / src.expect).exists():
        raise SystemExit(f"{src.name}: expected {src.expect!r} inside the archive")
    marker.write_text("ok\n")
    return out_dir


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default="datasets", type=Path)
    args = parser.parse_args()
    if not sys.flags.isolated:
        print("warning: run with `python3 -I` when handling downloaded data", file=sys.stderr)
    for src in SOURCES:
        archive = download(src, args.root / "archives" / src.name)
        path = extract(src, archive, args.root / src.name)
        print(f"{src.name}: {path}")


if __name__ == "__main__":
    main()
