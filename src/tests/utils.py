"""Utility class and function for education test cases.

"""


import unittest

import webtest
from google.appengine.datastore import datastore_stub_util
from google.appengine.api import apiproxy_stub
from google.appengine.ext import deferred
from google.appengine.ext import ndb
from google.appengine.ext import testbed
from webapp2_extras.securecookie import SecureCookieSerializer

from education import core
from education.core.models import User


class TestCase(unittest.TestCase):
    """Basic Test case to extends

    Setup google appengine mock services.

    """

    def setUp(self):
        self.testbed = testbed.Testbed()
        # Then activate the testbed, which prepares the service stubs for use.
        self.testbed.activate()
        # Next, declare which service stubs you want to use.

        self.policy = datastore_stub_util.PseudoRandomHRConsistencyPolicy(
            probability=0
        )
        self.testbed.init_datastore_v3_stub(consistency_policy=self.policy)
        self.testbed.init_memcache_stub()
        self.testbed.init_mail_stub()
        self.testbed.init_blobstore_stub()
        self.testbed.init_files_stub()
        self.testbed.init_taskqueue_stub(root_path="../.")  # 2.7
        self.testbed.init_user_stub()

        self.url_fetcher = URLFetchServiceMock()
        self.testbed._register_stub('urlfetch', self.url_fetcher)

        import main
        main.app.debug = True

        self.secret = main.wsgi_config['webapp2_extras.sessions']['secret_key']
        self.app = webtest.TestApp(main.app)

        self.taskqueue_stub = self.testbed.get_stub(
            testbed.TASKQUEUE_SERVICE_NAME
        )
        self.task_run = set([])
        self._id_count = 1
        core.config.VALID_DOMAINS = {"example.com": "admin@example.com"}

    def tearDown(self):
        self.testbed.deactivate()

    def new_user(
        self,
        name="Alice Smith",
        is_staff=False,
        is_admin=False,
        is_domain_admin=False,
        student_id=None
    ):
        given_name, family_name = name.split(' ')
        domain = "example.com"

        if student_id is not None:
            domain = "example.com"
            email = "%s@example.com" % student_id
        else:
            email = "%s_%s@%s" % (given_name, family_name, domain,)

        data = {
            "displayName": name,
            "image": {
                "url": "http://example.com/image.jpg?sw=50"
            },

            "primaryEmail": email,
            "name": {
                "givenName": given_name,
                "familyName": family_name
            },
            "isDomainAdmin": is_domain_admin,
            "isDelegatedAdmin": False,
            "orgUnitPath": '/',
            "domain": domain,
        }

        user = User(
            id=str(self._id_count),
            is_staff=is_staff,
            is_admin=is_admin,
            data=data
        ).put().get(use_cache=False)
        self._id_count += 1
        return user

    def login(self, user=None, app_name="dashboard"):
        """Return a header containing the auth cookie.

        """
        user = user if user else self.new_user()
        session_name = "session_%s" % app_name
        session = {'user_id': user.key.id(), 'user_domain': 'example.com'}
        secure_cookie_serializer = SecureCookieSerializer(self.secret)
        serialized = secure_cookie_serializer.serialize(
            session_name, session
        )
        return {
            'X-App-Name': app_name,
            'Cookie': '%s=%s' % (session_name, serialized,)
        }

    def logoff(self, app_name="dashboard"):
        return {'X-App-Name': app_name}

    def empty_task_queue(self):
        while True:
            tasks = []
            for task in self.taskqueue_stub.get_filtered_tasks():
                if task.name not in self.task_run:
                    tasks.append(task)
            if not tasks:
                break
            for task in tasks:
                result = deferred.run(task.payload)
                if hasattr(result, 'key'):
                    result.key.get(use_cache=False)
                if isinstance(result, ndb.Key):
                    result.get(use_cache=True)
                self.task_run.add(task.name)


class URLFetchServiceMock(apiproxy_stub.APIProxyStub):
    """Mock for google.appengine.api.urlfetch.

    see
    http://blog.rebeiro.net/2012/03/mocking-appengines-urlfetch-service-in.html

    """

    def __init__(self, service_name='urlfetch'):
        super(URLFetchServiceMock, self).__init__(service_name)
        self.return_values = {}
        self.default_return_values = {
            'content': '',
            'status_code': 200,
            'headers': {}
        }
        self.calls = []

    def set_return_values(self, url, **kwargs):
        self.return_values[url] = kwargs

    def get_return_values(self, url):
        return self.return_values.get(url, self.default_return_values)

    def _Dynamic_Fetch(self, request, response):
        self.calls.append(
            (
                request.url(),
                [(h.key(), h.value(),) for h in request.header_list()],
            )
        )
        return_values = self.get_return_values(request.url())
        response.set_content(return_values.get('content', ''))
        response.set_statuscode(return_values.get('status_code', 200))
        for k, v in return_values.get('headers', {}).iteritems():
            new_header = response.add_header()
            new_header.set_key(k)
            new_header.set_value(v)
        response.set_finalurl(return_values.get('final_url', request.url()))
        response.set_contentwastruncated(
            return_values.get('content_was_truncated', False)
        )

        self.request = request
        self.response = response
