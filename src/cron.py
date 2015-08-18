import datetime
import logging
import random

import webapp2
from google.appengine.ext import ndb
from mapreduce import base_handler

from education.core.models import Student
from education.dashboard.services.roshreview import RoshReviewUserStats
from education.dashboard.services.firstaid import FirstAidActivity
from education.dashboard.services.firstaid import FirstAidUserStats
from education.tasks.roshreview import RoshReviewStatsUpdator
from education.tasks.firstaid import FirstAidTopicUpdater
from education.tasks.firstaid import FirstAidStatsUpdater


class CronSettings(ndb.Model):
    last_first_aid_update = ndb.DateProperty(
        default=datetime.date(2014, 10, 28)
    )

    @classmethod
    def get_settings(cls, app_name="dashboard"):
        return cls.get_or_insert(app_name)


class UpdateFirstAidTask(base_handler.PipelineBase):
    output_names = ['last_date']

    def run(self):
        start_date = CronSettings.get_settings().last_first_aid_update
        end_date = datetime.datetime.utcnow().date()
        self.fill(
            self.outputs.last_date,
            (end_date.year, end_date.month, end_date.day)
        )

        yield FirstAidTopicUpdater()
        yield FirstAidStatsUpdater(
            FirstAidStatsUpdater.date_to_str(start_date),
            FirstAidStatsUpdater.date_to_str(end_date)
        )

    def finalized(self):
        super(UpdateFirstAidTask, self).finalized()
        if not self.was_aborted:
            settings = CronSettings.get_settings()
            settings.last_first_aid_update = datetime.date(
                *self.outputs.last_date.value
            )
            settings.put()


class UpdateRoshReviewStats(webapp2.RequestHandler):

    template = (
        '<html>'
        '   <h1>Rosh review stats update</h1>'
        '   <p>In progress...</p>'
        '   <p><a href="%s/status?root=%s">Check status.</a></p>'
        '</html>'
    )

    def get(self):
        pipeline = RoshReviewStatsUpdator()
        pipeline.start()

        self.response.write(
            self.template % (pipeline.base_path, pipeline.pipeline_id,)
        )


class UpdateFirstAidStats(webapp2.RequestHandler):

    template = (
        '<html>'
        '   <h1>First aid stats update</h1>'
        '   <p>Topic and stats update in progress...</p>'
        '   <p><a href="%s/status?root=%s">Check status.</a></p>'
        '</html>'
    )

    def get(self):
        update = UpdateFirstAidTask()
        update.start()

        self.response.write(
            self.template % (update.base_path, update.pipeline_id,)
        )


class FakeStudents(webapp2.RequestHandler):

    def __init__(self, *args, **kw):
        super(FakeStudents, self).__init__(*args, **kw)
        self.rosh_review_topics = RoshReviewUserStats.get_topics()
        self.firstaid_topics = FirstAidUserStats.get_topics().map(
            lambda k: k.id(), keys_only=True
        )

    @property
    def random_rosh_review_topics(self):
        length = random.randint(
            len(self.rosh_review_topics)//2,
            len(self.rosh_review_topics)
        )
        return random.sample(self.rosh_review_topics, length)

    @property
    def random_firstaid_topics(self):
        length = random.randint(
            len(self.firstaid_topics) // 4,
            len(self.firstaid_topics)
        )
        return random.sample(self.firstaid_topics, length)

    @ndb.toplevel
    def get(self):
        students_data = [
            ('Clark Kent', 'a9999999@education.duke-nus.edu.sg', 2000),
            ('Diana Prince', 'a9999998@education.duke-nus.edu.sg', 2000),
        ]

        for data in students_data:
            student = self.add_student(data)
            self.add_roshreview_stats(student)
            self.add_firstaid_stats(student)

    @staticmethod
    def add_student(data):
        display_name, email, year = data
        given_name = display_name.split(' ', 1)[0]
        student = Student.new_student(
            given_name, display_name, email=email, year=year, commit=False
        )
        student.put_async()
        return student

    def add_roshreview_stats(self, student):
        perfs = {
            k: random.randint(40, 100) for k in self.random_rosh_review_topics
        }
        average = sum(perfs.itervalues()) / len(perfs)
        data = {
            "email": student.secondary_email,
            "training_level": "Student",
            "pgy": None,
            "category_performances": perfs,
            "cumulative_performance": average,
            "percentage_complete": random.randint(10, 100),
        }
        stats = RoshReviewUserStats.new_stats(student, data, commit=False)
        stats.put_async()
        t_stats = stats.update_topic_stats(commit=False)
        ndb.put_multi_async(t_stats)

    def add_firstaid_stats(self, student):
        keys = ndb.put_multi(list(self.add_firstaid_session_stats(student)))

        @ndb.toplevel
        def populate_cache(keys):
            for k in keys:
                k.get_async(use_cache=False)

        populate_cache(keys)
        stats = FirstAidUserStats.new_user_stats(student)
        ndb.put_multi_async(stats)

    def add_firstaid_session_stats(self, student):
        for topic_id in self.random_firstaid_topics:
            questions = random.randint(3, 20)
            correct = random.randint(0, questions)
            incorrect = random.randint(0, questions - correct)
            taken_test = random.randint(1, questions)
            str_date = '07-Nov-00'
            data = {
                'email': student.secondary_email,
                'category_id': str(topic_id),
                'cal_day_dt': str(str_date),
                'user_test_taken': str(taken_test),
                'user_questions': str(questions),
                'user_answered_correct': str(correct),
                'user_answered_incorrect': str(incorrect),
                'user_not_answered': str(questions - correct - incorrect),
                'user_predictive': str(random.randint(-310, 310)),
            }
            yield FirstAidActivity.new_activity(
                student.key.id(),
                topic_id,
                FirstAidActivity.cal_day_to_date(str_date),
                data,
                commit=False
            )


app = webapp2.WSGIApplication([
    ('/cron/roshreview', UpdateRoshReviewStats,),
    ('/cron/firstaid', UpdateFirstAidStats,),
    ('/cron/fakestudents', FakeStudents,),
], debug=True)
