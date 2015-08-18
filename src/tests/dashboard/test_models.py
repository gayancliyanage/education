"""Test for education.dashboard.models


"""
import datetime
import io
import json

from google.appengine.api import files
from google.appengine.api import memcache
from google.appengine.ext import ndb

from education.core.models import Student
from education.exceptions import ServiceRequestError
from education.exceptions import ServiceResponseError
from education.exceptions import ServiceAuthError
from education.dashboard import models
from education.dashboard import services
from education.dashboard.services import firstaid
from education.dashboard.services import roshreview
from education.dashboard.services.firstaid import FirstAidActivity
from education.dashboard.services.firstaid import FirstAidApiClient
from education.dashboard.services.firstaid import FirstAidUserStats
from education.dashboard.services.firstaid import FirstAidUserTopicStats
from tests.utils import TestCase


class TestAssessmentExam(TestCase):

    @staticmethod
    def get_csv_blob(data):
        file_name = files.blobstore.create(mime_type='text/csv')
        with files.open(file_name, 'a') as f:
            f.write(data)
        files.finalize(file_name)
        return files.blobstore.get_blob_key(file_name)

    def test_new_exam(self):
        blob_key = self.get_csv_blob(
            u",Q123,Q124,Q125,Q126\n"
            u"A0000001@NUS.EDU.SG,1,1,1,1\n"
            u"A0000002@NUS.EDU.SG,1,0,0,1"
        )
        exam = models.AssessmentExam.new_exam(
            'foo', blob_key
        )
        self.empty_task_queue()

        exam = exam.key.get(use_cache=False)
        self.assertTrue(exam.processed)

        for s_id, m in (('A0000001', 1.0), ('A0000002', 0.5),):
            result = models.AssessmentStudentExam.get_by_id(
                '%s/%s' % (exam.key.id(), s_id,)
            )
            self.assertIsNotNone(result)
            self.assertEqual(4, len(result.data['questions']))
            self.assertEqual(0.5, result.data['stats']['all']['min'])
            self.assertEqual(0.75, result.data['stats']['all']['mean'])
            self.assertEqual(1.0, result.data['stats']['all']['max'])
            self.assertEqual(m, result.data['stats']['all']['user'])

    def test_process_data(self):
        self.maxDiff = None
        src = io.StringIO(
            u",Q123,Q124,Q125,Q126\n"
            u"A0000001@NUS.EDU.SG,1,1,1,1\n"
            u"A0000002@NUS.EDU.SG,1,0,0,1"
        )
        data, student_results = models.AssessmentExam.process_data(src)
        models.AssessmentExam.validate(data)
        self.assertEqual(4, len(data['questions']))
        self.assertEqual(0.5, data['stats']['all']['min'])
        self.assertEqual(0.75, data['stats']['all']['mean'])
        self.assertEqual(1.0, data['stats']['all']['max'])
        self.assertEqual(
            ['A0000001', 'A0000002'],
            [r['studentId'] for r in student_results]
        )


class TestRoshReviewUserStats(TestCase):

    def setUp(self):
        super(TestRoshReviewUserStats, self).setUp()

        services.config.ROSH_REVIEW_API_URL_PATTERN = (
            'http://example.com/%s/subscriber_details?'
        )
        services.config.ROSH_REVIEW_API_KEY = 'api-key'

        self.student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

    def test_new_stats(self):
        stats = roshreview.RoshReviewUserStats.new_stats(
            self.student,
            {
                "email": "a0001@example.com",
                "training_level": "Resident",
                "pgy": -5,
                "percentage_complete": 0,
                "cumulative_performance": 0,
                "category_performances": {}
            }
        )
        self.assertEqual('A0001', stats.key.id())
        self.assertEqual(2015, stats.data['year'])

    def test_update_topic_stats(self):
        stats = roshreview.RoshReviewUserStats.new_stats(
            self.student,
            {
                "email": "a0001@example.com",
                "training_level": "Resident",
                "pgy": -5,
                "percentage_complete": 10,
                "cumulative_performance": 50,
                "category_performances": {
                    "FOO": 50
                }
            }
        )
        topic_stats = stats.update_topic_stats(commit=False)
        self.assertEqual(1, len(topic_stats))
        self.assertEqual('A0001', topic_stats[0].student_id)
        self.assertEqual('FOO', topic_stats[0].topic)
        self.assertEqual('Bob Smith', topic_stats[0].display_name)
        self.assertEqual(50, topic_stats[0].performance)


