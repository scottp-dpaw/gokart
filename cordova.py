import subprocess
import os
import sys

basedir = os.path.abspath(os.path.dirname(__file__))
server = "localhost:8041"
apps = ["sss"]

for app in apps:
    os.chdir(os.path.join(basedir, "cordova/{}/www".format(app)))
    subprocess.check_call(["wget", "--mirror", "--content-disposition", "--span-hosts", 
        "-P", "cache".format(app), "-r", "-p", "http://{}/{}".format(server, app)])
    subprocess.check_call(["rsync", "-Pavvr", os.path.join(basedir, "gokart/static/"), "cache/{}/static/".format(server)])
    subprocess.check_call(["rsync", "-av", "cache/{}/".format(server), "cache/base/"])
    subprocess.call(["mv", "cache/base/{}".format(app), "cache/base/index.html"])
    # Make external asset links relative
    subprocess.call(["bash", "-c", 'for file in $(find cache -name "*\?*"); do mv -v "$file" "${file%%\?*}"; done'])
    subprocess.call(["sed", "-i", "bk", "s=//static.dpaw.wa.gov.au=../static.dpaw.wa.gov.au=g", "cache/base/index.html"])
    os.chdir("..")
    # Run launched command against each app
    subprocess.call(["cordova"] + sys.argv[1:])