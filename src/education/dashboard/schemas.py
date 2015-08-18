from webapp2ext.swagger import String, Int, Float, Boolean, Array

from education import api


DOCUMENT_TYPES = ['SHELF', 'USMLE', 'Peer Evaluations']


api.schema(
    'Document',
    description='A private file.',
    properties={
        'id': String(required=True),
        'name': String(required=True),
        'url': String(required=True),
        'type': String(required=True, enum=DOCUMENT_TYPES),
        'sender': String(required=True),
        'senderId': String(),
        'dest': String(required=True),
        'destId': String(required=True),
        'uploadedAt': String(required=True),
        'lastDownloadAt': String()
    }
)

api.schema(
    'DocumentData',
    properties={
        'name': String(required=True),
        'type': String(required=True, enum=DOCUMENT_TYPES),
        'sender': String(required=True),
        'dest': String(required=True),
        'lastDownloadAt': String()
    }
)

api.schema(
    'DocumentList',
    properties={
        'cursor': String(),
        'files': Array(items='Document', required=True)
    }
)


api.schema(
    'AssessmentExamList',
    properties={
        'student': api.ref('StudentSummary'),
        'exams': Array(api.ref('AssessmentExam'), required=True),
        'cursor': String()
    }
)


api.schema(
    'AssessmentExam',
    properties={
        'id': String(required=True),
        'name': String(required=True),
        'createdAt': String(required=True),  # ISO 8601
        'processed': Boolean(required=True),
        'questions': Array(api.ref('AssessmentQuestion')),
        'stats': api.ref('AssessmentStats'),
        'studentResults': Array(api.ref('AssessmentStudentResult')),
        'studentId': String(),
    }
)

api.schema(
    'AssessmentExamData',
    properties={
        'questions': Array(api.ref('AssessmentQuestion'), required=True),
        'stats': api.ref('AssessmentStats', required=True),
    }
)


api.schema(
    'AssessmentQuestion',
    properties={
        'id': String(required=True),
        'topic': String(),
        # Points awarded to a student for his answer (either 0 or 1).
        'value': Int()
    }
)


api.schema(
    'AssessmentStats',
    pattern_properties={
        '.+': api.ref('AssessmentTopicStats')
    }
)


api.schema(
    'AssessmentTopicStats',
    properties={
        'id': String(required=True),
        'name': String(),
        'min': Float(),
        'mean': Float(),
        'max': Float(),
        'user': Float(),
    }
)


api.schema(
    'AssessmentStudentResult',
    properties={
        'id': String(required=True),
        'name': String(required=True),
        'createdAt': String(required=True),  # ISO 8601
        'processed': Boolean(required=True),
        # Not the User id... the student might not be registered.
        'studentId': String(required=True),
        'questions': Array(api.ref('AssessmentQuestion'), required=True),
        'stats': api.ref('AssessmentStats', required=True),
    }
)


api.schema(
    'RoshReviewUserStatsList',
    properties={
        'stats': Array(api.ref('RoshReviewUserStats'), required=True),
        'cursor': String()
    }
)


api.schema(
    'RoshReviewUserStats',
    properties={
        'id': String(required=True),
        'studentId': String(required=True),
        # TODO: add student name even if the student is not registered.
        'displayName': String(required=True),
        'trainingLevel': String(),
        'year': Int(required=True),
        'percentageComplete': Float(),
        'performance': Float(required=True),
        'topic': String(),
        'categoryPerformances': Array(api.ref('RoshReviewUserTopicStats')),
        'history': Array(api.ref('PerformanceDay')),
    }
)


api.schema(
    'RoshReviewUserTopicStats',
    properties={
        'id': String(required=True),
        'label': String(required=True),
        'performance': Float(required=True),
    }
)


api.schema(
    'RoshReviewUserStatsData',
    properties={
        'trainingLevel': String(required=True),
        'year': Int(required=True),
        'percentageComplete': Float(required=True),
        'cumulativePerformance': Float(required=True),
        'categoryPerformances': api.ref(
            'RoshReviewUserStatsPerTopic',
            required=True
        )
    },
    additional_properties=True
)


api.schema(
    'RoshReviewRowData',
    properties={
        'percentage_complete': Float(required=True),
        'cumulative_performance': Float(required=True),
        'category_performances': api.ref(
            'RoshReviewUserStatsPerTopic',
            required=True
        )
    },
    additional_properties=True
)


api.schema(
    'RoshReviewUserStatsPerTopic',
    pattern_properties={
        '.+': Int()
    }
)


api.schema(
    'FirstAidUserStatsList',
    properties={
        'stats': Array(api.ref('FirstAidUserStats'), required=True),
        'cursor': String()
    }
)


api.schema(
    'FirstAidUserStats',
    properties={
        'id': String(required=True),
        'studentId': String(required=True),
        'displayName': String(required=True),
        'year': Int(required=True),
        'predictiveSum': Int(),
        'predictiveAverage': Int(),
        'lastPredictive': Int(),
        'topicId': String(),
        'categoryPerformances': Array(api.ref('FirstAidUserStatsPerTopic')),
        'history': Array(api.ref('PerformanceDay')),
    }
)


api.schema(
    'FirstAidUserStatsPerTopic',
    properties={
        'id': String(required=True),
        'predictive': Int(required=True),
    }
)


api.schema(
    'FirstAidUserStatsData',
    pattern_properties={
        '.*': api.ref('FirstAidUserTopicStatsData')
    }
)


api.schema(
    'FirstAidUserTopicStatsData',
    additional_properties=True,
    properties={
        'category_id': String(required=True),
        'cal_day_dt': String(required=True),
        'user_test_taken': Int(required=True),
        'user_questions': Int(required=True),
        'user_answered_correct': Int(required=True),
        'user_answered_incorrect': Int(required=True),
        'user_not_answered': Int(required=True),
        'user_predictive': Int(required=True),
        'user_session_count': Int(required=True),
    }
)

api.schema(
    'FirstAidSessionRowData',
    additional_properties=True,
    properties={
        'email': String(required=True),
        'category_id': String(required=True),
        'cal_day_dt': String(required=True),
        'user_test_taken': String(required=True),
        'user_questions': String(required=True),
        'user_answered_correct': String(required=True),
        'user_answered_incorrect': String(required=True),
        'user_not_answered': String(required=True),
        'user_predictive': String(required=True),
    }
)


api.schema(
    'PerformanceDay',
    properties={
        'date': String(required=True),
        'performance': Float(required=True)
    }
)


api.schema(
    'TopicList',
    properties={
        'type': String(),
        'topics': Array(api.ref('Topic'))
    }
)


api.schema(
    'Topic',
    properties={
        'id': String(required=True),
        'label': String(required=True),
    }
)


api.schema(
    'FirstAidTopicData',
    additional_properties=True,
    properties={
        'code': String(required=True),
        'id': Int(required=True),
        'name': String(required=True),
        'step': Int(required=True),
    }
)