class TestRoshReviewUserTopicStats(TestCase):

    def setUp(self):
        super(TestRoshReviewUserTopicStats, self).setUp()
        self.student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

    def test_new_stats(self):
        stats = roshreview.RoshReviewUserTopicStats.new_topic_stats(
            self.student, 'FOO', 50.0
        )
        self.assertEqual('A0001', stats.student_id)
        self.assertEqual('FOO', stats.topic)
        self.assertEqual('Bob Smith', stats.display_name)
        self.assertEqual(50, stats.performance)

    def test_summary(self):
        stats = roshreview.RoshReviewUserTopicStats.new_topic_stats(
            self.student, 'FOO', 50.0
        )
        self.assertEqual(
            {
                'id': 'A0001',
                'studentId': 'A0001',
                'topic': 'FOO',
                'performance': 50.0,
                'displayName': 'Bob Smith',
                'year': 2015
            },
            stats.summary()
        )

    def test_get_stats(self):
        roshreview.RoshReviewUserTopicStats.new_topic_stats(
            self.student, 'FOO', 50.0
        ).key.get(use_cache=False)

        stats = list(roshreview.RoshReviewUserTopicStats.get_stats('FOO')[0])
        self.assertEqual(1, len(stats))

    def test_get_no_stats(self):
        roshreview.RoshReviewUserTopicStats.new_topic_stats(
            self.student, 'FOO', 50.0
        ).key.get(use_cache=False)

        stats = list(roshreview.RoshReviewUserTopicStats.get_stats('BAR')[0])
        self.assertEqual(0, len(stats))


class SessionMixin(object):

    @staticmethod
    def session(date, user_id, student_id, topic_id, prediction=200):
        return {
            "date_key": "615",
            "cal_day_dt": date.strftime('%d-%b-%y'),
            "fsc_month_num": str(date.month),
            "cal_year_str": date.strftime('%y'),
            "user_id": str(user_id),
            "first_name": "Bob",
            "last_name": "Smith",
            "email": "%s@NUS.EDU.SG" % student_id,
            "school_key": "1",
            "med_school": "One NUS",
            "category_id": str(topic_id),
            "category_code": "Bcm",
            "category_name": "Biochemistry",
            "category_type": "Disciplines",
            "step": "1",
            "user_test_taken": "1",
            "user_questions": "3",
            "user_answered_correct": "1",
            "user_answered_incorrect": "1",
            "user_not_answered": "1",
            "user_performance": "33",
            "user_predictive": str(prediction)
        }


class TestFirstAidActivity(TestCase, SessionMixin):

    def test_new_activity_from_data(self):
        day = datetime.date(2014, 9, 7)
        session = self.session(day, 1, 'A0001', '13')
        self.assertEqual('07-Sep-14', session['cal_day_dt'])

        activity = FirstAidActivity.from_data(session)
        self.assertEqual('A0001', activity.student_id)
        self.assertEqual('13', activity.topic_id)
        self.assertEqual(day, activity.day.date())

    def test_new_activity_same_session(self):
        sess1 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        sess2 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        self.assertEqual(
            FirstAidActivity.from_data(sess1).key.id(),
            FirstAidActivity.from_data(sess2).key.id()
        )

    def test_new_activity_with_different_dates(self):
        sess1 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        sess2 = self.session(datetime.date(2014, 9, 2), 1, 'A0001', '13')
        self.assertNotEqual(
            FirstAidActivity.from_data(sess1).key.id(),
            FirstAidActivity.from_data(sess2).key.id()
        )

    def test_new_activity_with_different_student(self):
        sess1 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        sess2 = self.session(datetime.date(2014, 9, 7), 2, 'A0002', '13')
        self.assertNotEqual(
            FirstAidActivity.from_data(sess1).key.id(),
            FirstAidActivity.from_data(sess2).key.id()
        )

    def test_new_activity_with_different_topic(self):
        sess1 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        sess2 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '14')
        self.assertNotEqual(
            FirstAidActivity.from_data(sess1).key.id(),
            FirstAidActivity.from_data(sess2).key.id()
        )


class TestFirstAidUserTopicStats(TestCase, SessionMixin):

    def setUp(self):
        super(TestFirstAidUserTopicStats, self).setUp()
        self.student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

    def test_new_user_stats(self):
        sess1 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        sess2 = self.session(datetime.date(2014, 9, 2), 1, 'A0001', '13')
        sess3 = self.session(datetime.date(2014, 9, 2), 1, 'A0001', '14')

        stats = FirstAidUserTopicStats.new_user_topic_stats(self.student, '13')
        stats.append(sess1)
        self.assertEqual(3, stats.question_taken)
        self.assertEqual(33, stats.performance)
        stats.append(sess2)
        self.assertEqual(6, stats.question_taken)
        self.assertEqual(33, stats.performance)
        stats.append(sess3)
        self.assertEqual(6, stats.question_taken)
        self.assertEqual(33, stats.performance)
        stats.put()  # Should not raise ValidationError


