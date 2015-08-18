import csv
import time
import copy
from email import utils

from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import blobstore
from google.appengine.ext import deferred
from google.appengine.ext import ndb
from google.appengine.runtime import DeadlineExceededError

from education import api
from education.core.models import Student


class InvalidSourceExamError(Exception):
    """The exam source document is invalid"""


class Document(ndb.Model):

    data = ndb.JsonProperty()
    sender_ref = ndb.KeyProperty()  # a Student key
    dest_ref = ndb.KeyProperty(required=True)  # a User key
    uploaded_at = ndb.DateTimeProperty(auto_now_add=True)

    def summary(self):
        data = self.data.copy()
        data['id'] = self.key.id()
        data['destId'] = self.dest_ref.id()

        uploaded_ts = time.mktime(self.uploaded_at.timetuple())
        data['uploadedAt'] = utils.formatdate(uploaded_ts)

        if self.sender_ref:
            data['senderId'] = self.sender_ref.id()

        return data

    def delete(self):
        blob = blobstore.BlobInfo.get(self.key.id())
        self.key.delete()
        blob.delete()

    @classmethod
    def new_file(cls, dest_id, blob_info, doc_type, sender=None, name=None):
        dest = Student.get_by_id(dest_id)
        if dest is None:
            raise ValueError("Couldn't find the student to send the file to.")

        data = {
            'name': name if name else blob_info.filename,
            'type': doc_type,
            'sender': sender.display_name if sender else 'System',
            'dest': dest.display_name,
            'lastDownloadAt': ''
        }
        doc = cls(
            id=str(blob_info.key()),
            data=data,
            sender_ref=sender.key if sender else None,
            dest_ref=dest.key
        )
        doc.put()
        return doc

    @classmethod
    def get_files(cls, student_key, cursor_key, **kw):
        cursor = Cursor(urlsafe=cursor_key) if cursor_key else None
        q = cls.query().filter(cls.dest_ref == student_key)
        q = q.order(-cls.uploaded_at)
        return q.fetch_page(20, start_cursor=cursor, **kw)

    @staticmethod
    def validate(data):
        api.validate('DocumentData', data)

    def _pre_put_hook(self):
        self.validate(self.data)


class AssessmentExam(ndb.Model):
    """Store stats for an exam.

    """

    name = ndb.StringProperty(required=True)
    source = ndb.BlobKeyProperty(required=True)
    created_at = ndb.DateTimeProperty(auto_now_add=True)
    processed = ndb.BooleanProperty(default=False)
    data = ndb.JsonProperty(default={})

    @property
    def stats(self):
        return self.data.get('stats', {})

    @property
    def questions(self):
        return self.data.get('questions', {})

    def student_results(self):
        q = AssessmentStudentExam.query()
        q = q.filter(AssessmentStudentExam.exam_id == self.key.id())
        return q.order(AssessmentStudentExam.student_id)

    def summary(self):
        data = copy.deepcopy(self.data)
        data['id'] = str(self.key.id())
        data['name'] = self.name
        data['createdAt'] = self.created_at.isoformat()
        data['processed'] = self.processed
        return data

    def details(self):
        data = self.summary()
        data['studentResults'] = [r.summary() for r in self.student_results()]
        return data

    @classmethod
    @ndb.transactional(xg=True)
    def new_exam(cls, name, blob_key):
        """Create a new assessment exam.

        TODO: process it.

        """
        exam = cls(name=name, source=blob_key)
        exam.put()
        deferred.defer(cls.process, exam.key.id())
        return exam

    @classmethod
    def process(cls, exam_id):
        exam = cls.get_by_id(exam_id)
        data = blobstore.BlobReader(exam.source)
        exam_data, student_results = cls.process_data(data)
        mapper = AssessmentStudentExamMapper(
            exam, *cls.process_data(data)
        )
        return mapper.run()

    @classmethod
    def process_data(cls, data):
        questions, csv_reader = cls._get_reader(data)
        student_results = [
            cls._process_line(row, questions) for row in csv_reader
        ]

        data = {
            'questions': questions,
            'stats': cls._process_results(student_results),
        }
        return data, student_results

    @staticmethod
    def _get_reader(data):
        data.seek(0)
        reader = csv.reader(data)
        try:
            header = reader.next()
        except StopIteration:
            raise InvalidSourceExamError("No header found.")

        if len(header) < 2:
            raise InvalidSourceExamError("No question found.")

        return [{'id': q} for q in header[1:]], reader

    @staticmethod
    def _process_line(row, questions):
        if len(row) < 2:
            return

        student_id = row[0].split('@')[0].upper()
        question_results = []
        points = 0

        # process results
        qr = zip(questions, row[1:])
        for q, r in qr:
            q = q.copy()
            try:
                q['value'] = int(r)
                if q['value'] > 1:
                    q['value'] = 1
            except ValueError:
                q['value'] = 0
            question_results.append(q)
            points += q['value']

        # process questions without result
        for q in questions[len(qr):]:
            q = q.copy()
            q['value'] = 0
            question_results.append(q)

        return {
            'studentId': student_id,
            'questions': question_results,
            'stats': {
                'all': {
                    'id': 'all',
                    'user': float(points)/len(questions)
                }
            }
        }

    @staticmethod
    def _process_results(results):
        overall_results = [r['stats']['all']['user'] for r in results]

        return {
            'all': {
                'id': 'all',
                'min': min(overall_results),
                'mean': float(sum(overall_results)) / len(overall_results),
                'max': max(overall_results)
            }
        }

    def _pre_put_hook(self):
        if self.data:
            self.validate(self.data)

    @staticmethod
    def validate(data):
        api.validate('AssessmentExamData', data)

    @classmethod
    def get_exams(cls):
        return cls.query().order(-AssessmentStudentExam.created_at)

    @staticmethod
    def get_by_student_id(student_id):
        q = AssessmentStudentExam.query()
        q = q.filter(AssessmentStudentExam.student_id == student_id)
        q = q.order(-AssessmentStudentExam.created_at)
        return q


