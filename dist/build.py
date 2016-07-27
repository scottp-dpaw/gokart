#!/usr/bin/env
# Takes one argument, the name of the app to build.
# Needs dev server running on port 8080 to pull rendered index file from
import subprocess
import sys

subprocess.call(['wget', 'localhost:8080/{}'.format(sys.argv[1]), '-O', 'release/index.html'])
subprocess.call(['cordova', 'build', 'android'])
subprocess.call(['cordova', 'build', 'ios'])
