"""Misc

"""
import datetime
import calendar


def to_camel_case(s):
    s = s.replace('_', ' ').title().replace(' ', '')
    return s[:1].lower() + s[1:]


def date_to_timestamp(day):
    dt = datetime.datetime.combine(day, datetime.datetime.min.time())
    return calendar.timegm(dt.timetuple())
