# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from builder import build
import content_part1
import content_part2
import content_part3
import content_part4
import content_part5

all_blocks = []
for part in (content_part1, content_part2, content_part3, content_part4, content_part5):
    all_blocks.extend(part.SECTIONS)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "دليل_استخدام_فاتورة_راحتك.docx")
path = build(all_blocks, out)
print("SAVED:", path)
print("SIZE:", os.path.getsize(path), "bytes")
