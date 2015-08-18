import datetime
import json
import logging
import Cookie

# import jsonschema
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb

import education
from education.core.models import User
from education.dashboard import services
from education.exceptions import ServiceAuthError
from education.exceptions import ServiceResponseError
from education.exceptions import ServiceRequestError

MEMCACHE_SESSION_KEY = __name__ + 'firstaidsessionkey'
MEMCACHE_SESSION_TTL = 60 * 5


class FirstAidActivityTopic(ndb.Model):

    """Hold the list of topic

    """
    data = ndb.JsonProperty(required=True)
    name = ndb.ComputedProperty(lambda self: self.data.get('name'))

    def summary(self):
        name = self.data.get('name')
        step = self.data.get('step')
        label = '%s (%s)' % (name, step,) if step else name
        return {
            'id': self.key.id(),
            'label': label,
        }

    @classmethod
    def new_topic(cls, data, commit=True):
        topic = cls(id=str(data.get('id', '')), data=data)
        if commit:
            topic.put()
        return topic

    @staticmethod
    def validate(data):
        education.api.validate('FirstAidTopicData', data)

    def _pre_put_hook(self):
        self.validate(self.data)

    @classmethod
    def get_topics(cls):
        return cls.query().order(cls.name)


class FirstAidActivity(ndb.Model):

    """Store the activity of a user on a topic at a specific date

    """
    # Since those are ready only and we will need to query them
    # let's use ComputedProperties
    student_id = ndb.ComputedProperty(
        lambda self: self.id_to_student_id(self.key.id())
    )
    topic_id = ndb.ComputedProperty(
        lambda self: self.key.id().split('/', 2)[1]
    )
    day = ndb.ComputedProperty(lambda self: self.get_date())

    data = ndb.JsonProperty(required=True)

    @property
    def user_predictive(self):
        return self.data.get('user_predictive')

    @staticmethod
    def id_to_student_id(id):
        return id.split('/', 1)[0]

    def get_date(self):
        """Return the date as a datetime object.

        So that it can be stored as a computed property (unlike dates).

        """
        day = self.key.id().split('/', 2)[2]
        return datetime.datetime.strptime(day, '%Y-%m-%d')

    @classmethod
    def new_activity(cls, student_id, topic_id, date, data, commit=True):
        activity_id = "%s/%s/%s" % (student_id, topic_id, date.isoformat(),)

        activity = cls(id=activity_id, data=data)
        if commit:
            activity.put()
        return activity

    @staticmethod
    def cal_day_to_date(str_date):
        return datetime.datetime.strptime(str_date, '%d-%b-%y').date()

    @classmethod
    def from_data(cls, data, commit=True):
        student_id = User.email_to_student_id(data['email'])
        topic_id = data['category_id']
        date = cls.cal_day_to_date(data['cal_day_dt'])
        return cls.new_activity(
            student_id, topic_id, date, data, commit=commit
        )

    @staticmethod
    def validate(data):
        education.api.validate('FirstAidSessionRowData', data)

    def _pre_put_hook(self):
        self.validate(self.data)

    @classmethod
    def get_all_by_student_id(cls, student_id):
        return cls.query().filter(cls.student_id == student_id)


