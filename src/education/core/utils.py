import cgi
import pickle

import webapp2
from oauth2client import xsrfutil
from oauth2client.appengine import InvalidXsrfTokenError
from oauth2client.appengine import xsrf_secret_key
from oauth2client.client import Credentials
from oauth2client.client import flow_from_clientsecrets
from oauth2client.clientsecrets import InvalidClientSecretsError
from webapp2_extras import sessions
from webapp2_extras import sessions_memcache
from webapp2ext import swagger

from education.core import config
from education.core import models
from education.core.googleapi import service_acount_credentials
from education.exceptions import InvalidCredentialsDomainError
from education.exceptions import InvalidCredentialsError


class SessionMissingError(Exception):
    """The Session is not setup."""


_sep = '::'


def sign_return_url(return_url, session_id):
    token = xsrfutil.generate_token(
        xsrf_secret_key(), session_id, action_id=str(return_url)
    )
    return _sep.join((token, return_url,))


def validate_return_url(state, session_id):
    token, return_url = state.split(_sep, 1)

    if not xsrfutil.validate_token(
        xsrf_secret_key(),
        token,
        session_id,
        action_id=str(return_url)
    ):
        raise InvalidXsrfTokenError()

    return return_url


def _safe_html(s):
    return cgi.escape(s, quote=1).replace("'", '&#39;')


class SessionMixin(object):

    CREDENTIALS_KEY = 'credentials'
    USER_ID_KEY = 'user_id'
    USER_DOMAIN = 'user_domain'
    APP_NAME = 'dashboard'

    def set_session_store(self):
        self.session_store = sessions.get_store(request=self.request)

    def save_session_store(self):
        self.session_store.save_sessions(self.response)

    def dispatch(self):
        # Get a session store for this request.
        self.set_session_store()
        webapp2.RequestHandler.dispatch(self)
        self.save_session_store()

    @webapp2.cached_property
    def cookie_session(self):
        return self.session_store.get_session(
            name='session_%s' % self.APP_NAME
        )

    @webapp2.cached_property
    def memcache_session(self):
        return self.session_store.get_session(
            name='mc_session_%s' % self.APP_NAME,
            factory=sessions_memcache.MemcacheSessionFactory
        )

    def session_id(self):
        self.memcache_session
        container = self.session_store.sessions.get(
            'mc_session_%s' % self.APP_NAME
        )

        if container is None:
            raise SessionMissingError()

        return container.sid

    def save_credentials(self, credentials):
        self.reset_credentials()
        self.memcache_session[self.CREDENTIALS_KEY] = credentials.to_json()

    def get_user_credentials(self):
        j_credentials = self.memcache_session.get(self.CREDENTIALS_KEY)
        if j_credentials is None:
            return

        credentials = Credentials.new_from_json(j_credentials)
        if not credentials.invalid:
            return credentials

    def has_credentials(self):
        return self.get_user_credentials() is not None

    def reset_credentials(self):
        self.memcache_session[SessionMixin.CREDENTIALS_KEY] = None
        self.cookie_session[SessionMixin.USER_ID_KEY] = None
        self.cookie_session[SessionMixin.USER_DOMAIN] = None

    def current_user_id(self):
        user_id = self.cookie_session.get(self.USER_ID_KEY)
        if user_id:
            return user_id

        credentials = self.get_user_credentials()
        if credentials is None:
            return

        user_id = credentials.id_token.get('sub')
        if user_id is None:
            return

        self.cookie_session[self.USER_ID_KEY] = user_id
        return user_id

    def current_user_domain(self):
        domain = self.cookie_session.get(self.USER_DOMAIN)
        if domain:
            return domain

        credentials = self.get_user_credentials()
        if credentials is None:
            return

        domain = credentials.id_token.get('hd')
        if domain is None:
            return

        self.cookie_session[self.USER_DOMAIN] = domain
        return domain

    @webapp2.cached_property
    def flow(self):
        p_flow = self.memcache_session.get('flow')
        if p_flow is not None:
            return pickle.loads(p_flow)

        redirect_uri = self.request.relative_url(config.OAUTH_CALLBACK_URL)
        flow = flow_from_clientsecrets(
            config.OAUTH_SECRET_PATH_PATTERN % self.APP_NAME,
            scope=config.OAUTH_SCOPES,
            redirect_uri=redirect_uri
        )
        flow.params['access_type'] = 'online'
        self.memcache_session['flow'] = pickle.dumps(flow)
        return flow

    def save_flow(self):
        self.memcache_session['flow'] = pickle.dumps(self.flow)


