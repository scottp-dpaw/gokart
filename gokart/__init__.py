
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
    return bottle.jinja2_template('app-{}.html'.format( app_name ))

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
    
#TODO: make gdal pdf thingy gdal_translate -of PDF -a_ullr 113.85406494140625 -34.281463623046875 119.12750244140625 -31.257476806640625 -a_srs EPSG:4326 -co DPI=150 /tmp/map.jpg gokart/static/map.pdf

application = bottle.default_app()
