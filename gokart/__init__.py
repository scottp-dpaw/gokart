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
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText

dotenv.load_dotenv(dotenv.find_dotenv())

bottle.TEMPLATE_PATH.append('./gokart/views')
bottle.debug(True)

# serve up map apps
@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('apps/{}.html'.format( app_name ), env=os.environ)


# WMS shim for Himawari 8
# Landgate tile servers, round robin
FIREWATCH_TZ = pytz.timezone('Australia/Perth')
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
        layers.append([FIREWATCH_TZ.localize(datetime.strptime(re.findall("\w+_(\d+)_\w+", layer)[0], "%Y%m%d%H%M")).isoformat(), layer])
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
    bottle.response.set_header("Content-Type", "application/pdf")
    bottle.response.set_header("Content-Disposition", "attachment;filename='{}'".format(jpg.filename.replace("jpg", "pdf")))
    return output

# Form emailer, needs wkhtmltopdf 0.12.3+
@bottle.route("/postbox", method="POST")
def postbox():
    workdir = tempfile.mkdtemp()
    path = os.path.join(workdir, "email.html")
    pdfpath = path.replace(".html", ".pdf")
    emailhtml = bottle.jinja2_template('email.html', **{
        "htmlclone": bottle.request.forms.get("_htmlclone").decode("utf-8")
    })
    with open(path, "w") as htmlfile:
        htmlfile.write(emailhtml.encode("utf-8"))
    subprocess.call(["wkhtmltopdf", "-q", path, pdfpath])
    attachment = MIMEApplication(open(pdfpath).read())
    shutil.rmtree(workdir)
    attachment.add_header('Content-Disposition', 'attachment', filename=bottle.request.forms.get("_filename", "form.pdf"))
    text = "Submitted form data:\n\n"
    for key, value in bottle.request.forms.iteritems():
        if key.startswith("_") or not value or value == "0": continue
        text += '  {}: {}\n'.format(key, value)
    msg = MIMEMultipart()
    msg.attach(MIMEText(text, 'plain'))
    msg["Subject"] = bottle.request.forms.get("_subject", "Form Email")
    msg.attach(attachment)
    mailer = smtplib.SMTP("smtp")
    mailer.sendmail(bottle.request.forms.get("_replyto"), bottle.request.headers.get("X-Email"), msg.as_string())
    mailer.close()
    redirect = bottle.request.get("_next", False)
    if redirect:
        return bottle.redirect(redirect)
    return "Email sent to {}".format(bottle.request.headers.get("X-Email"))

application = bottle.default_app()
