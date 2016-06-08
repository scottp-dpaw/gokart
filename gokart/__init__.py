
import confy
import bottle 
import pdb

bottle.TEMPLATE_PATH.append('./gokart/views')

@bottle.route('/<app_name>')
def index( app_name ):
    return bottle.jinja2_template('app-{}.html'.format( app_name ))




application = bottle.default_app()
