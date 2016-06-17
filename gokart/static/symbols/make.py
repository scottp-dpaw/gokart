#!/usr/bin/env python
import subprocess
import os
import csv
import shutil

IN_PATH = "svgs"
OUT_PATH = "png"
OUT_RES = "48"

if os.path.isdir(OUT_PATH):
    shutil.rmtree(OUT_PATH)
os.mkdir(OUT_PATH)
for x in [y for y in os.listdir(IN_PATH) if os.path.isdir(os.path.join(IN_PATH, y))]:
    os.mkdir(os.path.join(OUT_PATH, x))
    svg_path = os.path.join(IN_PATH, x)
    out_path = os.path.join(OUT_PATH, x)
    for s in [y for y in os.listdir(svg_path) if y.endswith('.svg')]:
        out_src = os.path.join(out_path, s)
        out_png = os.path.splitext(out_src)[0]+'.png'
        subprocess.check_call(["inkscape", os.path.join(svg_path, s), "-w", OUT_RES, "-h", OUT_RES, "-l", out_src])
        subprocess.check_call(["inkscape", out_src, "-w", OUT_RES, "-h", OUT_RES, "-e", out_png ])

exit()

for d in os.listdir("svgs"): 
    shutil.rmtree(d)
    subprocess.check_call(["svgo", "-f", os.path.join("svgs", d), "-o", d])
    tinter = os.path.join("svgs", d, "tints.csv")
    if os.path.exists(tinter):
        svgs = os.listdir(d)
        for line in csv.DictReader(open(tinter, "r"), delimiter=";"):
            colors = line["colors"].split(",")
            tints = line["tints"].split(",")
            suffix = line["suffix"]
            for svg in svgs:
                name, ext = os.path.splitext(svg)
                with open(os.path.join(d, name + suffix + ext), "w") as tint_svg:
                    svgdata = open(os.path.join(d, svg)).read()
                    for index, color in enumerate(colors):
                        svgdata = svgdata.replace(color, tints[index])
                    tint_svg.write(svgdata)


