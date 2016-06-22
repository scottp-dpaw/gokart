import bottle 
import dotenv
import os
import pytz
import random
import shutil
import subprocess
import tempfile 
import uwsgi
import requests
from datetime import datetime, timedelta
from six.moves import urllib
import re

dotenv.load_dotenv(dotenv.find_dotenv())

bottle.TEMPLATE_PATH.append('./gokart/views')
bottle.debug(True)

# serve up map apps
@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('apps/{}.html'.format( app_name ), env=os.environ)


# WMS shim for Himawari 8
# Landgate tile servers, round robin
FIREWATCH_SERVICE = os.environ.get("FIREWATCH_SERVICE", "/mapproxy/firewatch/service")
FIREWATCH_GETCAPS = os.environ.get("FIREWATCH_GETCAPS", FIREWATCH_SERVICE + "?service=wms&request=getcapabilities")
@bottle.route("/hi8/<target>")
def himawari8(target):
    if uwsgi.cache_exists("himawari8"):
        getcaps = uwsgi.cache_get("himawari8")
    else:
        getcaps = requests.get(FIREWATCH_GETCAPS).content
        uwsgi.cache_set("himawari8", getcaps, 60*10) # cache for 10 mins
    getcaps = getcaps.decode("utf-8")
    layernames = re.findall("\w+HI8\w+{}\.\w+".format(target), getcaps)
    layers = []
    for layer in layernames:
        layers.append([datetime.strptime(re.findall("\w+_(\d+)_\w+", layer)[0], "%Y%m%d%H%M").isoformat(), layer])
    result = {
        "servers": [FIREWATCH_SERVICE],
        "layers": layers
    }
    return result

# PDF renderer, accepts a JPG
@bottle.route("/gdal/pdf", method="POST")
def gdal_pdf():
    # needs gdal 1.10+
    extent = bottle.request.forms.get("extent").split(" ")
    jpg = bottle.request.files.get("jpg")
    pagesize = bottle.request.forms.get("pagesize", "A3")
    workdir = tempfile.mkdtemp()
    path = os.path.join(workdir, jpg.filename)
    jpg.save(workdir)
    subprocess.check_call([
        "gdal_translate", "-of", "PDF", "-a_ullr", extent[0], extent[3], extent[2], extent[1], 
        "-a_srs", "EPSG:4326", "-co", "DPI={}".format(bottle.request.forms.get("dpi", 150)),
        "-co", "TITLE={}".format(bottle.request.forms.get("title", "Quick Print")),
        "-co", "AUTHOR={}".format(bottle.request.forms.get("author", "Anonymous")),
        "-co", "PRODUCER={}".format(subprocess.check_output(["gdalinfo", "--version"])),
        "-co", "SUBJECT={}".format(bottle.request.headers.get('Referer', "gokart")),
        "-co", "CREATION_DATE={}".format(datetime.strftime(datetime.utcnow(), "%Y%m%d%H%M%SZ'00'")),
        path, path + ".pdf"
    ])
    output = open(path + ".pdf")
    shutil.rmtree(workdir)
    return output
    
application = bottle.default_app()
