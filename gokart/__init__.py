import bottle 
import dotenv
import os
import pytz
import random
import shutil
import subprocess
import tempfile 
from datetime import datetime, timedelta
from six.moves import urllib

dotenv.load_dotenv(dotenv.find_dotenv())

bottle.TEMPLATE_PATH.append('./gokart/views')
bottle.debug(True)

# serve up map apps
@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('apps/{}.html'.format( app_name ), env=os.environ)


# WMS shim for Himawari 8
# Landgate tile servers, round robin
LANDGATE_SERVERS = ['http://t{}.srss-ows-6.landgate.wa.gov.au/mapproxy/firewatch/service'.format(x) for x in range(1,6)]
# timezone used for timestamps
LANDGATE_TZ = pytz.timezone('Australia/Perth')
# update period
LANDGATE_PERIOD = timedelta(minutes=10)
# approx. lead time before a layer is published 
HI8_FHS_LEADTIME = timedelta(minutes=3)
HI8_BAND_LEADTIME = timedelta(minutes=33)
HI8 = {
    'band7': ('layer63_{}_HI8_AHI_TKY_b7.tif', HI8_BAND_LEADTIME),
    'band15': ('layer63_{}_HI8_AHI_TKY_b15.tif', HI8_BAND_LEADTIME),
    'bandtc': ('layer63_{}_HI8_AHI_TKY_b321.tif', HI8_BAND_LEADTIME),
    'fhs': ('layer64_{}_HI8_AHI_TKY_FHS.shp', HI8_FHS_LEADTIME)
}   
# number of maps available in the rolling cache
HI8_HISTORY = 134

# formula to get the latest timestamp (rounded to 10 minutes)
def himawari_latest_ts(leadtime):
    now = datetime.now(tz=LANDGATE_TZ)-leadtime
    result = now - timedelta(minutes=now.minute%10, seconds=now.second, microseconds=now.microsecond)
    
    return result   
    
@bottle.route('/himawari8/<target>')
def himawari8(target):
    layer_id, layer_lead = HI8[target]

    now = himawari_latest_ts(leadtime=layer_lead)
    query = {k.lower():v for k,v in bottle.request.query.items()}
    
    if 'layers' in query and query['layers'].isdigit():
        layer = int(query['layers'])
        ts = now - LANDGATE_PERIOD*layer
        query['layers'] = layer_id.format(ts.strftime("%Y%m%d%H%M"))
        
    redirect = '{}?{}'.format(random.choice(LANDGATE_SERVERS), urllib.parse.urlencode(query))
    
    #return bottle.redirect('')
    print('{}'.format((now, query, redirect)))
    return bottle.redirect(redirect)


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
