"""Tests for education.dashboard.controllers

"""
from google.appengine.api import files
from google.appengine.ext.blobstore import BlobInfo

from education import api
from education.core.models import Student
from education.dashboard import models
from education.dashboard.services import roshreview
from education.dashboard.services import firstaid
from tests.utils import TestCase


class TestRepositoryDocumentApi(TestCase):
    """Tests for RepositoryDocumentApi request handler

    """

    def setUp(self):
        super(TestRepositoryDocumentApi, self).setUp()

        self.admin = self.new_user(is_admin=True)
        self.student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

        file_name = files.blobstore.create(mime_type='text/plain')
        with files.open(file_name, 'a') as f:
            f.write('test')
        files.finalize(file_name)
        blob_key = files.blobstore.get_blob_key(file_name)

        self.document = models.Document.new_file(
            self.student.key.id(),
            BlobInfo.get(blob_key),
            'SHELF',
            sender=self.admin,
            name='test'
        ).key.get(use_cache=False)

    def test_delete_document(self):
        headers = self.login(user=self.admin)
        self.app.delete(
            (
                '%s/dashboard/repository/%s/files/%s'
                % (api.path, self.student.key.id(), self.document.key.id())
            ),
            headers=headers
        )
        self.assertIsNone(self.document.key.get(use_cache=False))

    def test_delete_document_logged_off(self):
        headers = self.logoff()
        self.app.delete(
            (
                '%s/dashboard/repository/%s/files/%s'
                % (api.path, self.student.key.id(), self.document.key.id())
            ),
            headers=headers,
            status=401
        )
        self.assertIsNotNone(self.document.key.get(use_cache=False))

    def test_delete_document_as_student(self):
        headers = self.login(user=self.new_user())
        self.app.delete(
            (
                '%s/dashboard/repository/%s/files/%s'
                % (api.path, self.student.key.id(), self.document.key.id())
            ),
            headers=headers,
            status=403
        )
        self.assertIsNotNone(self.document.key.get(use_cache=False))

    def test_delete_document_as_staff(self):
        headers = self.login(user=self.new_user(is_staff=True))
        self.app.delete(
            (
                '%s/dashboard/repository/%s/files/%s'
                % (api.path, self.student.key.id(), self.document.key.id())
            ),
            headers=headers,
            status=403
        )
        self.assertIsNotNone(self.document.key.get(use_cache=False))


class TestAssessmentExamListApi(TestCase):
    """Tests for AssessmentExamListApi

    """
    def setUp(self):
        super(TestAssessmentExamListApi, self).setUp()
        Student.new_student(
            'alice', 'alice smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)
        self.alice = self.new_user(student_id='A0001')

    def add_exam(self):
        data = (
            u",Q123,Q124,Q125,Q126\n"
            u"%s@NUS.EDU.SG,1,1,1,1" % self.alice.student_id
        )

        file_name = files.blobstore.create(mime_type='text/csv')
        with files.open(file_name, 'a') as f:
            f.write(data)
        files.finalize(file_name)
        source = files.blobstore.get_blob_key(file_name)

        exam = models.AssessmentExam.new_exam('foo', source)
        self.empty_task_queue()

        exam.key.get(use_cache=False)
        models.AssessmentStudentExam.get_by_id(
            '%s/%s' % (exam.key.id(), self.alice.student_id,),
            use_cache=False
        )

    def test_get_exams_logged_as_staff(self):
        self.add_exam()
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        resp = self.app.get(
            '%s/dashboard/assessments/exams' % api.path,
            headers=headers
        ).json
        api.validate('AssessmentExamList', resp)
        self.assertEqual(1, len(resp['exams']))

    def test_get_exams_logged_off(self):
        headers = self.logoff()
        self.app.get(
            '%s/dashboard/assessments/exams' % api.path,
            status=401,
            headers=headers
        ).json

    def test_get_exams_logged_as_student(self):
        bob = self.new_user(name="Bob Smith")
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams' % api.path,
            status=403,
            headers=headers
        ).json

    def test_get_exams_logged_as_admin(self):
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams' % api.path,
            headers=headers
        ).json

    def test_get_user_exams_logged_as_owner(self):
        self.add_exam()
        headers = self.login(user=self.alice)
        resp = self.app.get(
            '%s/dashboard/assessments/exams?studentId=%s' % (
                api.path, self.alice.student_id,
            ),
            headers=headers
        ).json
        api.validate('AssessmentExamList', resp)
        self.assertEqual(1, len(resp['exams']))

    def test_get_user_exams_not_found(self):
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams?studentId=12345' % api.path,
            status=404,
            headers=headers
        ).json

    def test_get_user_exams_fails(self):
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams?studentId=one' % api.path,
            status=404,  # 400 might be better
            headers=headers
        ).json

    def test_get_user_exams_logged_as_student(self):
        bob = self.new_user(name="Bob Smith")
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams?studentId=%s' % (
                api.path, self.alice.student_id,
            ),
            status=403,
            headers=headers
        ).json

    def test_get_user_exams_logged_as_staff(self):
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams?studentId=%s' % (
                api.path, self.alice.student_id,
            ),
            headers=headers
        ).json

    def test_get_user_exams_logged_as_admin(self):
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams?studentId=%s' % (
                api.path, self.alice.student_id,
            ),
            headers=headers
        ).json

    def test_get_user_exams_logged_off(self):
        headers = self.logoff()
        self.app.get(
            '%s/dashboard/assessments/exams?studentId=%s' % (
                api.path, self.alice.student_id,
            ),
            status=401,
            headers=headers
        ).json


