import subprocess
import os
import sys

basedir = os.path.abspath(os.path.dirname(__file__))
server = "localhost:8041"
apps = ["sss"]

for app in apps:
    os.chdir(os.path.join(basedir, "cordova/{}/www".format(app)))
    subprocess.check_call(["wget", "--mirror", "--convert-links", "--span-hosts", "-P", "cache".format(app), "http://{}/{}".format(server, app)])
    subprocess.check_call(["rsync", "-Pavvr", os.path.join(basedir, "gokart/static/"), "cache/{}/static/".format(server)])
    subprocess.check_call(["rsync", "-av", "cache/{}/".format(server), "cache/base/"])
    subprocess.call(["mv", "cache/base/{}".format(app), "cache/base/index.html"])
    os.chdir("..")
    # Run launched command against each app
    subprocess.call(["cordova"] + sys.argv[1:])