class FirstAidUserStats(ndb.Model):

    """Store the cumulative performance of a user.

    """

    display_name = ndb.StringProperty(required=True)
    is_active = ndb.BooleanProperty(required=True)
    year = ndb.IntegerProperty(required=True)

    data = ndb.JsonProperty(required=True)
    last_updated_at = ndb.DateTimeProperty(auto_now=True)

    question_taken = ndb.ComputedProperty(
        lambda self: self._question_taken
    )
    performance = ndb.ComputedProperty(
        lambda self: self._performance
    )

    @property
    def student_id(self):
        return self.key.id()

    @property
    def _correct_answers(self):
        return sum(
            [s['user_answered_correct'] for s in self.data.itervalues()]
        )

    @property
    def _question_taken(self):
        return sum([s['user_questions'] for s in self.data.itervalues()])

    @property
    def _performance(self):
        q_taken = q_correct = 0
        for stats in self.data.itervalues():
            q_taken += stats['user_questions']
            q_correct += stats['user_answered_correct']
        return q_correct * 100 // q_taken if q_taken else 0

    def summary(self):
        return {
            'id': self.student_id,
            'studentId': self.student_id,
            'displayName': self.display_name,
            'year': self.year,
            'correctAnswers': self._correct_answers,
            'questionTaken': self.question_taken,
            'performance': self.performance
        }

    def details(self):
        data = self.summary()
        cats = data['categoryPerformances'] = []
        for k, v in self.data.iteritems():
            cats.append({
                'id': k,
                'correctAnswers': v['user_answered_correct'],
                'questionTaken': v['user_questions'],
                'predictive': v['user_predictive'],
                'performance': (
                    v['user_answered_correct'] * 100 // v['user_questions']
                )
            })
        cats.sort(key=lambda x: -x['performance'])
        return data

    @classmethod
    def new_user_stats(cls, student):
        if student is None:
            raise StopIteration

        props = {
            'display_name': student.display_name,
            'is_active': student.is_active,
            'year': student.year,
        }

        topic_stats = {}
        activities = FirstAidActivity.get_all_by_student_id(student.key.id())
        for act in activities:
            t_stats = topic_stats.get(act.topic_id)
            if t_stats is None:
                t_stats = topic_stats[act.topic_id] = (
                    FirstAidUserTopicStats.new_user_topic_stats(
                        student, act.topic_id
                    )
                )
            t_stats.append(act.data)

        performances = {}
        for k, t_stats in topic_stats.iteritems():
            yield t_stats
            performances[k] = t_stats.data
        yield cls(id=student.key.id(), data=performances, **props)

    @staticmethod
    def validate(data):
        education.api.validate('FirstAidUserStatsData', data)

    def _pre_put_hook(self):
        self.validate(self.data)

    @staticmethod
    def get_topics():
        return FirstAidActivityTopic.get_topics()

    @classmethod
    def get_stats(
        cls,
        cursor_key=None,
        limit=None,
        year=None,
        topic_id=None,
        sort_by=None,
        is_active=True,
        **kw
    ):
        """Return stats by page.

        TODO: add tests

        """
        if sort_by and sort_by not in ('question_taken', 'performance'):
            raise ValueError("Cannot sort by %s" % sort_by)

        if topic_id:
            return FirstAidUserTopicStats.get_stats(
                topic_id,
                cursor_key=cursor_key,
                limit=limit,
                year=year,
                sort_by=sort_by,
                is_active=True,
                **kw
            )

        limit = limit if limit else 20
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None

        q = cls.query()
        q = cls.query().filter(cls.is_active == is_active)
        if year:
            q = q.filter(cls.year == year)
        q = q.order(-ndb.GenericProperty(sort_by))

        stats, cursor, _ = q.fetch_page(limit, start_cursor=cursor, **kw)
        return stats, (cursor.urlsafe() if cursor else None),