class ApiRequestHandler(swagger.ApiRequestHandler, SessionMixin):
    """Extends the base request handler to handle authentication

    """
    def dispatch(self):
        return SessionMixin.dispatch(self)

    def get_current_user(self):
        user_id = self.get_current_user_id()
        if user_id:
            return models.User.get_by_id(user_id)

    def get_current_user_id(self):
        user_id = self.current_user_id()
        domain = self.current_user_domain()
        valid_domains = config.VALID_DOMAINS.keys()
        if user_id and domain in valid_domains:
            return user_id

    def admin_required(self, msg=None, admin_msg=None):
        user = self.login_required(msg=msg)
        if user.is_admin or user.is_domain_admin:
            return user

        self.abort(403, admin_msg)

    def get_current_user_data(self):
        return self.get_current_user()

    def student_required(self):
        """Abort the request if the user is not a student

        """
        return self.login_required()

    def staff_required(self):
        """Abort the request if the user is not a staff mumber or
        an admin.

        """
        user = self.login_required()
        if not user.is_staff:
            self.admin_required()

        return user


class LoginHandler(webapp2.RequestHandler, SessionMixin):
    """Handle authentication of student and users.

    """
    def dispatch(self):
        return SessionMixin.dispatch(self)

    def get(self):
        """Populate user's session with her oauth credential and her
        user id.

        If the user is new it will register her/him. Otherwise it will update
        her/his data.

        """
        state = self.request.GET.get('state', None)
        if state:
            try:
                redirect_uri = validate_return_url(
                    str(state), self.session_id()
                )
            except InvalidXsrfTokenError:
                redirect_uri = config.DEFAULT_RETURN_URL
        else:
            redirect_uri = config.DEFAULT_RETURN_URL

        self.memcache_session.setdefault(SessionMixin.CREDENTIALS_KEY, None)
        self.cookie_session.setdefault(SessionMixin.USER_ID_KEY, None)
        self.cookie_session.setdefault(SessionMixin.USER_DOMAIN, None)

        try:
            models.User.update_or_create(
                self.current_user_id(),
                self.current_user_domain(),
                service_acount_credentials(self.APP_NAME),
                self.get_user_credentials()
            )
        except InvalidCredentialsDomainError:
            self.reset_credentials()
            if state:
                login_url = "%s?state=%s" % (config.LOGIN_URL, state,)
            else:
                login_url = config.LOGIN_URL
            self.response.write(
                '<html>'
                '<h1>Wrong domain</h1>'
                '<p>Your account is not managed by our domains (%s).</p>'
                '<p><a href="%s">'
                '   Try login again with an other account.'
                '</a></p>'
                '</html>' % (
                    ', '.join(config.VALID_DOMAINS.keys()),
                    login_url,
                )
            )
            return
        except InvalidClientSecretsError:
            self.abort(
                500, "Failed to load Oauth service account client secrets."
            )
        except InvalidCredentialsError:
            redirect_uri = self._state_oauth_flow(redirect_uri)

        self.redirect(str(redirect_uri))

    def _state_oauth_flow(self, redirect_uri):
        try:
            self.flow.params['state'] = sign_return_url(
                redirect_uri, self.session_id()
            )
            return self.flow.step1_get_authorize_url()
        except InvalidClientSecretsError:
            self.abort(500, "Failed to load Oauth client secrets.")


class LogoutHandler(webapp2.RequestHandler, SessionMixin):

    def dispatch(self):
        return SessionMixin.dispatch(self)

    def get(self):
        state = self.request.GET.get('state', None)
        if state:
            try:
                redirect_uri = validate_return_url(
                    str(state), self.session_id()
                )
            except InvalidXsrfTokenError:
                redirect_uri = config.DEFAULT_RETURN_URL
        else:
            redirect_uri = config.DEFAULT_RETURN_URL

        self.reset_credentials()
        self.response.write(
            '<html>'
            'You are logged out. '
            '<a href="%s">Return</a>'
            '</html>' % redirect_uri
        )


class OauthCallbackHandler(webapp2.RequestHandler, SessionMixin):
    """Handle exchanges of authorization code.

    """

    def dispatch(self):
        return SessionMixin.dispatch(self)

    def get(self):
        error = self.request.get('error')
        if error:
            errormsg = self.request.get('error_description', error)
            self.abort(
                400,
                'The authorization request failed: %s' % _safe_html(errormsg)
            )
            return

        state = self.request.GET.get('state', None)
        try:
            validate_return_url(
                str(state), self.session_id()
            )
        except InvalidXsrfTokenError:
            self.abort(400, 'Failed to validate state')

        credentials = self.flow.step2_exchange(self.request.params)
        self.save_credentials(credentials)
        self.redirect("%s?state=%s" % (config.LOGIN_URL, state,))
