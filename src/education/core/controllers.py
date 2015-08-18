"""Main Html handlers

Demo file upload and encryption.

"""

import datetime
import urllib
import json
import logging

from google.appengine.api import memcache
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from jsonschema import ValidationError
from webapp2ext import swagger

from education import api
from education.core import config
from education.core import models
from education.core import utils
from education.core.utils import ApiRequestHandler
from education.core.utils import SessionMixin
from education.tasks.students import ProcessNewStudent


class CurrentUserApi(ApiRequestHandler):
    """Handler request on user login status

    """
    resource = api.resource(
        path="/user",
        desc="Operations about current user authentication"
    )
    path = resource.endpoint('/dashboard/user')

    @path.operation(
        type_="User",
        alias="isloggedIn",
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
        ]
    )
    def get(self):
        """Return the user info if logged in or the url to login
        if the user is logged off.

        TODO: get and use user info instead of user nickname

        """
        user = self.get_current_user()
        return_url = self.request.GET.get(
            'returnUrl', config.DEFAULT_RETURN_URL
        )
        return_url = urllib.unquote(return_url)

        signed_return_url = utils.sign_return_url(
            return_url, self.session_id()
        )

        login_url = '%s?state=%s' % (
            config.LOGIN_URL, signed_return_url,
        )
        logout_url = '%s?state=%s' % (
            config.LOGOUT_URL, signed_return_url,
        )

        if not user:
            self.render_json(
                {
                    'isStudent': False,
                    'isStaff': False,
                    'isAdmin': False,
                    'isLoggedIn': False,
                    'loginUrl': login_url,
                }
            )
            return

        resp = user.details()
        resp['isLoggedIn'] = True
        resp['loginUrl'] = login_url
        resp['logoutUrl'] = logout_url

        self.render_json(resp)


student_resource = api.resource(
    '/users', desc="Resource related to users"
)