class TestAssessmentExamApi(TestCase):
    """Tests for AssessmentExamApi

    """

    def setUp(self):
        super(TestAssessmentExamApi, self).setUp()
        Student.new_student(
            'alice', 'alice smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)
        self.alice = self.new_user(student_id='A0001')

    def add_exam(self):
        data = (
            u",Q123,Q124,Q125,Q126\n"
            u"%s@NUS.EDU.SG,1,1,1,1" % self.alice.student_id
        )

        file_name = files.blobstore.create(mime_type='text/csv')
        with files.open(file_name, 'a') as f:
            f.write(data)
        files.finalize(file_name)
        source = files.blobstore.get_blob_key(file_name)

        exam = models.AssessmentExam.new_exam('foo', source)
        self.empty_task_queue()

        print models.AssessmentStudentExam.get_by_id(
            '%s/%s' % (exam.key.id(), self.alice.student_id,),
            use_cache=False
        )
        return exam.key.get(use_cache=False)

    def test_get_exam(self):
        exam = self.add_exam()
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        resp = self.app.get(
            '%s/dashboard/assessments/exams/%s' % (
                api.path, exam.key.id(),
            ),
            headers=headers
        ).json
        api.validate('AssessmentExam', resp)
        self.assertIn('studentResults', resp)
        self.assertEqual(1, len(resp['studentResults']))

    def test_get_exam_as_admin(self):
        exam = self.add_exam()
        bob = self.new_user(name="Bob Smith", is_admin=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams/%s' % (
                api.path, exam.key.id(),
            ),
            headers=headers
        ).json

    def test_exam_not_found(self):
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams/12345' % api.path,
            status=404,
            headers=headers
        ).json

    def test_invalid_exam_id(self):
        bob = self.new_user(name="Bob Smith", is_staff=True)
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams/one' % api.path,
            status=404,  # 400 might be better
            headers=headers
        )

    def test_get_exam_as_student(self):
        bob = self.new_user(name="Bob Smith", )
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/assessments/exams/12345' % api.path,
            status=403,
            headers=headers
        )

    def test_get_exam_logged_off(self):
        headers = self.logoff()
        self.app.get(
            '%s/dashboard/assessments/exams/12345' % api.path,
            status=401,
            headers=headers
        ).json


