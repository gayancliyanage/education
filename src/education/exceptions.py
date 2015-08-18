"""Education's exception

"""


class EducationError(Exception):
    """Generic and base exception for the education package"""


class InvalidOperation(EducationError):
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)


class ModelError(EducationError):
    """Generic error related to the eduction models modules"""


class CannotRegisterError(ModelError):
    """Raise if user cannot be registered because there's no staff or
    student record for the user email.

    """


class ValidationError(ModelError):
    """Schema validation error."""


class DuplicateEntityError(ModelError):
    """An entity with same id already exist"""


class InvalidCredentialsError(ModelError):
    """Raised when a required oauth credential is missing or invalid"""


class InvalidCredentialsDomainError(InvalidCredentialsError):
    """The user account is managed by an invalid domain"""


class InvalidStudentSourceError(ModelError):
    """Raise when a student csv source is invalid."""


class ServiceApiError(EducationError):
    """Base exception for 3rd party request error."""


class ServiceRequestError(ServiceApiError):
    """Raised for an invalid request to a 3rd party server.

    There shouldn't be any other attempt with the same request.

    """


class ServiceAuthError(ServiceRequestError):
    """Raise if the credentials for a 3rd party service are invalid."""


class ServiceResponseError(ServiceApiError):
    """Raised if the 3rd party failed to respond with a valid response."""
