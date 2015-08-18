import csv
import logging
import StringIO

from jsonschema import ValidationError
from mapreduce import base_handler
from mapreduce import context
from mapreduce import mapreduce_pipeline
from mapreduce import operation as op

from education.core.models import Student
from education.tasks.utils import SaveCounters


def row_handler(line_details):
    year = context.get().mapreduce_spec.mapper.params.get('student_year')
    pos, line = line_details

    if not pos:
        # skip header
        raise StopIteration()

    if not year:
        logging.error('Failed to create a new student. The year is missing')
        raise StopIteration()
    row = csv.reader(StringIO.StringIO(line)).next()

    if len(row) < 4:
        logging.error(
            'Failed to create a new student. Some fields are missing: %s',
            line
        )
        raise StopIteration()

    _, surname, name, email = row[0:4]
    try:
        entity = Student.new_student(
            surname, name, email=email, year=year, commit=False
        )
    except (ValueError, TypeError, ValidationError) as e:
        logging.error(
            'Failed to create a new student. wrong fields: %s.\n'
            'Error: %s',
            line,
            e
        )
        raise StopIteration

    yield op.db.Put(entity)
    yield op.counters.Increment('student added/updated', 1)


class ResetMemcache(base_handler.PipelineBase):

    def run(self, *result):
        from education.core.controllers import StudentListApi
        StudentListApi.reset_list_cache()


class ProcessNewStudent(base_handler.PipelineBase):
    output_names = ['counters']

    def run(self, blob_key, year, skip_header=True, **kwargs):
        mapper_params = {
            "blob_keys": blob_key,
            "student_year": year
        }
        result = yield mapreduce_pipeline.MapperPipeline(
            "Process student csv file (year %s)" % year,
            handler_spec=__name__ + ".row_handler",
            input_reader_spec=(
                "mapreduce.input_readers.BlobstoreLineInputReader"
            ),
            params=mapper_params,
            shards=4
        )
        yield ResetMemcache(result)
        yield SaveCounters(result.counters)
