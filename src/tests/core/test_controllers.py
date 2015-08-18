"""Test controllers for common task

"""

from education import api
from education.core.models import Student
from tests.utils import TestCase


class TestCurrentUserApi(TestCase):
    """Test UserApi request handler

    """
    def setUp(self):
        super(TestCurrentUserApi, self).setUp()

    def test_logged_off(self):
        headers = self.logoff()
        response = self.app.get(
            '%s/dashboard/user' % api.path, headers=headers
        ).json
        self.assertFalse(response['isLoggedIn'])

    def test_logged_as_user(self):
        alice = self.new_user()
        headers = self.login(user=alice)
        response = self.app.get(
            '%s/dashboard/user' % api.path, headers=headers
        ).json
        api.validate('User', response)
        self.assertTrue(response['isLoggedIn'])
        self.assertFalse(response['isStaff'])
        self.assertFalse(response['isAdmin'])

    def test_logged_as_student(self):
        alice = self.new_user()
        headers = self.login(user=alice)
        response = self.app.get(
            '%s/dashboard/user' % api.path, headers=headers
        ).json
        api.validate('User', response)
        self.assertTrue(response['isLoggedIn'])
        self.assertFalse(response['isStaff'])
        self.assertFalse(response['isAdmin'])

    def test_logged_as_staff(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        response = self.app.get(
            '%s/dashboard/user' % api.path, headers=headers
        ).json
        api.validate('User', response)
        self.assertTrue(response['isLoggedIn'])
        self.assertTrue(response['isStaff'])
        self.assertFalse(response['isAdmin'])

    def test_logged_as_admin(self):
        alice = self.new_user(is_admin=True)
        headers = self.login(user=alice)
        response = self.app.get(
            '%s/dashboard/user' % api.path, headers=headers
        ).json
        api.validate('User', response)
        self.assertTrue(response['isLoggedIn'])
        self.assertFalse(response['isStaff'])
        self.assertTrue(response['isAdmin'])


class TestUserApi(TestCase):

    def setUp(self):
        super(TestUserApi, self).setUp()
        self.bob = self.new_user("Bob Smith", )

    def test_delete_user(self):
        alice = self.new_user(is_admin=True)
        headers = self.login(user=alice)
        self.app.delete(
            '%s/dashboard/users/%s' % (api.path, self.bob.key.id()),
            headers=headers
        )
        self.assertIsNone(self.bob.key.get(use_cache=False))

    def test_delete_logged_off(self):
        headers = self.logoff()
        self.app.delete(
            '%s/dashboard/users/%s' % (api.path, self.bob.key.id()),
            headers=headers,
            status=401
        )

    def test_delete_as_student(self):
        alice = self.new_user()
        headers = self.login(user=alice)
        self.app.delete(
            '%s/dashboard/users/%s' % (api.path, self.bob.key.id()),
            headers=headers,
            status=403
        )
        self.assertIsNotNone(self.bob.key.get(use_cache=False))

    def test_delete_as_staff(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        self.app.delete(
            '%s/dashboard/users/%s' % (api.path, self.bob.key.id()),
            headers=headers,
            status=403
        )
        self.assertIsNotNone(self.bob.key.get(use_cache=False))


class TestStudentListApi(TestCase):
    """Test for StudentApi request handler.

    """
    def setUp(self):
        super(TestStudentListApi, self).setUp()
        Student.new_student(
            'alice', 'alice smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)
        self.alice = self.new_user()

    def test_student_list_logged_off(self):
        headers = self.logoff()
        response = self.app.get(
            '%s/dashboard/students' % api.path, status=401, headers=headers
        ).json
        self.assertIn("error", response)

    def test_student_list_logged_as_user(self):
        headers = self.login(user=self.alice)
        response = self.app.get(
            '%s/dashboard/students' % api.path,
            headers=headers,
            status=403
        )
        self.assertIn("error", response.json)

    def test_student_list(self):
        """Should list students"""
        bob = self.new_user("Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        response = self.app.get(
            '%s/dashboard/students' % api.path, headers=headers
        ).json
        api.validate('StudentList', response)
        self.assertEqual(1, len(response['students']))

    def test_student_list_with_cursor(self):
        """Should list students using the cursor for a previous request

        """
        bob = self.new_user("Bob Smith", is_admin=True)
        headers = self.login(user=bob)

        response = self.app.get(
            '%s/dashboard/students' % api.path, headers=headers
        ).json

        # might be empty in production
        response = self.app.get(
            '%s/dashboard/students' % api.path,
            {'cursor': response.get('cursor')},
            headers=headers
        ).json
        api.validate('StudentList', response)
        self.assertEqual(response.get('students'), [])


class TestStudentApi(TestCase):
    """Test for StudentApi request handler.

    """

    def setUp(self):
        super(TestStudentApi, self).setUp()

        self.bob = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

    def test_delete_student(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        self.app.delete(
            '%s/dashboard/students/%s' % (api.path, self.bob.key.id()),
            headers=headers
        )
        self.assertIsNone(
            Student.get_by_id(self.bob.key.id(), use_cache=False)
        )

    def test_delete_student_logged_as_student(self):
        alice = self.new_user()
        headers = self.login(user=alice)
        self.app.delete(
            '%s/dashboard/students/%s' % (api.path, self.bob.key.id()),
            headers=headers,
            status=403
        )
        self.assertIsNotNone(
            Student.get_by_id(self.bob.key.id(), use_cache=False)
        )

    def test_delete_student_logged_off(self):
        headers = self.logoff()
        self.app.delete(
            '%s/dashboard/students/%s' % (api.path, self.bob.key.id()),
            headers=headers,
            status=401
        )
        self.assertIsNotNone(
            Student.get_by_id(self.bob.key.id(), use_cache=False)
        )


class TestStudentNameApi(TestCase):
    """Test for StudentNameApi request handler

    """

    def setUp(self):
        super(TestStudentNameApi, self).setUp()

        self.bob = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

    def test_new_name(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        self.app.put_json(
            '%s/dashboard/students/%s/name' % (api.path, self.bob.key.id()),
            {
                'givenName': 'Bobby',
                'familyName': 'Smith',
                'displayName': 'Bobby Smith'
            },
            headers=headers
        )
        bob = self.bob.key.get(use_cache=False)
        self.assertEqual('Bobby Smith', bob.data['displayName'])
        self.assertEqual(
            {
                'givenName': 'Bobby',
                'familyName': 'Smith',
            },
            bob.data['name']
        )

    def test_new_name_as_student(self):
        alice = self.new_user()
        headers = self.login(user=alice)
        self.app.put_json(
            '%s/dashboard/students/%s/name' % (api.path, self.bob.key.id()),
            {
                'givenName': 'Bobby',
                'familyName': 'Smith',
                'displayName': 'Bobby Smith'
            },
            headers=headers,
            status=403
        )
        bob = self.bob.key.get(use_cache=False)
        self.assertEqual('Bob Smith', bob.data['displayName'])
        self.assertEqual(
            {
                'givenName': 'Bob',
                'familyName': 'Smith',
            },
            bob.data['name']
        )

    def test_new_name_logged_off(self):
        headers = self.logoff()
        self.app.put_json(
            '%s/dashboard/students/%s/name' % (api.path, self.bob.key.id()),
            {
                'givenName': 'Bobby',
                'familyName': 'Smith',
                'displayName': 'Bobby Smith'
            },
            headers=headers,
            status=401
        )
        bob = self.bob.key.get(use_cache=False)
        self.assertEqual('Bob Smith', bob.data['displayName'])
        self.assertEqual(
            {
                'givenName': 'Bob',
                'familyName': 'Smith',
            },
            bob.data['name']
        )

    def test_new_name_fails(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        self.app.put_json(
            '%s/dashboard/students/%s/name' % (api.path, self.bob.key.id()),
            {
                'givenName': 'Bobby',
                'familyName': 'Smith',
            },
            headers=headers,
            status=400
        )
        bob = self.bob.key.get(use_cache=False)
        self.assertEqual('Bob Smith', bob.data['displayName'])
        self.assertEqual(
            {
                'givenName': 'Bob',
                'familyName': 'Smith',
            },
            bob.data['name']
        )


class TestStaffListApi(TestCase):
    """Test for StaffListApi request handler.

    """
    def setUp(self):
        super(TestStaffListApi, self).setUp()
        self.alice = self.new_user(is_staff=True)

    def test_staff_list_logged_off(self):
        headers = self.logoff()
        response = self.app.get(
            '%s/dashboard/staff' % api.path, status=401, headers=headers
        ).json
        self.assertIn("error", response)

    def test_staff_list_logged_as_student(self):
        bob = self.new_user(name="Bob Smith")
        headers = self.login(user=bob)
        response = self.app.get(
            '%s/dashboard/staff' % api.path, status=403, headers=headers
        ).json
        self.assertIn("error", response)

    def test_staff_list(self):
        """Should list staff"""
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        response = self.app.get(
            '%s/dashboard/staff' % api.path, headers=headers
        ).json
        api.validate('UserList', response)
        self.assertEqual(1, len(response['users']))

    def test_staff_list_with_cursor(self):
        """Should list staff using the cursor for a previous request

        """
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)

        response = self.app.get(
            '%s/dashboard/staff' % api.path, headers=headers
        ).json

        # might be empty in production
        self.assertTrue(response.get('cursor'))
        response = self.app.get(
            '%s/dashboard/staff' % api.path,
            {'cursor': response.get('cursor')},
            headers=headers
        ).json
        api.validate('UserList', response)
        self.assertEqual(0, len(response['users']))


class TestStaffApi(TestCase):
    """Tests for StaffApi request handler.

    """
    def setUp(self):
        super(TestStaffApi, self).setUp()
        self.alice = self.new_user()

    def test_make_staff(self):
        self.assertFalse(self.alice.is_staff)

        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        self.app.put(
            '%s/dashboard/staff/%s' % (api.path, self.alice.user_id(),),
            headers=headers
        )
        self.assertTrue(self.alice.key.get(use_cache=False).is_staff)

    def test_make_staff_logged_as_student(self):
        headers = self.login(user=self.alice)
        self.app.put(
            '%s/dashboard/staff/%s' % (api.path, self.alice.user_id(),),
            status=403,
            headers=headers
        )

    def test_make_staff_fails(self):
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        self.app.put(
            '%s/dashboard/staff/12345' % api.path,
            status=404,
            headers=headers
        )

    def test_make_staff__url_fails(self):
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        self.app.put(
            '%s/dashboard/staff/not-an-id' % api.path,
            status=404,
            headers=headers
        )


class TestStudentUploadUrlApi(TestCase):
    """Test for StudentUploadUrlApi request handler.

    """

    def test_post(self):
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        resp = self.app.post(
            '%s/dashboard/uploadurl/students' % api.path,
            headers=headers
        ).json
        api.validate('BlobStoreUploadInfo', resp)

    def test_post_as_student(self):
        bob = self.new_user()
        headers = self.login(user=bob)
        self.app.post(
            '%s/dashboard/uploadurl/students' % api.path,
            headers=headers,
            status=403
        )

    def test_post_as_staff(self):
        bob = self.new_user(is_staff=True)
        headers = self.login(user=bob)
        self.app.post(
            '%s/dashboard/uploadurl/students' % api.path,
            headers=headers
        )

    def test_post_logged_off(self):
        headers = self.logoff()
        self.app.post(
            '%s/dashboard/uploadurl/students' % api.path,
            headers=headers,
            status=401
        )


class TestPGYListApi(TestCase):

    def test_empty_list(self):
        headers = self.logoff()
        resp = self.app.get(
            '%s/dashboard/pgy' % api.path,
            headers=headers,
        ).json
        api.validate('PGYList', resp)
        self.assertEqual(0, len(resp['pgy']))

    def test_get_list(self):
        Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2016
        ).key.get(use_cache=False)
        Student.new_student(
            'alice', 'alice smith', email='a0002@example.com', year=2015
        ).key.get(use_cache=False)

        headers = self.logoff()
        resp = self.app.get(
            '%s/dashboard/pgy' % api.path,
            headers=headers,
        )
        api.validate('PGYList', resp.json)
        self.assertEqual(2, len(resp.json['pgy']))
        self.assertEqual('max-age=300, public', resp.headers['Cache-Control'])


class TestPGYApi(TestCase):

    def test_archive_year(self):
        Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2016
        ).key.get(use_cache=False)
        Student.new_student(
            'alice', 'alice smith', email='a0002@example.com', year=2015
        ).key.get(use_cache=False)

        bob = self.new_user(is_staff=True)
        headers = self.login(user=bob)
        self.app.delete(
            '%s/dashboard/pgy/2016' % api.path,
            headers=headers,
        )
        self.assertTrue(Student.get_by_id('A0002', use_cache=False).is_active)
        self.assertFalse(Student.get_by_id('A0001', use_cache=False).is_active)

    def test_archive_logged_off(self):
        headers = self.logoff()
        self.app.delete(
            '%s/dashboard/pgy/2016' % api.path,
            headers=headers,
            status=401
        )

    def test_archive_as_student(self):
        bob = self.new_user()
        headers = self.login(user=bob)
        self.app.delete(
            '%s/dashboard/pgy/2016' % api.path,
            headers=headers,
            status=403
        )

    def test_archive_as_admin(self):
        bob = self.new_user(is_admin=True)
        headers = self.login(user=bob)
        self.app.delete(
            '%s/dashboard/pgy/2016' % api.path,
            headers=headers,
            status=200
        )
