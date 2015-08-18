"""JSON/RESTful API that will support a variety of Angularjs apps to
support the education market in Singapore.

"""
import os.path

from google.appengine.api import lib_config

__all__ = ['config']


class _ConfigDefaults(object):
    USERS_ARE_ADMIN = False
    LOGIN_URL = '/api/login'
    LOGOUT_URL = '/api/logout'
    OAUTH_CALLBACK_URL = '/api/oauth2callback'
    OAUTH_SECRET_PATH_PATTERN = os.path.join(
        os.path.dirname(__file__), '../../secrets/%s_client.json'
    )
    OAUTH_SCOPES = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]
    OAUTH_SERVICE_ACCOUNT_SECRET_PATH_PATTERN = os.path.join(
        os.path.dirname(__file__), '../../secrets/%s_service_account.json'
    )
    OAUTH_SERVICE_ACCOUNT_SCOPES = [
        'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ]
    VALID_DOMAINS = {'example.com': 'admin@example.com'}
    DEFAULT_RETURN_URL = '/dashboard/'
    UPLOAD_CB_URL = '/api/v1/dashboard/students/_upload'
    PHOTO_CB_URL = '/api/v1/dashboard/students/_uploadprofile'


config = lib_config.register('educationcore',  _ConfigDefaults.__dict__)
