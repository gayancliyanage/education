import json
import logging
import urllib

from google.appengine.api import urlfetch
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb

import education
from education import utils
from education.dashboard import services
from education.exceptions import ServiceRequestError
from education.exceptions import ServiceResponseError
from education.exceptions import ServiceAuthError


class RoshReviewUserStats(ndb.Model):
    """Save Rosh Review user stats.

    Can be used to query all stats of a users.

    """
    data = ndb.JsonProperty(required=True)
    last_updated_at = ndb.DateTimeProperty(auto_now=True)
    performance = ndb.ComputedProperty(
        lambda self: float(self.data.get('cumulativePerformance', 0.0))
    )
    percentage_complete = ndb.ComputedProperty(
        lambda self: float(self.data.get('percentageComplete', 0.0))
    )
    year = ndb.ComputedProperty(lambda self: self.data.get('year', 0.0))

    @property
    def student_id(self):
        return self.key.id()

    @property
    def display_name(self):
        return self.data.get('displayName', '')

    def details(self):
        props = (
            'displayName',
            'trainingLevel',
            'year',
            'percentageComplete',
            'categoryPerformances'
        )
        data = {k: v for k, v in self.data.iteritems() if k in props}
        data['id'] = data['studentId'] = self.student_id
        data['performance'] = self.performance
        data['categoryPerformances'] = sorted([
            {'id': k, 'label': k.title(), 'performance': v}
            for k, v in data.get('categoryPerformances', {}).iteritems()
        ], key=lambda p: (-p['performance'], p['label'],))
        return data

    def summary(self):
        data = self.details()
        data.pop('categoryPerformances', None)
        return data

    @classmethod
    def new_stats(cls, student, stats, commit=True):
        data = {utils.to_camel_case(k): v for k, v in stats.iteritems()}
        data['displayName'] = student.display_name
        data['year'] = student.year
        stats = cls(id=student.key.id(), data=data)
        if commit:
            stats.put()
        return stats

    def _pre_put_hook(self):
        self.validate(self.data)

    def update_topic_stats(self, commit=True):
        topics = self.data.get('categoryPerformances', {})
        topic_stats = []

        for top, perf in topics.iteritems():
            topic_stats.append(RoshReviewUserTopicStats.new_topic_stats(
                self, top, perf, commit=False
            ))

        if commit is True:
            ndb.put_multi(topic_stats)

        return topic_stats

    @staticmethod
    def validate(data):
        education.api.validate('RoshReviewUserStatsData', data)

    @classmethod
    def get_stats(
        cls,
        cursor_key=None,
        limit=None,
        year=None,
        topic=None,
        sort_by=None,
        **kw
    ):
        if topic:
            return RoshReviewUserTopicStats.get_stats(
                topic,
                cursor_key=cursor_key,
                limit=limit,
                year=year,
                **kw
            )

        limit = limit if limit else 20
        sort_by = sort_by if sort_by else 'performance'
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None

        q = cls.query()
        if year:
            q = q.filter(cls.year == year)
        q = q.order(-ndb.GenericProperty(sort_by))

        stats, cursor, _ = q.fetch_page(limit, start_cursor=cursor, **kw)
        return stats, (cursor.urlsafe() if cursor else None),

    @classmethod
    def get_topics(cls):
        return RoshReviewUserTopicStats.get_topics()


class RoshReviewUserTopicStats(ndb.Model):
    """Use to query the stats of user on a topic

    """
    topic = ndb.ComputedProperty(lambda self: self.key.id().split('/', 1)[1])
    display_name = ndb.StringProperty(required=True)
    performance = ndb.FloatProperty(required=True)
    year = ndb.IntegerProperty(required=True)
    last_updated_at = ndb.DateTimeProperty(auto_now=True)

    @property
    def student_id(self):
        return self.key.id().split('/', 1)[0]

    def summary(self):
        return {
            'id': self.student_id,
            'studentId': self.student_id,
            'topic': self.topic,
            'performance': self.performance,
            'displayName': self.display_name,
            'year': self.year,
        }

    @classmethod
    def new_topic_stats(cls, student, topic_id, performance, commit=True):
        stats_id = '%s/%s' % (student.key.id(), topic_id,)
        stats = cls(
            id=stats_id,
            performance=performance,
            display_name=student.display_name,
            year=student.year
        )
        if commit:
            stats.put()
        return stats

    @classmethod
    def get_topics(cls):
        topics = [
            s.topic for s in cls.query(projection=[cls.topic], distinct=True)
        ]
        return sorted(topics)

    @classmethod
    def get_stats(
        cls, topic, cursor_key=None, limit=None, year=None, **kw
    ):
        limit = limit if limit else 20
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None

        q = cls.query().filter(cls.topic == topic)
        if year:
            q = q.filter(cls.year == year)
        q = q.order(-cls.performance)

        stats, cursor, _ = q.fetch_page(limit, start_cursor=cursor, **kw)
        return stats, (cursor.urlsafe() if cursor else None),


class RoshReviewClient(object):

    def __init__(self):
        if services.config.ROSH_REVIEW_API_KEY is None:
            raise ValueError(
                'No Rosh Review API key set. An api key should have been set'
                'in appengine_config.py.'
            )

        self.base_url = (
            services.config.ROSH_REVIEW_API_URL_PATTERN
            % services.config.ROSH_REVIEW_API_KEY
        )

    def _url(self, user_emails):
        query = [('emails[]', e.lower(),) for e in user_emails]
        return self.base_url + urllib.urlencode(query), query

    @staticmethod
    def _error(query, resp):
        logging.error(
            (
                'Failed to get Rosh Review details (users: %s). '
                'Reason: %s (%s)'
            ),
            query,
            resp.content,
            resp.status_code
        )

        if resp.status_code >= 500:
            raise ServiceResponseError()
        elif resp.status_code in (401, 403,):
            raise ServiceAuthError()
        else:
            raise ServiceRequestError()

    def query_async(self, user_emails):
        url, query = self._url(user_emails)

        ctx = ndb.get_context()
        resp = yield ctx.urlfetch(url)
        if resp.status_code != 200:
            self._error(query, resp)

        try:
            stats = json.loads(resp.content)
        except ValueError:
            raise ServiceResponseError()
        else:
            raise ndb.Return(stats)

    def query(self, user_emails):
        url, query = self._url(user_emails)

        resp = urlfetch.fetch(url)
        if resp.status_code != 200:
            self._error(query, resp)

        try:
            stats = json.loads(resp.content)
        except ValueError:
            raise ServiceResponseError()
        else:
            return stats
