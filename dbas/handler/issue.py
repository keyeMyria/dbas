"""
Provides helping function for issues.

.. codeauthor:: Tobias Krauthoff <krauthoff@cs.uni-duesseldorf.de
"""
from datetime import date, timedelta
from json import JSONDecodeError
from math import ceil

import arrow
import transaction
from pyramid.request import Request
from slugify import slugify

from dbas.database import DBDiscussionSession
from dbas.database.discussion_model import Argument, User, Issue, Language, Statement, sql_timestamp_pretty_print, \
    ClickedStatement, TextVersion
from dbas.handler import user
from dbas.handler.language import get_language_from_header
from dbas.helper.query import get_short_url
from dbas.helper.url import UrlManager
from dbas.lib import nick_of_anonymous_user
from dbas.lib import python_datetime_pretty_print
from dbas.query_wrapper import get_enabled_issues_as_query, get_visible_issues_for_user_as_query
from dbas.strings.keywords import Keywords as _
from dbas.strings.translator import Translator

rep_limit_to_open_issues = 10


def set_issue(db_user: User, info: str, long_info: str, title: str, db_lang: Language, is_public: bool,
              is_read_only: bool) -> dict:
    """
    Sets new issue, which will be a new discussion

    :param db_user: User
    :param info: Short information about the new issue
    :param long_info: Long information about the new issue
    :param title: Title of the new issue
    :param db_lang: Language
    :param is_public: Boolean
    :param is_read_only: Boolean
    :rtype: dict
    :return: Collection with information about the new issue
    """
    user.update_last_action(db_user)

    DBDiscussionSession.add(Issue(title=title,
                                  info=info,
                                  long_info=long_info,
                                  author_uid=db_user.uid,
                                  is_read_only=is_read_only,
                                  is_private=not is_public,
                                  lang_uid=db_lang.uid))
    DBDiscussionSession.flush()
    transaction.commit()
    db_issue = DBDiscussionSession.query(Issue).filter(Issue.title == title, Issue.info == info).first()

    return {'issue': get_issue_dict_for(db_issue, 0, db_lang.ui_locales)}


def prepare_json_of_issue(db_issue: Issue, db_user: User) -> dict():
    """
    Prepares slug, info, argument count and the date of the issue as dict

    :param db_issue: Issue
    :param db_user: User
    :return: Issue-dict()
    """
    slug = slugify(db_issue.title)
    title = db_issue.title
    info = db_issue.info
    long_info = db_issue.long_info
    stat_count = get_number_of_statements(db_issue.uid)
    lang = db_issue.lang
    date_pretty = sql_timestamp_pretty_print(db_issue.date, lang)
    duration = (arrow.utcnow() - db_issue.date)
    days, seconds = duration.days, duration.seconds
    duration = ceil(days * 24 + seconds / 3600)
    date_ms = int(db_issue.date.format('X')) * 1000
    date = db_issue.date.format('DD.MM.YY')
    time = db_issue.date.format('HH:mm')

    db_issues = get_visible_issues_for_user_as_query(db_user.uid).filter(Issue.uid != db_issue.uid).all()
    all_array = [get_issue_dict_for(issue, db_issue.uid, lang) for issue in db_issues]

    _t = Translator(lang)
    tooltip = _t.get(_.discussionInfoTooltipSg) if stat_count == 1 else _t.get(_.discussionInfoTooltipPl)
    tooltip = tooltip.format(date, time, stat_count)

    return {
        'slug': slug,
        'lang': lang,
        'info': info,
        'long_info': long_info,
        'title': title,
        'uid': db_issue.uid,
        'stat_count': stat_count,
        'date': date,
        'date_ms': date_ms,
        'date_pretty': date_pretty,
        'all': all_array,
        'tooltip': tooltip,
        'intro': _t.get(_.currentDiscussion),
        'duration': duration,
        'read_only': db_issue.is_read_only
    }


def get_number_of_arguments(issue_uid: int) -> int:
    """
    Returns number of arguments for the issue

    :param issue_uid: Issue Issue.uid
    :return: Integer
    """
    return DBDiscussionSession.query(Argument).filter_by(issue_uid=issue_uid).count()


