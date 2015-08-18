import unittest
import datetime

from google.appengine.api import files

import education
from education.core import config
from education.core import models
from tests.utils import TestCase


def user_data(user_id=1234, name=None, domain="example.com", student_id=None):
    if name is None:
        name = {
            'givenName': 'Bob',
            'familyName': 'Smith'
        }

    if student_id:
        email = '%s@%s' % (student_id, domain,)
    else:
        email = '%s@%s' % (name['givenName'], domain,)

    return {
        "emails": [{
            "type": "account",
            "value": email
        }],
        "image": {
            "isDefault": True,
            "url": "https://example.com/image.jpg?sz=50"
        },
        "isPlusUser": False,
        "displayName": '%s %s' % (name['givenName'], name['familyName'],),
        "language": "en",
        "objectType": "person",
        "name": name,
        "verified": False,
        "domain": domain,
        "etag": "foo / bar",
        "id": str(user_id),
        "kind": "plus#person"
    }


def domain_data(
    user_id=1234,
    name=None,
    domain="example.com",
    student_id=None,
    is_admin=False
):
    if name is None:
        name = {
            'givenName': 'Bob',
            'familyName': 'Smith'
        }
    if 'fullName' not in name:
        name['fullName'] = '%s %s' % (name['givenName'], name['familyName'],)

    if student_id:
        email = '%s@%s' % (student_id, domain,)
    else:
        email = '%s@%s' % (name['givenName'], domain,)

    return {
        "creationTime": "2014-01-01T00:00:00.000Z",
        "emails": [{
            "primary": True,
            "address": email
        }],
        "changePasswordAtNextLogin": False,
        "nonEditableAliases": [email],
        "customerId": "foobar",
        "etag": "foo / bar",
        "isDelegatedAdmin": False,
        "agreedToTerms": True,
        "isAdmin": is_admin,
        "suspended": False,
        "ipWhitelisted": False,
        "kind": "admin#directory#user",
        "includeInGlobalAddressList": True,
        "id": str(user_id),
        "name": name,
        "orgUnitPath": "/",
        "isMailboxSetup": True,
        "primaryEmail": email,
        "lastLoginTime": "2014-01-01T00:00:00.000Z"
    }


