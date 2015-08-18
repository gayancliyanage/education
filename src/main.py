"""Education WSGI app

"""
import os

import webapp2

from education import api
from education.core import config as core_config
from education.core.controllers import StudentsUploadHandler
from education.core.controllers import StudentProfileUploadHandler
from education.core import models
from education.core import utils
from education.dashboard import config as dashboard_config
from education.dashboard.controllers import AssessmentUploadHandler
from education.dashboard.controllers import DownloadHandler
from education.dashboard.controllers import UploadHandler


debug = os.environ.get('SERVER_SOFTWARE', '').startswith('Dev')

wsgi_config = {}
wsgi_config['webapp2_extras.sessions'] = {
    'secret_key': models.SecretKeys.get_key(
        'webapp2_extras.sessions.secret_key'
    ),
}

app = webapp2.WSGIApplication(
    [
        webapp2.Route(
            core_config.OAUTH_CALLBACK_URL, utils.OauthCallbackHandler,
            name="oauth_callback"
        ),
        webapp2.Route(
            core_config.LOGIN_URL,
            utils.LoginHandler,
            name="login"
        ),
        webapp2.Route(
            core_config.LOGOUT_URL,
            utils.LogoutHandler,
            name="logout"
        ),
        webapp2.Route(
            core_config.UPLOAD_CB_URL,
            StudentsUploadHandler
        ),
        webapp2.Route(
            core_config.PHOTO_CB_URL,
            StudentProfileUploadHandler
        ),
        webapp2.Route(
            dashboard_config.UPLOAD_CB_URL,
            UploadHandler
        ),
        webapp2.Route(
            dashboard_config.UPLOAD_EXAM_URL,
            AssessmentUploadHandler
        ),
        webapp2.Route(
            dashboard_config.DOWNLOAD_URL,
            DownloadHandler,
            name='dashboard_download_file'
        ),
        api.routes(),
    ],
    debug=debug,
    config=wsgi_config
)
