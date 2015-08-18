"""First aid tasks.


The first task consist of of querying First aid api for the list of
topic.

The Second Task will query student activities and rebuild their stats.

"""
import logging
import urllib
import datetime

from jsonschema import ValidationError
from mapreduce import base_handler
from mapreduce import input_readers
from mapreduce import mapreduce_pipeline
from mapreduce import operation as op
from mapreduce.errors import FailJobError
from mapreduce.errors import RetrySliceError
from mapreduce.third_party.pipeline import InOrder

import education
from education.dashboard.services.firstaid import FirstAidApiClient
from education.dashboard.services.firstaid import FirstAidActivityTopic
from education.dashboard.services.firstaid import FirstAidActivity
from education.dashboard.services.firstaid import FirstAidUserStats
from education.dashboard import services
from education.exceptions import ServiceRequestError
from education.exceptions import ServiceResponseError
from education.tasks.utils import SaveCounters


class UrlInputReader(input_readers.InputReader):

    def __init__(self, urls):
        self._urls = list(urls)

    def __iter__(self):
        return self

    def next(self):
        if not self._urls:
            raise StopIteration

        return self._urls.pop()

    @classmethod
    def from_json(cls, input_shard_state):
        return cls(input_shard_state.get('urls', ()))

    def to_json(self):
        return {'urls': self._urls}

    @classmethod
    def split_input(cls, mapper_spec):
        params = input_readers._get_params(mapper_spec)
        urls = list(enumerate(params["urls"]))
        shard_count = mapper_spec.shard_count
        if len(urls) > shard_count:
            shard_len = len(urls) / shard_count
        else:
            shard_len = 1

        shards = []
        while urls:
            shards.append(cls(urls[0: shard_len]))
            urls = urls[shard_len:]
        return shards


def topic_handler(data):
    _, url = data
    try:
        topics = FirstAidApiClient().fetch(url)
    except ServiceRequestError:
        raise FailJobError()
    except ServiceResponseError:
        raise RetrySliceError()

    for topic_data in topics:
        yield op.db.Put(
            FirstAidActivityTopic.new_topic(topic_data, commit=False)
        )
    yield op.counters.Increment('Topics', len(topic_data))


class FirstAidTopicUpdater(base_handler.PipelineBase):
    """Query First Aid for the list of topics and save each of them as
    a FirstAidActivityTopic entity.

    """
    output_names = ['counters']

    def run(self):
        params = {'urls': services.config.FIRST_AID_TOPIC_URLS}
        results = yield mapreduce_pipeline.MapperPipeline(
            "Update First Aid topic list",
            handler_spec=__name__ + ".topic_handler",
            input_reader_spec=__name__ + ".UrlInputReader",
            params=params,
            shards=2
        )
        yield SaveCounters(results.counters)


def query_handler(data):
    _, url = data
    try:
        session_user_topic_stats = FirstAidApiClient().fetch(url)
    except ServiceRequestError:
        raise FailJobError()
    except ServiceResponseError:
        raise RetrySliceError()

    for session_data in session_user_topic_stats:
        try:
            education.api.validate('FirstAidSessionRowData', session_data)
        except ValidationError:
            logging.error('Invalid session stats: %s', session_data)
            continue
        yield op.db.Put(
            FirstAidActivity.from_data(session_data, commit=False)
        )
        yield op.counters.Increment('Session stats', 1)


def student_handler(student):
    count = 0
    # FirstAidUserStats.new_user_stats yield all the user topic stats
    # created / update and yield the user stats at the end.
    for entity in FirstAidUserStats.new_user_stats(student):
        yield op.db.Put(entity)
        count += 1

    yield op.counters.Increment('User stats updated', 1)
    if count > 1:
        yield op.counters.Increment('User topic stats updated', count - 1)


class FirstAidStatsUpdater(base_handler.PipelineBase):
    """Update the student First Aid stats.

    1. Query stats for a specific range of date and save each session as a
       FirstAidActivity entity.
    2. Query all Student entity and rebuild their stats.

    """
    output_names = ['counters']
    date_frmt = '%d-%b-%y'

    @classmethod
    def date_to_str(cls, date):
        return date.strftime(cls.date_frmt)

    @classmethod
    def str_to_date(cls, str_date):
        return datetime.datetime.strptime(str_date, cls.date_frmt)

    @classmethod
    def _split_date_range(cls, start_date, end_date):
        current_start_date = start_date
        while (end_date - current_start_date).days > 0:
            current_end_date = current_start_date + datetime.timedelta(days=7)
            current_end_date = (
                current_end_date if current_end_date < end_date else end_date
            )
            yield (current_start_date, current_end_date,)
            current_start_date += datetime.timedelta(days=8)

    @classmethod
    def _urls(self, base_url, start_date, end_date):
        for from_date, to_date in self._split_date_range(start_date, end_date):
            query = urllib.urlencode(
                (
                    ('v_from_date', self.date_to_str(from_date),),
                    ('v_to_date', self.date_to_str(to_date),),
                )
            )
            yield base_url % query

    def run(self, str_start_date, str_end_date):
        start_date = self.str_to_date(str_start_date)
        end_date = self.str_to_date(str_end_date)

        url_pattern = services.config.FIRST_AID_REPORT_URL_PATTERN

        with InOrder():
            query_params = {
                'urls': list(self._urls(url_pattern, start_date, end_date))
            }
            query_results = yield mapreduce_pipeline.MapperPipeline(
                (
                    "Fetch First Aid stats (%s to %s)"
                    % (str_start_date, str_end_date,)
                ),
                handler_spec=__name__ + ".query_handler",
                input_reader_spec=__name__ + ".UrlInputReader",
                params=query_params,
                shards=2
            )

            stats_mapper_params = {
                'entity_kind': 'education.core.models.Student',
                'filters': [('is_setup', '=', True,)]
            }
            build_result = yield mapreduce_pipeline.MapperPipeline(
                "Rebuild stats",
                handler_spec=__name__ + ".student_handler",
                params=stats_mapper_params,
                input_reader_spec=(
                    "mapreduce.input_readers.DatastoreInputReader"
                ),
                shards=4
            )

        yield SaveCounters(query_results.counters, build_result.counters)