class AssessmentStudentExam(ndb.Model):
    """Store exam results of each student to an exam.

    """

    exam_id = ndb.IntegerProperty(required=True)
    name = ndb.StringProperty(required=True)
    # Not a User id.
    student_id = ndb.StringProperty(required=True)
    data = ndb.JsonProperty(required=True)
    created_at = ndb.DateTimeProperty(auto_now_add=True)

    def summary(self):
        data = copy.deepcopy(self.data)
        data['id'] = str(self.exam_id)
        data['name'] = self.name
        data['studentId'] = self.student_id
        data['createdAt'] = self.created_at.isoformat()
        data['processed'] = True
        return data

    @classmethod
    def new_exam(cls, exam_id, exam_name, student_id, data, commit=True):
        exam = cls(
            id="%s/%s" % (exam_id, student_id),
            exam_id=exam_id,
            name=exam_name,
            student_id=student_id,
            data=data
        )

        if commit:
            exam.put()

        return exam

    def _pre_put_hook(self):
        if self.data:
            self.validate(self.data)

    @staticmethod
    def validate(data):
        api.validate('AssessmentExamData', data)


class AssessmentStudentExamMapper(object):
    """Save the exam results for each students having taken part
    in the exam.

    """

    def __init__(self, exam, exam_data, student_results):
        self.exam_data = exam_data
        self.exam_id = exam.key.id()
        self.exam_name = exam.name
        self.student_results = student_results
        self.batch = []

    def run(self, batch_size=20):
        return self._continue(0, batch_size=batch_size)

    def _continue(self, start_index, batch_size):
        index = start_index
        try:
            for i, result in enumerate(self.student_results[start_index:]):
                self._process(result)
                if (i + 1) % batch_size == 0:
                    self._save_batch()
                index = i + 1
        except DeadlineExceededError:
            self._save_batch()
            deferred.defer(self._continue, index, batch_size)

        self._save_batch()
        return self._finish()

    def _process(self, results):
        stats = self.exam_data['stats']
        data = {
            'questions': results['questions'],
            'stats': {}
        }

        # merge global stats with users results
        for topic in results['stats'].itervalues():
            topic_id = topic.get('id')
            if not topic_id or not stats.get(topic_id):
                continue
            user_topic = topic.copy()
            user_topic.update(stats[topic_id])
            data['stats'][topic_id] = user_topic

        self.batch.append(AssessmentStudentExam.new_exam(
            self.exam_id,
            self.exam_name,
            results['studentId'],
            data,
            commit=False
        ))

    def _save_batch(self):
        ndb.put_multi(self.batch)
        self.batch = []

    def _finish(self):
        exam = AssessmentExam.get_by_id(self.exam_id)
        exam.data = self.exam_data
        exam.processed = True
        return exam.put()