class FirstAidUserTopicStats(ndb.Model):

    """Hold the user's stats on a topic.

    """
    student_id = ndb.ComputedProperty(lambda self: self.key.id().split('/')[0])
    topic_id = ndb.ComputedProperty(
        lambda self: self.key.id().split('/', 1)[1]
    )

    display_name = ndb.StringProperty(required=True)
    is_active = ndb.BooleanProperty(required=True)
    year = ndb.IntegerProperty(required=True)

    data = ndb.JsonProperty(required=True)
    last_updated_at = ndb.DateTimeProperty(auto_now=True)

    question_taken = ndb.ComputedProperty(
        lambda self: self.data['user_questions']
    )
    performance = ndb.ComputedProperty(
        lambda self: self._performance
    )

    _tracked_stats = [
        'user_test_taken',
        'user_questions',
        'user_not_answered',
        'user_answered_correct',
        'user_answered_incorrect',
    ]

    def summary(self):
        return {
            'id': self.student_id,
            'studentId': self.student_id,
            'topicId': self.topic_id,
            'displayName': self.display_name,
            'year': self.year,
            'correctAnswers': self.data['user_answered_correct'],
            'questionTaken': self.question_taken,
            'performance': self.performance,
            'predictive': self.data['user_predictive']
        }

    @property
    def _performance(self):
        qs = self.data.get('user_questions', 0)
        c_qs = self.data.get('user_answered_correct', 0)
        return c_qs * 100 // qs if qs else 0

    @classmethod
    def new_user_topic_stats(cls, student, topic_id):
        topic_stats_id = "%s/%s" % (student.key.id(), topic_id,)
        data = {k: 0 for k in cls._tracked_stats}
        data['user_session_count'] = 0
        data['user_predictive'] = 0
        data['cal_day_dt'] = None
        data['category_id'] = topic_id
        props = {
            'display_name': student.display_name,
            'is_active': student.is_active,
            'year': student.year,
            'data': data
        }
        return cls(id=topic_stats_id, **props)

    def append(self, stats):
        if stats.get('category_id') != self.topic_id:
            return

        for k in self._tracked_stats:
            if k in stats:
                self.data[k] += int(stats[k])

        # We need to support stats to be combined
        # The stats we receive might be the result of some stats
        # already combined.
        self.data['user_session_count'] += stats.get('user_session_count', 1)

        if self.data['cal_day_dt'] is None:
            self.data['cal_day_dt'] = stats['cal_day_dt']
            self.data['user_predictive'] = int(stats.get('user_predictive', 0))
            return

        stats_date = FirstAidActivity.cal_day_to_date(stats['cal_day_dt'])
        data_date = FirstAidActivity.cal_day_to_date(self.data['cal_day_dt'])
        if stats_date > data_date:
            self.data['cal_day_dt'] = stats['cal_day_dt']
            self.data['user_predictive'] = int(stats.get('user_predictive', 0))

    @staticmethod
    def validate(data):
        education.api.validate('FirstAidUserTopicStatsData', data)

    def _pre_put_hook(self):
        self.validate(self.data)

    @classmethod
    def get_stats(
        cls,
        topic_id,
        year=None,
        sort_by=None,
        is_active=True,
        cursor_key=None,
        limit=None,
        **kw
    ):
        limit = limit if limit else 20
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None

        q = cls.query().filter(cls.is_active == is_active)
        q = cls.query().filter(cls.topic_id == topic_id)
        if year:
            q = q.filter(cls.year == year)
        q = q.order(-ndb.GenericProperty(sort_by))

        stats, cursor, _ = q.fetch_page(limit, start_cursor=cursor, **kw)
        return stats, (cursor.urlsafe() if cursor else None)


class FirstAidApiClient(object):

    def __init__(self):
        self.auth_id = services.config.FIRST_AID_AUTH_ID
        self.auth_url = (
            services.config.FIRST_AID_AUTH_URL_PATTERN % self.auth_id
        )
        self._auth_cookie = None

    @property
    def auth_pw(self):
        return services.config.FIRST_AID_AUTH_PW

    @property
    def auth_cookie(self):
        if self._auth_cookie:
            return self._auth_cookie

        self._auth_cookie = memcache.get(MEMCACHE_SESSION_KEY)
        if self._auth_cookie:
            return self._auth_cookie

        resp = urlfetch.fetch(
            self.auth_url,
            payload=json.dumps({'pass': self.auth_pw}),
            method='post'
        )
        if resp.status_code != 200:
            self._error(resp)

        cookies = Cookie.SimpleCookie(resp.headers.get('Set-Cookie'))
        sess_name, sid_morsel = cookies.iteritems().next()
        self._auth_cookie = '%s=%s' % (sess_name, sid_morsel.value)
        memcache.set(
            MEMCACHE_SESSION_KEY,
            self.auth_cookie,
            time=MEMCACHE_SESSION_TTL
        )
        return self._auth_cookie

    def reset_cookie(self):
        self._auth_cookie = None
        memcache.delete(MEMCACHE_SESSION_KEY)

    def fetch(self, url, payload=None, method='get'):
        for _ in range(2):
            resp = urlfetch.fetch(
                url,
                payload=payload,
                method=method,
                headers={
                    'Cookie': self.auth_cookie
                }
            )
            if resp.status_code == 401:
                self.reset_cookie()
                continue
            else:
                break

        if resp.status_code != 200:
            self._error(resp)

        try:
            return json.loads(resp.content)
        except (ValueError, TypeError,):
            raise ServiceResponseError('Invalid response: %s' % resp.content)

    def _error(self, resp):
        if resp.status_code == 401:
            raise ServiceAuthError(
                "Failed to authenticate with First Aid: %s" % resp.content
            )
        elif resp.status_code >= 500:
            raise ServiceResponseError(
                "First Aid request failed (%s): %s"
                % (resp.status_code, resp.content)
            )
        else:
            raise ServiceRequestError(
                "Invalid request for First Aid (%s): %s"
                % (resp.status_code, resp.content)
            )
