"""Defines student's Rosh Review stats update tasks


1. For each active student get secondary email and save in a blob,
   30 emails per line.
3. For each line in the blob, query rosh review and the stats in blob,
   one entry per line.
3. For each line, update the user stats


"""
import time
import logging
import json

from google.appengine.api import files
from jsonschema import ValidationError
from mapreduce import base_handler
from mapreduce import context
from mapreduce import mapreduce_pipeline
from mapreduce import operation as op
from mapreduce.errors import FailJobError
from mapreduce.errors import RetrySliceError
from mapreduce.output_writers import BlobstoreOutputWriter
from mapreduce.output_writers import COUNTER_IO_WRITE_BYTES
from mapreduce.output_writers import COUNTER_IO_WRITE_MSEC

import education
from education.dashboard.services.roshreview import RoshReviewClient
from education.dashboard.services.roshreview import RoshReviewUserStats
from education.exceptions import ServiceRequestError
from education.exceptions import ServiceResponseError
from education.core.models import User
from education.core.models import Student
from education.tasks.utils import BlobKeys
from education.tasks.utils import SaveCounters


class EmailPool(context.Pool):
    """Pool of email append operations."""

    def __init__(self, email_per_line=30, ctx=None, **kw):
        self._email_per_line = email_per_line
        self._append_buffer = {}
        self._ctx = ctx

    def append(self, filename, email):
        if filename not in self._append_buffer:
            self._append_buffer[filename] = []

        self._append_buffer[filename].append(email)

        if len(self._append_buffer[filename]) > self._email_per_line:
            self.flush()

    def flush(self):
        """Flush pool contents."""
        if self._ctx:
            incr = lambda k, n: op.counters.Increment(k, n)(self._ctx)
        else:
            incr = lambda _, __: None

        start_time = time.time()
        for filename, emails in self._append_buffer.iteritems():
            data = json.dumps(emails) + '\n'
            with files.open(filename, "a") as f:
                incr(COUNTER_IO_WRITE_BYTES, len(data))
                f.write(data)
        incr(COUNTER_IO_WRITE_MSEC, int((time.time() - start_time) * 1000))
        self._append_buffer = {}


class EmailWriter(BlobstoreOutputWriter):

    def write(self, data):
        _, email = data
        ctx = context.get()
        if ctx.get_pool("email_pool") is None:
            ctx.register_pool("email_pool", EmailPool(ctx=ctx))
        ctx.get_pool("email_pool").append(self._filename, email)


def student_handler(student):
    yield op.counters.Increment('Students', 1)
    yield (student.key.id(), student.secondary_email,)


def emails_handler(data):
    _, line = data
    if not line:
        raise StopIteration

    try:
        emails = json.loads(line)
    except (ValueError, TypeError):
        logging.error("Invalid list of emails: %s", line)
        raise StopIteration

    try:
        resp = RoshReviewClient().query(emails)
    except ServiceRequestError:
        raise FailJobError()
    except ServiceResponseError:
        raise RetrySliceError()

    for stats in resp:
        yield (stats.get('email'), json.dumps(stats) + '\n')
        yield op.counters.Increment('Students stats', 1)


def stats_validation_handler(data):
    pos, line = data
    if not line:
        raise StopIteration

    try:
        stats = json.loads(line)
    except (ValueError, TypeError):
        logging.error("Invalid stats: %s", line)
        raise StopIteration

    if stats['category_performances'] is None:
        stats['category_performances'] = {}

    try:
        education.api.validate('RoshReviewRowData', stats)
    except ValidationError as e:
        logging.error('skipping  invalid stats (%s): %s', line, str(e))
        raise StopIteration

    yield (pos, json.dumps(stats) + '\n')
    yield op.counters.Increment('Valid students stats', 1)


def stats_handler(data):
    pos, line = data

    if not line:
        raise StopIteration
    try:
        stats = json.loads(line)
    except (ValueError, TypeError):
        logging.error("Failed to process rosh review stats: %s", line)
        raise StopIteration

    student_email = stats.get('email', '').lower()
    student_id = User.email_to_student_id(student_email)
    if student_id is None:
        logging.error(
            "Failed to process rosh review stats: invalid student email (%s)",
            line
        )
        raise StopIteration

    student = Student.get_by_id(student_id)
    if student is None:
        logging.error(
            "Failed to process rosh review stats: student not found (%s)",
            line
        )
        raise StopIteration

    user_stats = RoshReviewUserStats.new_stats(
        student, stats, commit=False
    )
    user_topic_stats = user_stats.update_topic_stats(commit=False)

    yield op.db.Put(user_stats)
    for ts in user_topic_stats:
        yield op.db.Put(ts)

    yield op.counters.Increment('User stats', 1)
    yield op.counters.Increment('User topic stats', len(user_topic_stats))


class RoshReviewStatsUpdator(base_handler.PipelineBase):
    output_names = ['counters']

    def run(self):
        email_params = {
            "entity_kind": "education.core.models.Student",
            "output_sharding": "input"
        }
        email_blob = yield mapreduce_pipeline.MapperPipeline(
            "Query student secondary emails",
            handler_spec=__name__ + ".student_handler",
            input_reader_spec="mapreduce.input_readers.DatastoreInputReader",
            output_writer_spec=__name__ + ".EmailWriter",
            params=email_params,
            shards=2
        )

        stats_blob = yield mapreduce_pipeline.MapperPipeline(
            "Query Rosh Review for stats",
            handler_spec=__name__ + ".emails_handler",
            input_reader_spec=(
                "mapreduce.input_readers.BlobstoreLineInputReader"
            ),
            output_writer_spec="education.tasks.utils.ValueWriter",
            params=(yield BlobKeys(email_blob)),
            shards=2
        )

        filtered_stats_blob = yield mapreduce_pipeline.MapperPipeline(
            "Validate Rosh Review for stats",
            handler_spec=__name__ + ".stats_validation_handler",
            input_reader_spec=(
                "mapreduce.input_readers.BlobstoreLineInputReader"
            ),
            output_writer_spec="education.tasks.utils.ValueWriter",
            params=(yield BlobKeys(stats_blob)),
            shards=2
        )

        results = yield mapreduce_pipeline.MapperPipeline(
            "Process Rosh Review stats",
            handler_spec=__name__ + ".stats_handler",
            input_reader_spec=(
                "mapreduce.input_readers.BlobstoreLineInputReader"
            ),
            params=(yield BlobKeys(filtered_stats_blob)),
            shards=2
        )

        yield SaveCounters(
            email_blob.counters,
            stats_blob.counters,
            filtered_stats_blob.counters,
            results.counters
        )
