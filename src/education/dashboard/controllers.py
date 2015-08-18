import datetime
import json
# import logging
import urllib

import webapp2
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from jsonschema import ValidationError
from webapp2ext import swagger

from education import api
from education.core.models import User
from education.core.models import Student
from education.core.utils import ApiRequestHandler
from education.core.utils import SessionMixin
from education.dashboard import config
from education.dashboard import models
from education.dashboard.services.roshreview import RoshReviewUserStats
from education.dashboard.services.firstaid import FirstAidUserStats


resource = api.resource(
    path="/documents",
    desc="Operations about current user's documents"
)


class RepositoryDocumentListApi(ApiRequestHandler):
    """Handle Document listing requests

    """
    path = resource.endpoint('/dashboard/repository/<studentId>/files')

    @path.operation(
        type_="DocumentList",
        alias="getRepositoryByStudentId",
        parameters=[
            swagger.String(
                name="cursor",
                description="Cursor to query the next page",
                param_type="query"
            ),
            swagger.String(
                name="studentId",
                param_type="path",
                description="Id of student details to edit",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(400, "Bad Request"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self, studentId):
        """List all the files at destination to a specific student

        """
        student = Student.get_by_id(studentId)
        if not student:
            self.abort(404)

        current_user = self.login_required()
        if (
            not current_user.is_staff
            and not current_user.is_admin
            and not current_user.is_domain_admin
            and current_user.student_id != student.key.id()
        ):
            self.abort(403)
            return

        cursor_key = self.request.GET.get('cursor')

        # using cheap request and ndb entities cache
        file_keys, cursor, _ = models.Document.get_files(
            student.key, cursor_key, keys_only=True
        )
        ffiles = [k.get_async() for k in file_keys]

        self.render_json({
            'files': map(
                self.file_dict,
                [ff.get_result() for ff in ffiles]
            ),
            'cursor': cursor.urlsafe() if cursor else ''
        })

    def file_dict(self, file_):
        data = file_.summary()
        data['url'] = self.uri_for(
            'dashboard_download_file',
            keyId=file_.key.id()
        )
        return data


class RepositoryDocumentApi(ApiRequestHandler):
    """Handle requests on a document

    """

    path = resource.endpoint(
        '/dashboard/repository/<studentId>/files/<fileId>'
    )

    @path.operation(
        type_="DocumentList",
        alias="deleteDocument",
        parameters=[
            swagger.String(
                name="studentId",
                param_type="path",
                description="Id of student details to edit",
                required=True
            ),
            swagger.String(
                name="fileId",
                param_type="path",
                description="Id of the document to delete",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found")
        ]
    )
    def delete(self, studentId, fileId):
        """Delete a document.

        """
        self.admin_required()

        student = Student.get_by_id(studentId)
        document = models.Document.get_by_id(fileId)
        if (
            not student
            or not document
            or document.dest_ref.id() != student.key.id()
        ):
            self.abort(404)

        document.delete()
        self.render_json({'success': True})


class UploadUrlHandler(ApiRequestHandler):
    path = resource.endpoint('/dashboard/uploadurl/repository/<studentId>')

    @path.operation(
        type_='BlobStoreUploadInfo',
        alias='newUploadUrl',
        parameters=[
            swagger.String(
                name="studentId",
                param_type="path",
                description="Id of student details to edit",
                required=True
            )
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden")
        ]
    )
    def post(self, studentId):
        """Create a new blobstore upload url.

        The student id is currently not used with this implementation.
        The student id should be sent with uploaded file.

        """
        self.staff_required()
        self.render_json({
            "url": blobstore.create_upload_url(config.UPLOAD_CB_URL)
        })


class HandlerMixin(SessionMixin):

    def render_json(self, data, status_code=200):
        self.response.status = status_code
        self.response.headers['Content-Type'] = "application/json"
        self.response.out.write(json.dumps(data))


class UploadHandler(blobstore_handlers.BlobstoreUploadHandler, HandlerMixin):
    """Handle the call sent by the blobstore after a successful upload.

    """

    def post(self):
        self.set_session_store()
        self.response.headers['Content-Type'] = "application/json"

        sender_id = self.current_user_id()
        sender = User.get_by_id(sender_id) if sender_id else None
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
        dest_student_id = self.request.POST.get('destId')
        name = self.request.POST.get('name', blob_info.filename)
        doc_type = self.request.POST.get('docType')

        if not dest_student_id:
            self.render_json(
                {"error": 'No recipent was given.'},
                400
            )
            return

        if not doc_type:
            self.render_json(
                {"error": 'A document should have a type.'},
                400
            )
            return

        try:
            new_file = models.Document.new_file(
                dest_student_id, blob_info, doc_type, sender, name
            )
        except (ValueError, ValidationError,), e:
            self.render_json(
                {"error": "Failed to safe new file (%s)." % str(e)},
                400
            )
            return
        else:
            data = new_file.summary()
            data['url'] = webapp2.uri_for(
                'dashboard_download_file',
                keyId=new_file.key.id()
            )
            self.render_json(data)


class DownloadHandler(
    blobstore_handlers.BlobstoreDownloadHandler, HandlerMixin
):
    """Handle file download"""

    def get(self, keyId):
        self.set_session_store()

        keyId = str(urllib.unquote(keyId))

        viewer_id = self.current_user_id()
        viewer = User.get_by_id(viewer_id) if viewer_id else None
        if not viewer:
            self.error(401)
            return

        doc = models.Document.get_by_id(keyId)
        if (
            not viewer.is_staff
            and not viewer.is_admin
            and not viewer.is_domain_admin
            and viewer.student_id != doc.dest_ref.id()
        ):
            self.error(403)

        blob_info = blobstore.BlobInfo.get(keyId)
        if blob_info.filename.endswith('.pdf'):
            self.send_blob(blob_info, content_type='application/pdf')
        else:
            self.send_blob(blob_info)

assessment_resource = api.resource(
    path="/assessments",
    desc="Operations about users' exams"
)


class AssessmentExamListApi(ApiRequestHandler):
    """Handle operations on the exam lists

    """
    path = assessment_resource.endpoint('/dashboard/assessments/exams')

    @path.operation(
        type_='AssessmentExamList',
        alias='listExams',
        parameters=[
            swagger.String(
                name="studentId",
                description="Id of student details to list exam for",
                param_type="query"
            ),
            swagger.String(
                name="cursor",
                description="Cursor to query the next page",
                param_type="query"
            ),
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self):
        """Return a list exams.

        """
        student_id = self.request.GET.get('studentId')
        if student_id:
            self._get_exams_by_student_id(student_id)
        else:
            self._get_exams()

    def _get_exams(self):
        self.staff_required()

        exams = models.AssessmentExam.get_exams()
        self.render_json({
            'cursor': '',
            'exams': [e.summary() for e in exams],
        })

    def _get_exams_by_student_id(self, student_id):
        student = Student.get_by_id(student_id)
        if not student:
            self.abort(404, 'User not found')

        current_user = self.login_required()
        if (
            not current_user.is_staff
            and not current_user.is_admin
            and not current_user.is_domain_admin
            and student.key.id() != current_user.student_id
        ):
            self.abort(403)

        exams = models.AssessmentExam.get_by_student_id(student.key.id())
        self.render_json({
            'cursor': '',
            'exams': [e.summary() for e in exams],
            'student': student.summary()
        })


class AssessmentUploadUrlHandler(ApiRequestHandler):
    path = assessment_resource.endpoint('/dashboard/uploadurl/assessments')

    @path.operation(
        type_='BlobStoreUploadInfo',
        alias='newExamUploadUrl',
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden")
        ]
    )
    def post(self):
        """Create a new blobstore upload url.

        """
        self.admin_required()
        self.render_json({
            "url": blobstore.create_upload_url(config.UPLOAD_EXAM_URL)
        })


class AssessmentUploadHandler(
    blobstore_handlers.BlobstoreUploadHandler, HandlerMixin
):
    """Handle the call sent by the blobstore after a successful upload.

    """

    def post(self):
        self.set_session_store()
        self.response.headers['Content-Type'] = "application/json"

        sender_id = self.current_user_id()
        sender = User.get_by_id(sender_id) if sender_id else None
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
        name = self.request.POST.get('name', blob_info.filename)

        exam = models.AssessmentExam.new_exam(name, blob_info.key())
        self.render_json(exam.summary())


class AssessmentExamApi(ApiRequestHandler):
    """Handle request for an exam resource

    """
    path = assessment_resource.endpoint(
        '/dashboard/assessments/exams/<examId:\d+>'
    )

    @path.operation(
        type_='AssessmentExam',
        alias='getExamDetails',
        parameters=[
            swagger.String(
                name="examId",
                description="Id of exam to show details for",
                param_type="path",
                required=True
            ),
        ],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self, examId):
        """Retrieve detailed informations about an exam

        """
        self.staff_required()

        exam = models.AssessmentExam.get_by_id(int(examId))
        if exam is None:
            self.abort(404)
        self.render_json(exam.details())


roshreview_resource = api.resource(
    path="/roshreview",
    desc="Operations about Rosh Review Stats"
)


class RoshReviewStatsApi(ApiRequestHandler):
    """Handle request for Rosh Review stats listing.

    """

    path = roshreview_resource.endpoint('/dashboard/roshreview/stats')

    @path.operation(
        type_='RoshReviewUserStatsList',
        alias='listRoshReviewStats',
        # TODO: add filters
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
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self):
        """List student stats.

        """
        self.staff_required()
        cursor_key = self.request.GET.get('cursor')
        topic = self.request.GET.get('topic')
        sort_by = self.request.GET.get('sortBy')
        if topic == 'all':
            topic = None

        sort_by_options = {
            'performance': 'performance',
            'percentageComplete': 'percentage_complete'
        }
        sort_by = sort_by_options.get(sort_by)

        try:
            limit = int(self.request.GET.get('limit'))
        except (ValueError, TypeError,):
            limit = None

        try:
            residents = self.request.GET.get('residents')
            if residents == 'all':
                residents = None
            else:
                residents = int(residents)
        except (ValueError, TypeError,):
            residents = None

        stats, cursor = RoshReviewUserStats.get_stats(
            cursor_key=cursor_key,
            limit=limit,
            year=residents,
            topic=topic,
            sort_by=sort_by
        )
        self.render_json({
            'stats': [s.summary() for s in stats],
            'cursor': cursor if cursor else ''
        })


class RoshReviewUserStatsApi(ApiRequestHandler):
    """Handle request for a student Rosh Review stats.

    """

    path = roshreview_resource.endpoint(
        '/dashboard/roshreview/stats/<studentId>'
    )

    @path.operation(
        type_='RoshReviewUserStats',
        alias='getRoshReviewStats',
        # TODO: add filters
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self, studentId):
        """Get the detailed stats for a student.

        """
        student_id = studentId.upper()
        current_user = self.login_required()
        if current_user.student_id != student_id:
            self.staff_required()

        stats = RoshReviewUserStats.get_by_id(student_id)
        if stats is None:
            self.abort(404)
        details = stats.details()
        today = datetime.date.today()

        details['history'] = [
            {
                'performance': 0,
                'date': (today - datetime.timedelta(days=i)).isoformat()
            } for i in reversed(range(183))
        ]
        self.render_json(details)


class TopicListApi(ApiRequestHandler):
    """Handle request of PGY list resource

    """
    path = roshreview_resource.endpoint('/dashboard/roshreview/topic')

    @path.operation(
        type_="TopicList",
        alias="listReviewTopics",
        parameters=[],
        responses=[swagger.Message(200, "Ok")]
    )
    def get(self):
        """Return the list of PGY.

        """
        self.response.cache_control = 'public'
        self.response.cache_control.max_age = 300
        self.render_json({
            "type": "topics",
            "topics": [{
                "id": topic,
                "label": topic.title()
            } for topic in RoshReviewUserStats.get_topics()]
        })


firstaid_resource = api.resource(
    path="/firstaid",
    desc="Operations about Rosh Review Stats"
)


class FirstAidStatsApi(ApiRequestHandler):
    """Handle request for First Aid stats listing.

    """

    path = firstaid_resource.endpoint('/dashboard/firstaid/stats')

    @path.operation(
        type_='FirstAidUserStatsList',
        alias='listFirstAidStats',
        # TODO: add filters
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
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self):
        """List student stats.

        """
        self.staff_required()
        cursor_key = self.request.GET.get('cursor')
        topic_id = self.request.GET.get('topic')
        sort_by = self.request.GET.get('sortBy')

        if topic_id == 'all':
            topic_id = None

        sort_by_options = {
            'performance': 'performance',
            'questionTaken': 'question_taken'
        }
        sort_by = sort_by_options.get(sort_by, 'performance')

        try:
            limit = int(self.request.GET.get('limit'))
        except (ValueError, TypeError,):
            limit = None

        try:
            residents = self.request.GET.get('residents')
            if residents == 'all':
                residents = None
            else:
                residents = int(residents)
        except (ValueError, TypeError,):
            residents = None

        stats, cursor = FirstAidUserStats.get_stats(
            cursor_key=cursor_key,
            limit=limit,
            year=residents,
            topic_id=topic_id,
            sort_by=sort_by
        )
        self.render_json({
            'stats': [s.summary() for s in stats],
            'cursor': cursor if cursor else ''
        })


class FirstAidUserStatsApi(ApiRequestHandler):
    """Handle request for a student First Aid stats.

    """

    path = firstaid_resource.endpoint(
        '/dashboard/firstaid/stats/<studentId>'
    )

    @path.operation(
        type_='FirstAidUserStats',
        alias='getFirstAidUserStats',
        # TODO: add filters
        parameters=[],
        responses=[
            swagger.Message(200, "Ok"),
            swagger.Message(401, "Unauthorized"),
            swagger.Message(403, "Forbidden"),
            swagger.Message(404, "Not Found")
        ]
    )
    def get(self, studentId):
        """Get the detailed stats for a student.

        """
        student_id = studentId.upper()
        current_user = self.login_required()
        if current_user.student_id != student_id:
            self.staff_required()

        stats = FirstAidUserStats.get_by_id(student_id)
        if stats is None:
            self.abort(404)
        details = stats.details()
        today = datetime.date.today()

        details['history'] = [
            {
                'predictiveSum': 0,
                'date': (today - datetime.timedelta(days=i)).isoformat()
            } for i in reversed(range(183))
        ]
        self.render_json(details)


class FirstAidTopicListApi(ApiRequestHandler):
    """Handle request on Topic list resource

    """
    path = firstaid_resource.endpoint('/dashboard/firstaid/topics')

    @path.operation(
        type_="TopicList",
        alias="listFirstAidTopics",
        parameters=[],
        responses=[swagger.Message(200, "Ok")]
    )
    def get(self):
        """Return the list of topic.

        """
        self.response.cache_control = 'public'
        self.response.cache_control.max_age = 300
        self.render_json({
            "type": "topics",
            "topics": [t.summary() for t in FirstAidUserStats.get_topics()]
        })
