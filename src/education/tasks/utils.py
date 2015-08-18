import logging

from mapreduce import base_handler
from mapreduce.output_writers import BlobstoreOutputWriter
from mapreduce import model


def fix_entity_handlers(entity):
    if hasattr(entity, 'fix'):
        entity.fix()
    entity.put()


class ValueWriter(BlobstoreOutputWriter):

    def write(self, data):
        _, value = data
        super(ValueWriter, self).write(value)


class BlobKeys(base_handler.PipelineBase):

    def run(self, blob_urls):
        return {
            "blob_keys": [u.split("/")[-1] for u in blob_urls],
            "output_sharding": "input"
        }


class LogResult(base_handler.PipelineBase):

    def run(self, results):
        logging.info('RESULT: %r', results)


class SaveCounters(base_handler.PipelineBase):

    def run(self, *counters):
        all_counters = {}
        for c in counters:
            all_counters.update(c)
        self.fill(self.outputs.counters, all_counters)


class SaveStatus(base_handler.PipelineBase):

    def run(self, *result_status):
        success = all(
            rs == model.MapreduceState.RESULT_SUCCESS for rs in result_status
        )
        self.fill(self.outputs.successful, success)