class UserListApi(ApiRequestHandler):
    """Handle user list resource.

    """
    path = student_resource.endpoint("/dashboard/users")

    @path.operation(
        type_="UserList",
        alias="listUsers",
        parameters=[
            swagger.String(
                name="cursor",
                description="Cursor to query the next page",
                param_type="query"
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
        ]
    )
    def get(self):
        """List all Users (20 per page).

        The current user must be logged in as staff to see
        the list of users.

        """
        self.staff_required()

        cursor_key = self.request.GET.get('cursor')
        users, cursor = models.User.get_users(cursor_key)
        return self.render_json({
            'type': 'users',
            'users': [s.summary() for s in users],
            'cursor': cursor if cursor else ''
        })


class UserApi(ApiRequestHandler):
    """Handler requests for a specific user.

    """
    path = student_resource.endpoint("/dashboard/users/<userId>")

    @path.operation(
        type_="User",
        alias="deleteUser",
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(400, "Bad Request"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def delete(self, userId):
        """Delete a user.

        Note that it doesn't prevent a user from registering again.

        """
        current_user = self.admin_required()
        if current_user.key.id() == userId:
            self.abort(400)

        user = models.User.get_by_id(userId)
        if user is None:
            self.abort(404)

        user.key.delete()
        self.render_json({})


student_resource = api.resource(
    '/students', desc="Resource related to student"
)


class StudentListApi(ApiRequestHandler):
    """Handle student list resource.

    """
    path = student_resource.endpoint("/dashboard/students")

    @path.operation(
        type_="StudentList",
        alias="listStudents",
        parameters=[
            swagger.String(
                name="cursor",
                description="Cursor to query the next page",
                param_type="query"
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
        ]
    )
    def get(self):
        """List all students (20 per page).

        The current user must be logged in as an app admin to see
        the list of student.

        """
        self.staff_required()

        cursor_key = self.request.GET.get('cursor')
        limit = self.request.GET.get('limit')
        name = self.request.GET.get('name', '')
        raw_years = self.request.GET.getall('years')

        if limit is not None:
            try:
                limit = int(limit)
            except (ValueError, TypeError):
                limit = None

        years = []
        for y in raw_years:
            try:
                years.append(int(y))
            except (ValueError, TypeError,):
                pass

        props = {
            "limit": limit,
            "name": name.lower(),
            "years": years,
            "cursor_key": cursor_key
        }

        if limit is 0:
            students = self.get_list()
            cursor = None
        else:
            students, cursor = models.Student.get_students(**props)

        return self.render_json({
            'type': 'students',
            'students': students,
            'cursor': cursor if cursor else ''
        })

    cache_ttl = 60*60

    @staticmethod
    def cache_key():
        return 'OEPSTUDENT_STUDENT_LIST'

    @classmethod
    def get_list(cls, **kw):
        key = cls.cache_key()
        cache = memcache.get(key)
        if cache is not None:
            return cache

        students, _ = models.Student.get_students(cursor_key=None, limit=0)
        memcache.set(key, students, time=cls.cache_ttl)

        return students

    @classmethod
    def reset_list_cache(cls):
        memcache.delete(cls.cache_key())

    @path.operation(
        type_="Student",
        alias="newStudent",
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(400, "Bad Request"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
        ]
    )
    def post(self):
        """Create a new Student

        """
        self.admin_required()
        try:
            payload = json.loads(self.request.body)
            student = models.Student.new_student(
                payload['name']['givenName'],
                payload['displayName'],
                family_name=payload['name']['familyName'],
                email=payload['secondaryEmail'],
                student_id=payload['studentId'],
                year=payload['year']
            )
        except (ValidationError, ValueError, AttributeError, KeyError):
            self.abort(400)

        return self.render_json(student.details())


class StudentApi(ApiRequestHandler):
    """Handle request for a specific student.

    """
    path = student_resource.endpoint(
        "/dashboard/students/<studentId>"
    )

    @path.operation(
        type_="Student",
        alias="getStudent",
        parameters=[
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def get(self, studentId):
        """Return the student details.

        """
        self.staff_required()
        student = models.Student.get_by_id(studentId)
        if student is None:
            self.abort(404)

        self.render_json(student.details())

    @path.operation(
        type_="Student",
        alias="deleteStudent",
        parameters=[
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def delete(self, studentId):
        """Delete a student.

        """
        self.staff_required()

        student = models.Student.get_by_id(studentId)
        if student is None:
            self.abort(404)

        student.key.delete()
        StudentListApi.reset_list_cache()
        self.render_json({})


class StudentNameApi(ApiRequestHandler):
    """Handle request for a specific student.

    """
    path = student_resource.endpoint(
        "/dashboard/students/<studentId>/<propName>"
    )

    @path.operation(
        type_="Student",
        alias="saveStudentName",
        parameters=[
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def put(self, studentId, propName):
        """Save student name.

        """
        self.staff_required()
        methods = {
            'name': models.Student.edit_name,
            'email': models.Student.edit_email,
            'year': models.Student.edit_year,
        }

        if propName not in methods:
            self.abort(404)

        try:
            payload = json.loads(self.request.body)
            student = methods[propName](studentId, payload)
        except (ValidationError, ValueError, AttributeError,):
            self.abort(400)

        if student is None:
            self.abort(404)

        StudentListApi.reset_list_cache()
        self.render_json({})


staff_resource = api.resource(
    '/staff', desc="Resource related to staff"
)


class StaffListApi(ApiRequestHandler):
    """Handle staff list resource.

    """
    path = staff_resource.endpoint("/dashboard/staff")

    @path.operation(
        type_="UserList",
        alias="listStaffs",
        parameters=[
            swagger.String(
                name="cursor",
                description="Cursor to query the next page",
                param_type="query"
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
        ]
    )
    def get(self):
        """List all staff (20 per page).

        The current user must be logged in as an app admin or a staff
        member to see the list of staff.

        """
        self.admin_required()

        cursor_key = self.request.GET.get('cursor')
        staff, cursor = models.User.get_staff(cursor_key)
        return self.render_json({
            'type': 'users',
            'users': [s.summary() for s in staff],
            'cursor': cursor if cursor else ''
        })


class StaffApi(ApiRequestHandler):
    """Handle request on a Staff user

    """
    path = staff_resource.endpoint("/dashboard/staff/<userId:\d+>")

    @path.operation(
        type_="User",
        alias="makeStaff",
        parameters=[
            swagger.String(
                name="userId",
                param_type="path",
                description="Id of user to make staff",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def put(self, userId):
        """Flag a user as an staff.

        """
        self.admin_required()
        user_id = int(userId)
        user = models.User.get_by_id(user_id)

        if user is None:
            self.abort(404)

        models.User.make_staff(user_id)
        self.render_json({})

    @path.operation(
        type_="User",
        alias="revokeStaff",
        parameters=[
            swagger.String(
                name="userId",
                param_type="path",
                description="Id of user to revoke staff permission from",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def delete(self, userId):
        """Remove staff flag from a user.

        """
        self.admin_required()
        user_id = int(userId)
        user = models.User.get_by_id(user_id)

        if user is None:
            self.abort(404)

        models.User.revoke_staff(user_id)
        self.render_json({})


admin_resource = api.resource(
    '/admins', desc="Resource related to admin"
)


class AdminApi(ApiRequestHandler):
    """Handle request on a admin user

    """
    path = admin_resource.endpoint("/dashboard/admin/<userId:\d+>")

    @path.operation(
        type_="User",
        alias="makeAdmin",
        parameters=[
            swagger.String(
                name="userId",
                param_type="path",
                description="Id of user to make admin",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def put(self, userId):
        """Flag a user as an staff.

        """
        self.admin_required()
        user_id = int(userId)
        user = models.User.get_by_id(user_id)

        if user is None:
            self.abort(404)

        models.User.make_admin(user_id)
        self.render_json({})

    @path.operation(
        type_="User",
        alias="revokeAdmin",
        parameters=[
            swagger.String(
                name="userId",
                param_type="path",
                description="Id of user to revoke admin permission from",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found"),
        ]
    )
    def delete(self, userId):
        """Remove staff flag from a user.

        """
        self.admin_required()
        user_id = int(userId)
        user = models.User.get_by_id(user_id)

        if user is None:
            self.abort(404)

        if user.is_domain_admin:
            self.abort(400)

        models.User.revoke_admin(user_id)
        self.render_json({})


class StudentUploadUrlApi(ApiRequestHandler):
    path = student_resource.endpoint('/dashboard/uploadurl/students')

    @path.operation(
        type_='BlobStoreUploadInfo',
        alias='newStudentUploadUrl',
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden")
        ]
    )
    def post(self):
        """Create a new blobstore upload url for a student list.

        """
        self.staff_required()
        self.render_json({
            "url": blobstore.create_upload_url(config.UPLOAD_CB_URL)
        })


class StudentUploadResultApi(ApiRequestHandler):
    path = student_resource.endpoint('/dashboard/uploadjob/students/<jobId>')

    @path.operation(
        type_='JobResult',
        alias='getJobStatus',
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden")
        ]
    )
    def post(self, jobId):
        """Create a new blobstore upload url for a student list.

        """
        self.staff_required()
        pipeline = ProcessNewStudent.from_id(jobId)
        if pipeline is None:
            self.abort(404)

        self.render_json({
            'id': jobId,
            'completed': pipeline.has_finalized()
        })


class StudentsUploadHandler(
    blobstore_handlers.BlobstoreUploadHandler, SessionMixin
):
    """Handle the call sent by the blobstore after a successful upload.

    """

    def post(self):
        self.set_session_store()
        self.response.headers['Content-Type'] = "application/json"

        sender_id = self.current_user_id()
        sender = models.User.get_by_id(sender_id) if sender_id else None
        if not sender:
            self.render_json(
                {"error": "you need to be logged in to upload files."},
                401
            )
            return

        if (
            not sender.is_staff
            and not sender.is_admin
            and not sender.is_domain_admin
        ):
            self.render_json(
                {"error": "Only admin and staff can upload files."},
                403
            )
            return

        upload_files = self.get_uploads('file')
        blob_info = upload_files[0]
        year = self.request.POST.get('year')

        if not year:
            self.render_json(
                {"error": 'No year given.'},
                400
            )
            return

        try:
            year = int(year)
            if year < 2015 or year > datetime.date.today().year + 10:
                raise ValueError()
        except ValueError:
            self.render_json(
                {"error": 'invalid year.'},
                400
            )
            return

        pipeline = ProcessNewStudent(str(blob_info.key()), year=year)
        pipeline.start()
        self.render_json({'id': pipeline.pipeline_id, 'completed': False})

    def render_json(self, data, status_code=200):
        self.response.status = status_code
        self.response.headers['Content-Type'] = "application/json"
        self.response.out.write(json.dumps(data))


pgy_resource = api.resource(
    path="/pgy",
    desc="Operations about PGY (student year) list"
)


class PGYListApi(ApiRequestHandler):
    """Handle request of PGY list resource

    """
    path = pgy_resource.endpoint('/dashboard/pgy')

    @path.operation(
        type_="PGYList",
        alias="listPgy",
        parameters=[],
        responses=[swagger.Message(200, "Ok")]
    )
    def get(self):
        """Return the list of PGY.

        """
        self.response.cache_control = 'public'
        self.response.cache_control.max_age = 300
        self.render_json({
            "pgy": [{
                "id": year.year,
                "label": "Year %s" % year.year,
                "isActive": year.is_active
            } for year in models.Student.get_pgys()]
        })


class PGYApi(ApiRequestHandler):
    """Handle request on a specific year.

    """
    path = pgy_resource.endpoint('/dashboard/pgy/<year:\d+>')

    def delete(self, year):
        """Archive students of a specific year

        """
        self.staff_required()
        models.Student.archive_student(int(year))
        StudentListApi.reset_list_cache()
        self.render_json({})


class StudentProfileUploadUrlApi(ApiRequestHandler):
    path = student_resource.endpoint('/dashboard/uploadurl/studentsprofile')

    @path.operation(
        type_='BlobStoreUploadInfo',
        alias='newStudentUploadUrl',
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden")
        ]
    )
    def post(self):
        """Create a new blobstore upload url for a student list.

        """
        self.admin_required()
        self.render_json({
            "url": blobstore.create_upload_url(config.PHOTO_CB_URL)
        })


class StudentProfileUploadHandler(
    blobstore_handlers.BlobstoreUploadHandler, SessionMixin
):
    """Handle the call sent by the blobstore after a successful upload.

    """

    def post(self):
        self.set_session_store()
        self.response.headers['Content-Type'] = "application/json"

        sender_id = self.current_user_id()
        sender = models.User.get_by_id(sender_id) if sender_id else None
        if not sender:
            self.render_json(
                {"error": "you need to be logged in to upload files."},
                401
            )
            return

        if not sender.is_admin and not sender.is_domain_admin:
            self.render_json(
                {"error": "Only admin and staff can upload files."},
                403
            )
            return

        upload_files = self.get_uploads('file')
        blob_info = upload_files[0]

        student_id = self.request.POST.get('studentId')
        if student_id is None:
            self.render_json({"error": "student id is missing."}, 400)
            return

        student = models.Student.add_photo(student_id, blob_info)
        if student is None:
            self.render_json({"error": "student not found."}, 400)
        else:
            StudentListApi.reset_list_cache()
            self.render_json(student.summary().get('image'))

    def render_json(self, data, status_code=200):
        self.response.status = status_code
        self.response.headers['Content-Type'] = "application/json"
        self.response.out.write(json.dumps(data))
