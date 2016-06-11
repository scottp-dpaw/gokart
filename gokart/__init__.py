
import confy
import bottle 
import tempfile 
import os
import shutil
import subprocess

bottle.TEMPLATE_PATH.append('./gokart/views')
bottle.debug(True)

@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('apps/{}.html'.format( app_name ))

@bottle.route("/gdal/pdf", method="POST")
def gdal_pdf():
    extent = bottle.request.forms.get("extent")
    jpg = bottle.request.files.get("jpg")
    dpi = bottle.request.forms.get("dpi", 150)
    workdir = tempfile.mkdtemp()
    path = os.path.join(workdir, jpg.filename)
    jpg.save(workdir)
    subprocess.check_call(["gdal_translate", "-of", "PDF", "-a_ullr"] + extent.split(" ") + ["-a_srs", "EPSG:4326", "-co", "DPI={}".format(dpi), path, path + ".pdf"])
    output = open(path + ".pdf")
    shutil.rmtree(workdir)
    return output
    
application = bottle.default_app()
