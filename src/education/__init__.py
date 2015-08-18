"""JSON/RESTful API that will support a variety of Angularjs apps to
support the education market in Singapore.

"""

from google.appengine.api import app_identity
from google.appengine.api import lib_config
from webapp2ext.swagger import Api

__all__ = ['api']


class _ConfigDefaults(object):
    HOST = (
        "http://%s/"
        % app_identity.get_default_version_hostname() or '0.0.0.0:8080'
    )
    PATH = '/api/v1/'
    VERSION = '1-dev'

_config = lib_config.register('education',  _ConfigDefaults.__dict__)

# Put those settings in appengine_config.py
api = Api(host=_config.HOST, path=_config.PATH, version=_config.VERSION)


import education.core.schemas
import education.dashboard.schemas

import education.core.controllers
import education.dashboard.controllers