def get_number_of_statements(issue_uid: int) -> int:
    """
    Returns number of statements for the issue

    :param issue_uid: Issue Issue.uid
    :return: Integer
    """
    return DBDiscussionSession.query(Statement).filter_by(issue_uid=issue_uid).count()


def get_issue_dict_for(db_issue: Issue, uid: int, lang: str) -> dict():
    """
    Creates an dictionary for the issue

    :param db_issue: Issue
    :param uid: current selected Issue.uid
    :param lang: ui_locales
    :return: dict()
    """
    _um = UrlManager(db_issue.slug)
    issue_dict = {
        'uid': str(db_issue.uid),
        'slug': db_issue.slug,
        'title': db_issue.title,
        'url': '/' + db_issue.slug,
        'review_url': _um.get_review_url() if str(uid) != str(db_issue.uid) else '',
        'info': db_issue.info,
        'stat_count': get_number_of_statements(db_issue.uid),
        'date': sql_timestamp_pretty_print(db_issue.date, lang),
        'author': db_issue.users.public_nickname,
        'error': '',
        'author_url': '/user/{}'.format(db_issue.users.uid),
        'enabled': 'disabled' if str(uid) == str(db_issue.uid) else 'enabled'
    }
    return issue_dict


def get_id_of_slug(slug: str):
    """
    Returns the uid of the issue with given slug

    :param slug: slug
    :return: uid
    """
    return get_enabled_issues_as_query().filter_by(slug=slug).first()


def save_issue_id_in_session(issue_uid: int, request: Request):
    """

    :param issue_uid:
    :param request:
    :return:
    """
    request.session['issue'] = issue_uid


def get_issue_id(request):
    """
    Returns issue uid saved in request. If there is no uid, we will choose an
    issue based on the language from the requests header

    :param request: self.request
    :return: uid
    """
    issue_uid = None
    try:
        issue_uid = request.json_body.get('issue')
    except (JSONDecodeError, AttributeError):
        pass
    if not issue_uid:
        issue_uid = request.matchdict.get('issue')
    if not issue_uid:
        issue_uid = request.params.get('issue')
    if not issue_uid:
        issue_uid = request.session.get('issue')

    # no issue found
    if not issue_uid:
        return None

    # save issue in session
    request.session['issue'] = issue_uid
    return issue_uid


def get_issue_based_on_header(request):
    """

    :param request:
    :return:
    """
    # logger('IssueHelper', 'get_issue_based_on_header', 'no saved issue found')
    ui_locales = get_language_from_header(request)
    db_issues = get_enabled_issues_as_query()
    db_lang = DBDiscussionSession.query(Language).filter_by(ui_locales=ui_locales).first()
    db_issue = db_issues.filter_by(lang_uid=db_lang.uid).first()
    if not db_issue:
        db_issue = db_issues.first()

    return db_issue.uid


def get_title_for_slug(slug):
    """
    Returns the issues title for a given slug

    :param slug: String
    :return: String
    """
    db_issues = DBDiscussionSession.query(Issue).all()
    for issue in db_issues:
        if str(slugify(issue.title)) == str(slug):
            return issue.title
    return None


def get_issues_overiew(db_user: User, app_url: str) -> dict:
    """
    Returns dictionary with keywords 'user' and 'others', which got lists with dicts with infos
    IMPORTANT: URL's are generated for the frontend!

    :param db_user: User
    :param app_url: current applications url
    :return: dict
    """

    if not db_user or db_user.nickname == nick_of_anonymous_user:
        return {
            'user': [],
            'other': []
        }

    user.update_last_action(db_user)
    if db_user.is_admin():
        db_issues_other_users = DBDiscussionSession.query(Issue).filter(Issue.author_uid != db_user.uid).all()
    else:
        db_issues_other_users = get_visible_issues_for_user_as_query(db_user.uid).filter(
            Issue.author_uid != db_user.uid).all()

    db_issues_of_user = DBDiscussionSession.query(Issue).filter_by(author_uid=db_user.uid).order_by(Issue.uid.asc()).all()
    return {
        'user': [__create_issue_dict(issue, app_url) for issue in db_issues_of_user],
        'other': [__create_issue_dict(issue, app_url) for issue in db_issues_other_users]
    }


