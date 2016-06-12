import confy
import bottle 
import tempfile 
import os
import shutil
import subprocess
from datetime import datetime

bottle.TEMPLATE_PATH.append('./gokart/views')
bottle.debug(True)

@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('apps/{}.html'.format( app_name ))

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
