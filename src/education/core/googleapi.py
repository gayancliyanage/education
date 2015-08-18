import json
import logging
from threading import RLock

import httplib2
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.appengine.api import memcache
from oauth2client.client import AccessTokenRefreshError
from oauth2client.client import SignedJwtAssertionCredentials
from oauth2client.clientsecrets import InvalidClientSecretsError

from education.core import config
from education.exceptions import InvalidCredentialsDomainError
from education.exceptions import InvalidCredentialsError


_locks = {}
_services = {}
_service_acount_credentials_lock = RLock()
_service_acount_credentials = {}


def _http(credentials=None):
    http = httplib2.Http(memcache)
    if credentials is None:
        return http
    else:
        return credentials.authorize(httplib2.Http(memcache))


def get_service(service_name, version, http=None):
    _locks.setdefault(service_name, RLock())
    if service_name in _services:
        return _services[service_name]

    http = _http() if http is None else http
    with _locks[service_name]:
        if service_name not in _services:
            _services[service_name] = build(service_name, version, http=http)
    return _services[service_name]


def get_plus_services(http=None):
    return get_service('plus', 'v1', http=http)


def get_admin_directory_service(http=None):
    return get_service('admin', 'directory_v1', http=http)


def service_acount_credentials(app_name):
    """Return of dict of service account credentials.

    domain -> credentials

    A service account will be created for each domain in
    `educationcore_VALID_DOMAINS` set in `src/appengine_config.py`.

    """
    with _service_acount_credentials_lock:
        if not _service_acount_credentials:
            _create_service_account_credentials(app_name)
        return _service_acount_credentials


def _create_service_account_credentials(app_name):
    scopes = config.OAUTH_SERVICE_ACCOUNT_SCOPES
    secret_path = (
        config.OAUTH_SERVICE_ACCOUNT_SECRET_PATH_PATTERN % app_name
    )

    try:
        secret_file = open(secret_path)
    except IOError:
        raise InvalidClientSecretsError(
            'Secret file not found (%s)' % secret_path
        )

    try:
        secrets = json.load(secret_file)
        for domain, admin_email in config.VALID_DOMAINS.iteritems():
            _service_acount_credentials[domain] = (
                SignedJwtAssertionCredentials(
                    secrets['client_email'],
                    secrets['private_key'],
                    scopes,
                    sub=admin_email
                )
            )
    except (ValueError, KeyError):
        raise InvalidClientSecretsError(
            'Secret file invalid (%s)' % secret_file
        )
    finally:
        secret_file.close()


def get_user_data(user_id, user_credentials):
    people = get_plus_services().people()

    try:
        req = people.get(userId=user_id)
        resp = req.execute(http=_http(user_credentials))
    except HttpError, e:
        if e.resp.status in (401, 403,):
            logging.info('Failed to get user\'s data: %s', str(e))
            raise InvalidCredentialsError()
        raise e

    return resp, user_credentials.id_token.get('email')


def get_domain_user_data(user_id, user_email, domain, sa_credentials):
    if domain is None:
        logging.info('The user is using a google account')
        raise InvalidCredentialsDomainError()
    elif domain not in sa_credentials:
        logging.info(
            'The user account is not from a valid domain (%s).'
            % domain
        )
        raise InvalidCredentialsDomainError()

    users = get_admin_directory_service().users()
    try:
        req = users.get(userKey=user_id)
        return req.execute(http=_http(sa_credentials[domain]))
    except AccessTokenRefreshError:
        logging.error(
            'Service account for %s domain is not set correctlty:\n'
            '1. Please check the the domain admin email is correctly set '
            'for %s domain in appengine_config.py '
            '("educationcore_VALID_DOMAINS" variable).\n'
            '2. Make sure Student Dashboard is installed on your domain '
            '(go to https://admin.google.com/%s/AdminHome?chromeless=1'
            '#AppsList:serviceType=MARKETPLACE, Student Dashboard '
            'should be in the list).\n'
            '3. Click on Student Dashboard in that list and check that '
            '"Data Access" is "Granted". If "Approval Needed", click '
            'on "Data Access" and "Grant data Access".\n'
            '4. all those step fails, the Oauth2 client secrets might '
            'be out of data. You might need to reinstall the backend. Or, '
            'the Oauth client secret do not match the Marketplace App; '
            'you might need to reinstall the Marketplace App.',
            domain,
            domain,
            domain,
        )
        return
    except HttpError, e:
        if e.resp.status == 403:
            logging.error(
                'The API access might be disabled on %s domain.\n'
                '1. Go to https://admin.google.com/ as a domain admin.\n'
                '2. Go to "Security". You might need to click on '
                '"More controls" to see this section.\n'
                '3. Go to "API Reference".\n'
                '4. Tick "Enable API access".\n'
                'A direct like to that panel might be:\n'
                'https://admin.google.com/%s/AdminHome#SecuritySettings:'
                'flyout=apimanagement',
                domain,
                domain
            )
            return

        if e.resp.status == 404:
            logging.error(
                'The user is in valid domain but couldn\'t be found (%).',
                user_email
            )
            return  # TODO: raise an error once we stop testing the app.

        raise e
