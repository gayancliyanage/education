"""Common models for all api branches

Defines:

- User: model for a logging user data, including its student or staff id.
- Students.
- Staff.


"""
import os
import logging
import re
from base64 import urlsafe_b64encode
from datetime import datetime
from datetime import timedelta

from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb
from google.appengine.api import images
from google.appengine.ext import blobstore

from education import api
from education.core import config
from education.core import googleapi
from education.exceptions import InvalidCredentialsError
from education.exceptions import InvalidCredentialsDomainError


class SecretKeys(ndb.Model):
    secret = ndb.BlobProperty(required=True)

    @classmethod
    def get_key(cls, name, entropy=128):
        ent = cls.get_by_id(name)
        if not ent:
            ent = cls.get_or_insert(name, secret=os.urandom(entropy))
        return urlsafe_b64encode(ent.secret)


class Student(ndb.Model):
    """Model for student entity.

    Used to store list of student with their year and the email they use
    to register with 3rd party sites

    """
    data = ndb.JsonProperty(required=True)
    display_name = ndb.ComputedProperty(
        lambda self: self.data.get('displayName')
    )
    names = ndb.ComputedProperty(lambda self: self._names(), repeated=True)
    year = ndb.ComputedProperty(lambda self: self.data.get('year', 0))
    portrait = ndb.BlobKeyProperty()
    is_active = ndb.BooleanProperty(default=True)
    is_setup = ndb.ComputedProperty(lambda self: self._is_setup())

    def user_async(self):
        return User.by_student_id_async(self.key.id())

    def _is_setup(self):
        return (
            self.data.get('year', 0) > 0
            and self.secondary_email is not None
        )

    def _names(self):
        names = [
            self.data.get('displayName'),
            self.data.get('name', {}).get('givenName'),
            self.data.get('name', {}).get('familyName'),
        ]
        return [n.lower() for n in names if n]

    @property
    def secondary_email(self):
        return self.data.get('secondaryEmail')

    def get_image(self):
        if self.portrait:
            return {
                'url': images.get_serving_url(self.portrait, secure_url=True)
            }

    def details(self):
        data = self.data.copy()
        data['isActive'] = self.is_active
        data['isSetup'] = self.is_setup
        data['studentId'] = self.key.id()

        return data

    def summary(self):
        data = self.details()
        data.pop('secondaryEmail')
        return data

    @classmethod
    def new_student(
        cls,
        given_name,
        display_name,
        family_name=None,
        email=None,
        student_id=None,
        year=None,
        commit=True
    ):
        if family_name is None:
            name = cls.display_name_to_dict(display_name, given_name)
        else:
            name = {
                'givenName': given_name,
                'familyName': family_name
            }

        data = {
            'displayName': display_name.title(),
            'name': name,
        }

        if email:
            data['secondaryEmail'] = email.lower()

        if student_id is None:
            student_id = User.email_to_student_id(email)

        if student_id is None:
            raise TypeError('A student requires a student ID')

        if year:
            data['year'] = year

        student = cls.get_by_id(student_id)
        if student:
            student.data.update(data)
        else:
            student = cls(id=student_id, data=data)

        if commit:
            student.put()
        return student

    def fix(self):
        if self.portrait:
            self.data['image'] = self.get_image()

    def _pre_put_hook(self):
        self.validate(self.data)

    @staticmethod
    def validate(data):
        api.validate('StudentData', data)

    @staticmethod
    def display_name_to_dict(display_name, given_name):
        given_name = given_name.title()
        display_name = display_name.title()
        parts = display_name.split(' ')
        if parts[0] == given_name:
            family_name = ' '.join(parts[1:])
        elif parts[-1] == given_name:
            family_name = ' '.join(parts[:-1])
        else:
            family_name = display_name
        return {'givenName': given_name, 'familyName': family_name}

    @classmethod
    @ndb.transactional(xg=True)
    def add_photo(cls, student_id, blob_info):
        student = cls.get_by_id(student_id)
        if student is None:
            return None

        if student.portrait:
            student._remove_portrait()

        student.portrait = blob_info.key()
        student.data['image'] = student.get_image()
        student.put()
        return student

    def _remove_portrait(self):
        images.delete_serving_url(self.portrait)
        blobstore.delete(self.portrait)
        self.portrait = None

    @classmethod
    @ndb.transactional
    def edit_name(cls, student_id, name):
        student = cls.get_by_id(student_id)
        if student is None:
            return
        student.data['displayName'] = name.pop('displayName', None)
        student.data['name'] = name
        student.put()
        return student

    @classmethod
    @ndb.transactional
    def edit_email(cls, student_id, email):
        student = cls.get_by_id(student_id)
        if student is None:
            return
        student.data['secondaryEmail'] = email.pop('secondaryEmail', None)
        student.put()
        return student

    @classmethod
    @ndb.transactional
    def edit_year(cls, student_id, email):
        student = cls.get_by_id(student_id)
        if student is None:
            return
        student.data['year'] = email.pop('year', 0)
        student.put()
        return student

    @classmethod
    def get_students(
        cls, cursor_key=None, limit=None, name=None, years=[], **kw
    ):
        limit = 20 if limit is None else limit

        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None
        q = cls.query()

        if name:
            q = q.filter(cls.names >= name)
            q = q.filter(cls.names < '%s{' % name)

        if years:
            q = q.filter(cls.year.IN(years))
        else:
            q = q.filter(cls.is_active == True)

        if name:
            q = q.order(cls.names, cls.year)
        elif years:
            q = q.order(cls.year, cls.display_name, cls.key)
        else:
            q = q.order(cls.year, cls.display_name)

        if name or limit == 0:
            limit = limit if limit else None
            students, cursor = q.fetch(limit, **kw), None
        else:
            students, cursor, _ = q.fetch_page(
                limit, start_cursor=cursor, **kw
            )

        return (
            [s.details() for s in students],
            (cursor.urlsafe() if cursor else None),
        )

    @classmethod
    def get_pgys(cls):
        return cls.query(projection=[cls.year, cls.is_active], distinct=True)

    @classmethod
    def archive_student(cls, year):
        @ndb.tasklet
        def archive(student):
            student.is_active = False
            key = yield student.put_async()
            raise ndb.Return(key)

        is_active = True
        return cls.query().filter(
            cls.year == year,
            cls.is_active == is_active
        ).map(archive)


