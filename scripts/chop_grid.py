#!/usr/bin/env python3
"""
chop_grid.py — Split grid-sheet images into individual cells.

Auto-detects number of columns/rows per image using character density peaks.
Falls back to --cols / --rows if auto-detection is overridden.

Usage:
    python3 scripts/chop_grid.py <input_dir>
    python3 scripts/chop_grid.py <input_dir> --cols 5 --rows 2  # override auto-detect

Output:
    <input_dir>/chopped/<original_stem>_R{row}C{col}.png
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def detect_cuts(arr: np.ndarray, axis: int, smooth_k: int = 150) -> list[int]:
    """
    Find cut boundaries along an axis by detecting character density peaks.

    axis=0 → vertical cuts (column boundaries), scans horizontally
    axis=1 → horizontal cuts (row boundaries), scans vertically

    Returns list of pixel boundaries including 0 and image dimension.
    """
    size = arr.shape[1] if axis == 0 else arr.shape[0]
    R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    is_yellow = (R > 170) & (G > 140) & (B < 70)
    is_dark_line = (R < 80) & (G < 80) & (B < 80)  # separator lines, not character content
    is_char = ~is_yellow & ~is_dark_line

    # Project onto the axis we care about
    if axis == 0:
        density = is_char.mean(axis=0)  # per-column density
    else:
        density = is_char.mean(axis=1)  # per-row density

    # Smooth
    kernel = np.ones(smooth_k) / smooth_k
    s = np.convolve(density, kernel, mode="same")

    # Find peaks (character clusters)
    thresh = s.max() * 0.3
    peaks = []
    in_peak = False
    peak_max = 0.0
    peak_pos = 0
    for x in range(size):
        if s[x] > thresh:
            if not in_peak:
                in_peak = True
                peak_max = s[x]
                peak_pos = x
            elif s[x] > peak_max:
                peak_max = s[x]
                peak_pos = x
        else:
            if in_peak:
                peaks.append(peak_pos)
                in_peak = False
    if in_peak:
        peaks.append(peak_pos)

    if len(peaks) < 1:
        return [0, size]

    # Boundaries = 0, valley minimum between peaks, image edge
    boundaries = [0]
    for i in range(len(peaks) - 1):
        lo, hi = peaks[i], peaks[i + 1]
        valley_pos = lo + int(np.argmin(s[lo:hi]))
        boundaries.append(valley_pos)
    boundaries.append(size)
    return boundaries


def chop(input_dir: Path, cols_override: int | None, rows_override: int | None) -> None:
    pngs = sorted(p for p in input_dir.glob("*.png") if p.parent == input_dir)
    if not pngs:
        print(f"No PNG files found in {input_dir}")
        sys.exit(1)

    out_dir = input_dir / "chopped"
    out_dir.mkdir(exist_ok=True)

    total = 0
    for img_path in pngs:
        img = Image.open(img_path).convert("RGB")
        arr = np.array(img, dtype=np.float32)
        h, w = arr.shape[:2]

        if cols_override is not None:
            # Equal-width fallback
            col_cuts = [round(w * i / cols_override) for i in range(cols_override + 1)]
        else:
            col_cuts = detect_cuts(arr, axis=0)

        if rows_override is not None:
            row_cuts = [round(h * i / rows_override) for i in range(rows_override + 1)]
        else:
            row_cuts = detect_cuts(arr, axis=1)

        n_cols = len(col_cuts) - 1
        n_rows = len(row_cuts) - 1

        count = 0
        for r in range(n_rows):
            for c in range(n_cols):
                cell = img.crop((col_cuts[c], row_cuts[r], col_cuts[c + 1], row_cuts[r + 1]))
                out_name = f"{img_path.stem}_R{r+1}C{c+1}.png"
                cell.save(out_dir / out_name)
                count += 1

        total += count
        print(f"Chopped {img_path.name} → {n_cols}×{n_rows} grid = {count} images")

    print(f"\nDone. {total} images saved to {out_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="Split grid-sheet images into individual cells (auto-detects grid)."
    )
    parser.add_argument("input_dir", type=Path, help="Directory containing grid PNG files")
    parser.add_argument("--cols", type=int, default=None, help="Override column count (disables auto-detect)")
    parser.add_argument("--rows", type=int, default=None, help="Override row count (disables auto-detect)")
    args = parser.parse_args()

    if not args.input_dir.is_dir():
        print(f"Error: {args.input_dir} is not a directory")
        sys.exit(1)

    chop(args.input_dir, args.cols, args.rows)


if __name__ == "__main__":
    main()