class TestRoshReviewStatsApi(TestCase):

    def test_list_stats(self):
        student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)
        roshreview.RoshReviewUserStats.new_stats(
            student,
            {
                "email": "a0001@nus.edu.sg",
                "training_level": "Resident",
                "pgy": -5,
                "percentage_complete": 0,
                "cumulative_performance": 0,
                "category_performances": {}
            }
        ).key.get(use_cache=False)

        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)

        resp = self.app.get(
            '%s/dashboard/roshreview/stats' % api.path,
            headers=headers
        ).json
        api.validate('RoshReviewUserStatsList', resp)
        self.assertEqual(1, len(resp['stats']))
        self.assertEqual(0, resp['stats'][0]['performance'])

    def test_list_stats_logged_off(self):
        headers = self.logoff()
        self.app.get(
            '%s/dashboard/roshreview/stats' % api.path,
            headers=headers,
            status=401
        )

    def test_list_stats_logged_as_student(self):
        alice = self.new_user()
        headers = self.login(user=alice)
        self.app.get(
            '%s/dashboard/roshreview/stats' % api.path,
            headers=headers,
            status=403
        )

    def test_list_stats_logged_as_admin(self):
        alice = self.new_user(is_admin=True)
        headers = self.login(user=alice)
        self.app.get(
            '%s/dashboard/roshreview/stats' % api.path,
            headers=headers
        )


class TestRoshReviewUserStatsApi(TestCase):

    def setUp(self):
        super(TestRoshReviewUserStatsApi, self).setUp()

        student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)
        roshreview.RoshReviewUserStats.new_stats(
            student,
            {
                "email": "a0001@nus.edu.sg",
                "training_level": "Resident",
                "pgy": -5,
                "percentage_complete": 0,
                "cumulative_performance": 0,
                "category_performances": {
                    "FOO": 0
                }
            }
        ).key.get(use_cache=False)

    def test_get_stats(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        resp = self.app.get(
            '%s/dashboard/roshreview/stats/A0001' % api.path,
            headers=headers
        ).json
        api.validate('RoshReviewUserStats', resp)

    def test_get_stats_logged_off(self):
        headers = self.logoff()
        self.app.get(
            '%s/dashboard/roshreview/stats/A0001' % api.path,
            status=401,
            headers=headers
        )

    def test_get_stats_as_owner(self):
        bob = self.new_user(student_id='A0001')
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/roshreview/stats/A0001' % api.path,
            headers=headers
        )

    def test_get_stats_as_other_student(self):
        bob = self.new_user(student_id='A0002')
        headers = self.login(user=bob)
        self.app.get(
            '%s/dashboard/roshreview/stats/A0001' % api.path,
            status=403,
            headers=headers
        )

    def test_get_stats_as_admin(self):
        alice = self.new_user(is_admin=True)
        headers = self.login(user=alice)
        self.app.get(
            '%s/dashboard/roshreview/stats/A0001' % api.path,
            status=200,
            headers=headers
        )

    def test_stats_not_found(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        self.app.get(
            '%s/dashboard/roshreview/stats/A0002' % api.path,
            status=404,
            headers=headers
        )


class TestFirstAidTopicListApi(TestCase):

    def test_get_empty_list(self):
        resp = self.app.get(
            '%s/dashboard/firstaid/topics' % api.path,
            status=200
        ).json
        api.validate('TopicList', resp)

    def test_get_list(self):
        firstaid.FirstAidActivityTopic.new_topic({
            "code": "OBG",
            "id": 28,
            "name": "OB/GYN",
            "order": 28,
            "step": 2,
            "synonyms": [""],
            "type": "Disciplines"
        }).key.get(use_cache=False)

        resp = self.app.get(
            '%s/dashboard/firstaid/topics' % api.path,
            status=200
        ).json
        api.validate('TopicList', resp)
        self.assertEqual(1, len(resp['topics']))


class TestFirstAidStatsApi(TestCase):

    def test_get_empty_stats_list(self):
        alice = self.new_user(is_staff=True)
        headers = self.login(user=alice)
        resp = self.app.get(
            '%s/dashboard/firstaid/stats' % api.path,
            headers=headers
        ).json
        api.validate('FirstAidUserStatsList', resp)
