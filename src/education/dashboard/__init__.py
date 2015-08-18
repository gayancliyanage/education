from google.appengine.api import lib_config


class _ConfigDefaults(object):
    UPLOAD_CB_URL = '/api/v1/_admin/dashboard/repository/upload'
    UPLOAD_EXAM_URL = '/api/v1/_admin/dashboard/assessments/upload'
    DOWNLOAD_URL = '/api/v1/dashboard/repository/files/<keyId>'


config = lib_config.register('educationdashboard',  _ConfigDefaults.__dict__)
