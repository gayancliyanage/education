"""Resolve json schema

TODO: share them with the GUI apps
TODO: extends schema instead of duplicating properties

"""

from webapp2ext.swagger import String, Array, Boolean, Int

from education import api


api.schema(
    "User",
    description="A logged in user",
    properties={
        # From plus api
        "id": String(required=True),
        "displayName": String(required=True),
        "name": api.ref('Name', required=True),
        "image": api.ref('Image', required=True),
        "domain": String(),
        # From admin directory api
        "primaryEmail": String(),
        "orgUnitPath": String(),
        "isDomainAdmin": Boolean(required=True),
        # From our auth layerauth
        "studentId": String(),
        "year": Int(),
        "isStaff": Boolean(required=True),
        "isAdmin": Boolean(required=True),
        "isLoggedIn": Boolean(),
        "logoutUrl": String(),
        "loginUrl": String(),
    },
    additional_properties=True
)


api.schema(
    "UserData",
    description="A registered user data",
    properties={
        "displayName": String(required=True),
        "name": api.ref('Name', required=True),
        "image": api.ref('Image', required=True),
        "domain": String(),
        "primaryEmail": String(required=True),
        "orgUnitPath": String(),
        "isDomainAdmin": Boolean(),
    },
    additional_properties=True
)


api.schema(
    "Student",
    description="Additional student data",
    properties={
        # From plus api
        "id": String(),
        "displayName": String(required=True),
        "name": api.ref('Name', required=True),
        "image": api.ref('Image'),
        "domain": String(),
        # From admin directory api
        "primaryEmail": String(),
        "orgUnitPath": String(),
        "isDomainAdmin": Boolean(),
        # From our auth layerauth
        "studentId": String(required=True),
        "isActive": Boolean(required=True),
        "isSetup": Boolean(required=True),
        "year": Int(required=True),
        "isStaff": Boolean(),
        "isAdmin": Boolean(),
        "isLoggedIn": Boolean(),
        "logoutUrl": String(),
        "loginUrl": String(),
        # From Student entity
        "secondaryEmail": String(
            description=(
                "It is actually the main email a student uses "
                "outside the domain authentication"
            )
        ),
    }
)

api.schema(
    "StudentSummary",
    description="Additional student data",
    properties={
        "studentId": String(required=True),
        "isActive": Boolean(required=True),
        "isSetup": Boolean(required=True),
        "displayName": String(required=True),
        "name": api.ref('Name', required=True),
        "year": Int(),
        "image": api.ref('Image'),
        "secondaryEmail": String(
            description=(
                "It is actually the main email a student uses "
                "outside the domain authentication"
            )
        ),
    }
)


api.schema(
    "StudentData",
    description="Additional student data",
    properties={
        "displayName": String(required=True),
        "name": api.ref('Name', required=True),
        "year": Int(),
        "image": api.ref('Image'),
        "secondaryEmail": String(
            description=(
                "It is actually the main email a student uses "
                "outside the domain authentication"
            )
        ),
    }
)


api.schema(
    "Name",
    properties={
        "givenName": String(required=True),
        "familyName": String(required=True),
    },
    additional_properties=True
)


api.schema(
    "Email",
    properties={
        "value": String(required=True)
    },
    additional_properties=True
)


api.schema(
    'Image',
    properties={
        "url": String(required=True)
    },
    additional_properties=True
)


api.schema(
    "UserList",
    description="List of staff",
    properties={
        "type": String(),
        "users": Array(items=api.ref("User"), required=True),
        "cursor": String(),
    }
)


api.schema(
    "StudentList",
    description="List of staff",
    properties={
        "type": String(),
        "students": Array(items=api.ref("Student"), required=True),
        "cursor": String(),
    }
)


api.schema(
    'BlobStoreUploadInfo',
    properties={
        'url': String(required=True)
    }
)


api.schema(
    'PGYList',
    properties={
        'pgy': Array(items=api.ref("PGY"), required=True)
    }
)


api.schema(
    'PGY',
    properties={
        'id': Int(required=True),
        'label': String(required=True),
        'isActive': Boolean(required=True)
    }
)


api.schema(
    'JobResult',
    properties={
        'id': String(),
        'completed': Boolean()
    }
)
