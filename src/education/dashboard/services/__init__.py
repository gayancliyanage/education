from google.appengine.api import lib_config


__all__ = ['config']


class _ConfigDefaults(object):
    ROSH_REVIEW_API_URL_PATTERN = (
        'https://graphs.roshreview.com/programs/%s/subscriber_details?'
    )
    ROSH_REVIEW_API_KEY = None

    FIRST_AID_BASE_URL = 'https://api.usmle-rx.com/v1/'
    FIRST_AID_TOPIC_URLS = (
        'https://api.usmle-rx.com/v1/discipline/',
        'https://api.usmle-rx.com/v1/organsystem/',
    )
    FIRST_AID_AUTH_ID = '1234'
    FIRST_AID_AUTH_PW = None
    FIRST_AID_AUTH_URL_PATTERN = (
        'https://api.usmle-rx.com/v1/user/%s/login'
    )
    FIRST_AID_REPORT_URL_PATTERN = (
        'https://api.usmle-rx.com/v1/report/123/execute?%s'
    )


config = lib_config.register(
    'educationdashboardservices',
    _ConfigDefaults.__dict__
)
