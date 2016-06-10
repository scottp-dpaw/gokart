
import confy
import bottle 
import pdb

bottle.TEMPLATE_PATH.append('./gokart/views')

@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('app-{}.html'.format( app_name ))

#TODO: make gdal pdf thingy gdal_translate -of PDF -a_ullr 113.85406494140625 -34.281463623046875 119.12750244140625 -31.257476806640625 -a_srs EPSG:4326 -co DPI=150 /tmp/map.jpg gokart/static/map.pdf

application = bottle.default_app()
