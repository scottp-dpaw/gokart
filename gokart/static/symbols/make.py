#!/usr/bin/env python
import subprocess
import os
import csv
import shutil

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