class User(ndb.Model):
    """Model for user's entities.

    """
    # A staff needs to be registered on the domain and be flagged
    # as staff.
    is_staff = ndb.BooleanProperty(default=False)
    # A admin needs to be registered on the domain and be flagged
    # as admin or be a domain_admin.
    is_admin = ndb.BooleanProperty(default=False)

    created_at = ndb.DateTimeProperty(auto_now_add=True)
    last_update_at = ndb.DateTimeProperty(auto_now=True)

    data = ndb.JsonProperty(default={})
    student_id = ndb.ComputedProperty(lambda self: self.get_student_id())
    display_name = ndb.ComputedProperty(
        lambda self: self.data.get('displayName')
    )
    is_domain_admin = ndb.ComputedProperty(
        lambda self: self.data.get('isDomainAdmin')
    )

    def user_id(self):
        return str(self.key.id())

    def email(self):
        return self.data.get('primaryEmail')

    def domain(self):
        return self.data.get('domain', '')

    def get_student_id(self):
        return self.email_to_student_id(self.data.get('primaryEmail', ''))

    _student_id_patter = re.compile(r'^A\d+$')

    @classmethod
    def email_to_student_id(cls, email):
        if not email:
            return
        student_id = email.split('@')[0].upper()
        return student_id if cls._student_id_patter.match(student_id) else None

    def details(self):
        data = self.data.copy()
        data['id'] = str(self.key.id())
        data['isStaff'] = self.is_staff
        data['isAdmin'] = self.is_admin or self.is_domain_admin
        if self.student_id:
            data['studentId'] = self.student_id
        return data

    def summary(self):
        data = self.details()
        data.pop('primaryEmail')
        return data

    def needs_update(self):
        return (
            self.last_update_at < (datetime.utcnow() - timedelta(days=1))
            or self.data.get('domain', '') not in config.VALID_DOMAINS
        )

    @classmethod
    @ndb.transactional(xg=True)
    def update_or_create(
        cls,
        user_id,
        user_domain,
        sa_credentials,
        user_credentials
    ):
        if not user_credentials or not user_id or not sa_credentials:
            logging.info('Credentials are missing')
            raise InvalidCredentialsError()

        if user_domain is None or user_domain not in sa_credentials:
            logging.info('%s is not a valid domain')
            raise InvalidCredentialsDomainError()

        user = cls.get_by_id(user_id)
        if user and not user.needs_update():
            return

        if user is None:
            user = cls(id=str(user_id))

        data = cls.fetch_data(
            user.key.id(), user_credentials, user_domain, sa_credentials
        )
        user.update_data(*data)
        user.put()

    def update_data(self, data, domain_data, primary_email):
        self.data = {}
        self._update_user_data(data, primary_email)
        self._update_user_data_from_domain(domain_data)
        self._fix_permission()

    @staticmethod
    def fetch_data(user_id, user_credentials, domain, sa_credentials):

        user_data, primary_email = googleapi.get_user_data(
            user_id, user_credentials
        )

        user_domain_data = googleapi.get_domain_user_data(
            user_id, primary_email, domain, sa_credentials
        )

        return user_data, user_domain_data, primary_email

    def _update_user_data(self, user_data, primary_email):
        for k in ('displayName', 'image', 'domain', 'name',):
            if k in user_data:
                self.data[k] = user_data[k]

        self.data['primaryEmail'] = primary_email
        self.data['isDomainAdmin'] = False

    def _update_user_data_from_domain(self, domain_user_data):
        if domain_user_data is None:
            return

        for k in (
            'primaryEmail',
            'name',
            'isDelegatedAdmin',
            'orgUnitPath',
        ):
            self.data[k] = domain_user_data[k]

        self.data['isDomainAdmin'] = domain_user_data.get('isAdmin', False)

    @ndb.tasklet
    def _fix_permission_async(self):
        if self.data.get('domain', '') not in config.VALID_DOMAINS:
            try:
                yield self.key.delete_async()
            except Exception:
                pass
            raise InvalidCredentialsDomainError()

        student_id = self.email_to_student_id(
            self.data.get('primaryEmail', '')
        )

        if student_id is None:
            raise ndb.Return()

        student = yield Student.get_by_id_async(student_id)
        if student:
            self.data['year'] = student.year
            if 'image' in student.data:
                self.data['image'] = student.data['image']
        else:
            student = Student.new_student(
                self.data.get('name', {}).get('givenName'),
                self.display_name,
                family_name=self.data.get('name', {}).get('familyName'),
                student_id=student_id,
                commit=False
            )
            yield student.put_async()

    def _fix_permission(self):
        return self._fix_permission_async().get_result()

    def _pre_put_hook(self):
        self.validate(self.data)

    @staticmethod
    def validate(data):
        """Validate student data schema.

        """
        api.validate("UserData", data)

    @classmethod
    def get_by_id(self, user_id, *args, **kw):
        return super(User, self).get_by_id(str(user_id))

    @classmethod
    def by_student_id_async(cls, student_id):
        if not student_id:
            return
        return cls.query().filter(cls.student_id == student_id).get_async()

    @classmethod
    def by_student_id(cls, student_id):
        return cls.by_student_id_async(student_id).get_result()

    @classmethod
    def get_users(cls, cursor_key, limit=20, **kw):
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None
        q = cls.query().order(cls.display_name)
        users, cursor, _ = q.fetch_page(limit, start_cursor=cursor, **kw)
        return users, (cursor.urlsafe() if cursor else None),

    @classmethod
    def get_students(cls, cursor_key, limit=20, **kw):
        return cls.get_users(cursor_key, limit=limit, **kw)

    @classmethod
    def get_staff(cls, cursor_key, limit=20, **kw):
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None
        is_staff = True
        q = cls.query().filter(cls.is_staff == is_staff)
        q = q.order(cls.display_name)
        staff, cursor, _ = q.fetch_page(limit, start_cursor=cursor, **kw)
        return staff, (cursor.urlsafe() if cursor else None),

    @classmethod
    @ndb.transactional
    def make_staff(cls, user_id):
        user = cls.get_by_id(user_id)
        if user is None:
            return
        user.is_staff = True
        user.put()

    @classmethod
    @ndb.transactional
    def revoke_staff(cls, user_id):
        user = cls.get_by_id(user_id)
        if user is None:
            return
        user.is_staff = False
        user.put()

    @classmethod
    @ndb.transactional
    def make_admin(cls, user_id):
        user = cls.get_by_id(user_id)
        if user is None:
            return
        user.is_admin = True
        user.put()

    @classmethod
    @ndb.transactional
    def revoke_admin(cls, user_id):
        user = cls.get_by_id(user_id)
        if user is None or user.is_domain_admin:
            return
        user.is_admin = False
        user.put()