class TestUser(TestCase):

    def setUp(self):
        super(TestUser, self).setUp()
        config.VALID_DOMAINS = {
            'example.com': 'admin@example.com'
        }

    @unittest.skip("TODO: mock google api calls")
    def test_new_user(self):
        pass

    def test_update_non_student(self):
        user = models.User(id="1234")
        user.update_data(
            user_data(user_id="1234"),
            domain_data(user_id="1234"),
            'bob@example.com'
        )
        user.put()
        self.assertEqual(
            {
                'displayName': 'Bob Smith',
                'domain': 'example.com',
                'image': {
                    'isDefault': True,
                    'url': 'https://example.com/image.jpg?sz=50'
                },
                'isDelegatedAdmin': False,
                'isDomainAdmin': False,
                'name': {
                    'familyName': 'Smith',
                    'fullName': 'Bob Smith',
                    'givenName': 'Bob'
                },
                'orgUnitPath': '/',
                'primaryEmail': 'Bob@example.com'
            },
            user.data
        )
        self.assertIsNone(user.student_id)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_domain_admin)

    def test_update_student(self):
        user = models.User(id="1234")
        user.update_data(
            user_data(user_id="1234", student_id="a000001"),
            domain_data(user_id="1234", student_id="a000001"),
            'a000001@example.com'
        )
        user.put()
        self.assertEqual(
            {
                'displayName': 'Bob Smith',
                'domain': 'example.com',
                'image': {
                    'isDefault': True,
                    'url': 'https://example.com/image.jpg?sz=50'
                },
                'isDelegatedAdmin': False,
                'isDomainAdmin': False,
                'name': {
                    'familyName': 'Smith',
                    'fullName': 'Bob Smith',
                    'givenName': 'Bob'
                },
                'orgUnitPath': '/',
                'primaryEmail': 'a000001@example.com'
            },
            user.data
        )
        self.assertEqual('A000001', user.student_id)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_domain_admin)

        student = models.Student.get_by_id('A000001', use_cache=False)
        self.assertIsNotNone(student)
        self.assertFalse(student.is_setup)

    def test_update_non_student_no_domain_data(self):
        user = models.User(id="1234")
        user.update_data(
            user_data(user_id="1234"),
            None,
            'bob@example.com'
        )
        user.put()
        self.assertEqual(
            {
                'displayName': 'Bob Smith',
                'domain': 'example.com',
                'image': {
                    'isDefault': True,
                    'url': 'https://example.com/image.jpg?sz=50'
                },
                'isDomainAdmin': False,
                'name': {
                    'familyName': 'Smith',
                    'givenName': 'Bob'
                },
                'primaryEmail': 'bob@example.com'
            },
            user.data
        )
        self.assertIsNone(user.student_id)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_domain_admin)

    def test_update_student_no_domain_data(self):
        user = models.User(id="1234")
        user.update_data(
            user_data(user_id="1234", student_id="a000001"),
            None,
            'a000001@example.com'
        )
        user.put()
        self.assertEqual(
            {
                'displayName': 'Bob Smith',
                'domain': 'example.com',
                'image': {
                    'isDefault': True,
                    'url': 'https://example.com/image.jpg?sz=50'
                },
                'isDomainAdmin': False,
                'name': {
                    'familyName': 'Smith',
                    'givenName': 'Bob'
                },
                'primaryEmail': 'a000001@example.com'
            },
            user.data
        )
        self.assertEqual('A000001', user.student_id)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_domain_admin)

        student = models.Student.get_by_id('A000001', use_cache=False)
        self.assertIsNotNone(student)
        self.assertFalse(student.is_setup)

    def test_update_existing_student(self):
        student = models.Student.new_student(
            'bob', 'Bob Smith', email='A000001@EXAMPLE.COM', year=2015
        )
        user = models.User(id="1234")
        user.update_data(
            user_data(user_id="1234", student_id="a000001"),
            domain_data(user_id="1234", student_id="a000001"),
            'a000001@example.com'
        )
        user.put()
        self.assertEqual(
            {
                'displayName': 'Bob Smith',
                'domain': 'example.com',
                'image': {
                    'isDefault': True,
                    'url': 'https://example.com/image.jpg?sz=50'
                },
                'isDelegatedAdmin': False,
                'isDomainAdmin': False,
                'name': {
                    'familyName': 'Smith',
                    'fullName': 'Bob Smith',
                    'givenName': 'Bob'
                },
                'orgUnitPath': '/',
                'primaryEmail': 'a000001@example.com',
                'year': 2015
            },
            user.data
        )
        self.assertEqual('A000001', user.student_id)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_domain_admin)

        student = models.Student.get_by_id('A000001', use_cache=False)
        self.assertIsNotNone(student)
        self.assertTrue(student.is_setup)

    def test_summary(self):
        alice = self.new_user()
        education.api.validate('User', alice.summary())

    def test_details(self):
        alice = self.new_user()
        education.api.validate('User', alice.details())

    def test_needs_update_not(self):
        alice = self.new_user()
        self.assertFalse(alice.needs_update())

    def test_needs_update(self):
        alice = self.new_user()
        alice.last_update_at -= datetime.timedelta(days=2)
        self.assertTrue(alice.needs_update())

    def test_make_staff(self):
        alice = self.new_user()
        models.User.make_staff(alice.key.id())
        self.assertTrue(alice.key.get(use_cache=False).is_staff)


class TestStudent(TestCase):

    @staticmethod
    def get_csv_blob(data):
        file_name = files.blobstore.create(mime_type='text/csv')
        with files.open(file_name, 'a') as f:
            f.write(data)
        files.finalize(file_name)
        return files.blobstore.get_blob_key(file_name)

    def test_display_name_to_dict1(self):
        self.assertEqual(
            {'givenName': 'Bob', 'familyName': 'Smith'},
            models.Student.display_name_to_dict('Bob Smith', 'Bob')
        )

    def test_display_name_to_dict2(self):
        self.assertEqual(
            {'givenName': 'Bob', 'familyName': 'Smith'},
            models.Student.display_name_to_dict('Smith Bob', 'Bob')
        )

    def test_new_student(self):
        s = models.Student.new_student(
            'bob', 'Bob Smith', email='A000001@EXAMPLE.COM', year=2015
        )
        self.assertEqual(
            {
                'displayName': 'Bob Smith',
                'name': {
                    'givenName': 'Bob',
                    'familyName': 'Smith'
                },
                'secondaryEmail': 'a000001@example.com',
                'year': 2015
            },
            s.data
        )
        self.assertEqual('A000001', s.key.id())
        self.assertEqual('Bob Smith', s.display_name)
        self.assertEqual('a000001@example.com', s.secondary_email)