class TestFirstAidUserStats(TestCase, SessionMixin):

    def setUp(self):
        super(TestFirstAidUserStats, self).setUp()
        self.student = Student.new_student(
            'bob', 'bob smith', email='a0001@example.com', year=2015
        ).key.get(use_cache=False)

    def test_create(self):
        sess1 = self.session(datetime.date(2014, 9, 7), 1, 'A0001', '13')
        sess2 = self.session(datetime.date(2014, 9, 2), 1, 'A0001', '13')
        sess3 = self.session(datetime.date(2014, 9, 2), 1, 'A0001', '14')
        for s in (sess1, sess2, sess3,):
            FirstAidActivity.from_data(s).key.get(use_cache=False)

        stats = list(FirstAidUserStats.new_user_stats(self.student))
        self.assertEqual(3, len(stats))
        topic_stats = {s.topic_id: s for s in stats[:-1]}

        self.assertIn('13', topic_stats)
        self.assertEqual(6, topic_stats['13'].question_taken)
        self.assertEqual(33, topic_stats['13'].performance)

        self.assertIn('14', topic_stats)
        self.assertEqual(3, topic_stats['14'].question_taken)
        self.assertEqual(33, topic_stats['14'].performance)

        user_stats = stats[-1]
        self.assertEqual(9, user_stats.question_taken)
        self.assertEqual(33, user_stats.performance)

        ndb.put_multi(stats)


class TestFirstAidApiClient(TestCase):

    def setUp(self):
        super(TestFirstAidApiClient, self).setUp()

        services.config.FIRST_AID_AUTH_ID = '1234'
        services.config.FIRST_AID_AUTH_PW = 'password'
        services.config.FIRST_AID_AUTH_URL_PATTERN = (
            'https://api.usmle-rx.com/v1/user/%s/login'
        )
        services.config.FIRST_AID_REPORT_URL_PATTERN = (
            'https://api.usmle-rx.com/v1/report/123/execute?%s'
        )

        self.client = FirstAidApiClient()

    def test_auth_pw(self):
        self.assertEqual('password', self.client.auth_pw)

    def test_cached_auth_cookie(self):
        memcache.set(firstaid.MEMCACHE_SESSION_KEY, 'foo')
        self.assertEqual('foo', self.client.auth_cookie)
        self.assertEqual('foo', self.client.auth_cookie)

    def test_fresh_auth_cookie(self):
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234/login',
            content=json.dumps({'sid': 'abc'}),
            headers={
                'Set-Cookie': 'sid=abc'
            }
        )
        self.assertEqual('sid=abc', self.client.auth_cookie)
        self.assertEqual('sid=abc', self.client.auth_cookie)
        self.assertEqual(1, len(self.url_fetcher.calls))

    def test_reset_cookie(self):
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234/login',
            content=json.dumps({'sid': 'abc'}),
            headers={
                'Set-Cookie': 'sid=abc'
            }
        )
        self.assertEqual('sid=abc', self.client.auth_cookie)
        self.client.reset_cookie()
        self.assertEqual('sid=abc', self.client.auth_cookie)
        self.assertEqual(2, len(self.url_fetcher.calls))

    def test_fetch(self):
        memcache.set(firstaid.MEMCACHE_SESSION_KEY, 'foo')
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234',
            content=json.dumps({'id': '1234', 'name': 'Bob Smith'})
        )
        resp = self.client.fetch('https://api.usmle-rx.com/v1/user/1234')
        self.assertEqual({'id': '1234', 'name': 'Bob Smith'}, resp)

        url, headers = self.url_fetcher.calls[0]
        self.assertEqual([('Cookie', 'foo')], headers)

    def test_fetch_400(self):
        memcache.set(firstaid.MEMCACHE_SESSION_KEY, 'foo')
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234',
            content=json.dumps({}),
            status_code=400,
        )
        self.assertRaises(
            ServiceRequestError,
            self.client.fetch,
            'https://api.usmle-rx.com/v1/user/1234'
        )

    def test_fetch_500(self):
        memcache.set(firstaid.MEMCACHE_SESSION_KEY, 'foo')
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234',
            content=json.dumps({}),
            status_code=500,
        )
        self.assertRaises(
            ServiceResponseError,
            self.client.fetch,
            'https://api.usmle-rx.com/v1/user/1234'
        )

    def test_fetch_401(self):
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234/login',
            content=json.dumps({'sid': 'abc'}),
            headers={
                'Set-Cookie': 'sid=abc'
            }
        )
        self.url_fetcher.set_return_values(
            'https://api.usmle-rx.com/v1/user/1234',
            content=json.dumps({}),
            status_code=401,
        )
        self.assertRaises(
            ServiceAuthError,
            self.client.fetch,
            'https://api.usmle-rx.com/v1/user/1234'
        )
        self.assertEqual(4, len(self.url_fetcher.calls))