def get_issues_overview_on_start(db_user: User) -> dict:
    """
    Returns list with title, date, and count of statements for each visible issue

    :param db_user: User
    :return:
    """
    prepared_list = []
    db_issues = get_visible_issues_for_user_as_query(db_user.uid).order_by(Issue.uid.asc()).all()
    date_dict = {}
    for index, db_issue in enumerate(db_issues):
        prepared_list.append({
            'uid': db_issue.uid,
            'url': '/' + db_issue.slug,
            'statements': get_number_of_statements(db_issue.uid),
            'title': db_issue.title,
            'date': db_issue.date.format('DD.MM.YY HH:mm'),
            'lang': {
                'is_de': db_issue.lang == 'de',
                'is_en': db_issue.lang == 'en',
            },
        })

        # key needs to be a str to be parsed in the frontend as json
        date_dict[str(db_issue.uid)] = __get_dict_for_charts(db_issue)

    return {
        'issues': prepared_list,
        'data': date_dict
    }


def __get_dict_for_charts(db_issue: Issue) -> dict:
    """

    :param db_issue:
    :return:
    """
    days_since_start = (arrow.utcnow() - db_issue.date).days
    if days_since_start > 30:
        days_since_start = 30
    label = []
    data = []
    for days_diff in range(days_since_start, -1, -1):
        date_begin = date.today() - timedelta(days=days_diff)
        date_end = date.today() - timedelta(days=days_diff - 1)
        begin = arrow.get(date_begin.strftime('%Y-%m-%d'), 'YYYY-MM-DD')
        end = arrow.get(date_end.strftime('%Y-%m-%d'), 'YYYY-MM-DD')
        label.append(python_datetime_pretty_print(date_begin, db_issue.lang))
        count = DBDiscussionSession.query(TextVersion).filter(
            TextVersion.timestamp >= begin,
            TextVersion.timestamp < end).count()
        data.append(count)

    return {
        'data': data,
        'label': label
    }


def set_discussions_properties(db_user: User, db_issue: Issue, value, iproperty, translator) -> dict:
    """

    :param db_user: User
    :param db_issue: Issue
    :param value: The value which should be assigned to property
    :param iproperty: Property of Issue, e.g. is_disabled
    :param translator:
    :return:
    """
    if db_issue.author_uid != db_user.uid and not user.is_admin(db_user.nickname):
        return {'error': translator.get(_.noRights)}

    if iproperty == 'enable':
        db_issue.set_disabled(not value)
    elif iproperty == 'public':
        db_issue.set_private(not value)
    elif iproperty == 'writable':
        db_issue.set_read_only(not value)
    else:
        return {'error': translator.get(_.internalKeyError)}

    DBDiscussionSession.add(db_issue)
    DBDiscussionSession.flush()
    transaction.commit()

    return {'error': ''}


def __create_issue_dict(db_issue: Issue, app_url: str) -> dict:
    """
    Returns dictionary with several information about the given issue

    :param db_issue: database row of issue
    :param app_url: current applications url
    :return: dict()
    """
    short_url_dict = get_short_url(app_url + '/discuss/' + db_issue.slug)
    url = short_url_dict['url'] if len(short_url_dict['url']) > 0 else app_url + '/discuss/' + db_issue.slug

    # we do nto have to check for clicked arguments, cause arguments consist out of statements
    statements = [s.uid for s in DBDiscussionSession.query(Statement).filter_by(issue_uid=db_issue.uid).all()]
    db_clicked_statements = DBDiscussionSession.query(ClickedStatement).filter(
        ClickedStatement.statement_uid.in_(statements)).all()

    authors_clicked_statement = [click.author_uid for click in db_clicked_statements]
    db_authors_len = DBDiscussionSession.query(User).filter(User.uid.in_(authors_clicked_statement)).count()

    prepared_dict = {
        'uid': db_issue.uid,
        'title': db_issue.title,
        'url': '/' + db_issue.slug,
        'short_url': url,
        'date': db_issue.date.format('DD.MM.YY HH:mm'),
        'count_of_statements': len(statements),
        'is_enabled': not db_issue.is_disabled,
        'is_public': not db_issue.is_private,
        'is_writable': not db_issue.is_read_only,
        'participants': db_authors_len,
        'lang': {
            'is_de': db_issue.lang == 'de',
            'is_en': db_issue.lang == 'en',
        }
    }
    return prepared_dict
