"""
Discussion-related validators for statements, arguments, ...
"""
from os import environ

from dbas.database import DBDiscussionSession
from dbas.database.discussion_model import Issue, Statement, Argument, PremiseGroup
from dbas.handler import issue as issue_handler
from dbas.handler.language import get_language_from_cookie
from dbas.input_validator import is_integer
from dbas.strings.keywords import Keywords as _
from dbas.strings.translator import Translator
from dbas.validators.core import has_keywords, has_keywords_in_path
from dbas.validators.lib import add_error, escape_if_string


def valid_issue_by_id(request):
    """
    Query issue from database and put it into the request.

    :param request:
    :return:
    """

    issue_id = issue_handler.get_issue_id(request)
    if issue_id:
        db_issue: Issue = DBDiscussionSession.query(Issue).get(issue_id)

        if db_issue and db_issue.is_disabled:
            add_error(request, 'Issue no longer available', status_code=410)
            return False
        else:
            request.validated['issue'] = db_issue
            return True

    add_error(request, 'Invalid issue')
    return False


def valid_issue_by_slug(request):
    """
    Query issue by slug from the path.

    :param request:
    :return:
    """
    if has_keywords_in_path(('slug', str))(request):
        db_issue = DBDiscussionSession.query(Issue).filter(
            Issue.slug == request.validated['slug']).one_or_none()

        if db_issue:
            if db_issue.is_disabled:
                add_error(request, 'Issue no longer available', location='path', status_code=410)
                return False
            else:
                request.validated['issue'] = db_issue
                return True

    add_error(request, 'Invalid slug for issue', location='path', status_code=404)
    return False


def valid_new_issue(request):
    """
    Verifies given data for a new issue

    :param request:
    :return:
    """
    fn_validator = has_keywords(('title', str), ('info', str), ('long_info', str))
    if not fn_validator(request):
        return False
    title = escape_if_string(request.validated, 'title')
    info = escape_if_string(request.validated, 'info')
    long_info = escape_if_string(request.validated, 'long_info')
    db_dup1 = DBDiscussionSession.query(Issue).filter_by(title=title).all()
    db_dup2 = DBDiscussionSession.query(Issue).filter_by(info=info).all()
    db_dup3 = DBDiscussionSession.query(Issue).filter_by(long_info=long_info).all()
    if db_dup1 or db_dup2 or db_dup3:
        _tn = Translator(get_language_from_cookie(request))
        add_error(request, 'Issue data is a duplicate', _tn.get(_.duplicate))
        return False
    return True


def valid_issue_not_readonly(request):
    """
    Get issue from database and verify that it is not read-only.

    :param request:
    :return:
    """
    if valid_issue_by_id(request) and not request.validated.get('issue').is_read_only:
        return True
    _tn = Translator(get_language_from_cookie(request))
    add_error(request, 'Issue is read only', _tn.get(_.discussionIsReadOnly))
    return False


def valid_conclusion(request):
    """
    Given a conclusion id, query the object from the database and return it in the request.

    :param request:
    :return:
    """
    conclusion_id = request.json_body.get('conclusion_id')
    issue = request.validated.get('issue')
    _tn = Translator(get_language_from_cookie(request))

    if not issue:
        find_issue_in_request = issue_handler.get_issue_id(request)
        if find_issue_in_request:
            issue = DBDiscussionSession.query(Issue).get(issue_handler.get_issue_id(request))
        else:
            add_error(request, 'Issue is missing', _tn.get(_.issueNotFound))
            return False

    if conclusion_id and isinstance(conclusion_id, int):
        db_conclusion = DBDiscussionSession.query(Statement).filter_by(uid=conclusion_id,
                                                                       issue_uid=issue.uid,
                                                                       is_disabled=False).first()
        if db_conclusion:
            request.validated['conclusion'] = db_conclusion
            return True
        else:
            add_error(request, 'Conclusion is missing', _tn.get(_.conclusionIsMissing))
            return False
    else:
        _tn = Translator(get_language_from_cookie(request))
        add_error(request, 'Conclusion id is missing', _tn.get(_.conclusionIsMissing))
        return False


def valid_position(request):
    """
    Check if given statement is a position and belongs to the queried issue.

    :param request: Request
    :return:
    """
    if not valid_issue_by_slug(request):
        return False

    if has_keywords_in_path(('position_id', int))(request):
        position_id = request.validated['position_id']
        db_position: Statement = DBDiscussionSession.query(Statement).get(position_id)
        if not db_position.is_startpoint:
            add_error(request, 'Queried statement is not a valid position', location='path')
            return False
        if db_position.issue_uid != request.validated['issue'].uid:
            add_error(request, 'Position does not belong to the queried issue', location='path')
            return False
        request.validated['position']: Statement = db_position
        return True
    return False


def valid_statement_or_arg_id(request):
    """
    Check if given Statement or Argument belongs to the queried issue and return the Statement.

    .. note:: Maybe we need to return the argument too? Currently it is only the statement which is returned.

    :param request: Request
    :return:
    """
    if not valid_issue_by_slug(request):
        return False

    db_issue: Issue = request.validated['issue']
    if has_keywords_in_path(('statement_or_arg_id', int))(request):
        statement_or_arg_id = request.validated['statement_or_arg_id']
        db_statement: Statement = DBDiscussionSession.query(Statement).get(statement_or_arg_id)
        db_argument: Argument = DBDiscussionSession.query(Argument).filter(
            Argument.conclusion_uid == db_statement.uid).first()
        if not db_argument:
            print("foo")
            from pprint import pprint
            pprint(db_statement.uid)
            add_error(request,
                      'The queried statement {} is not an argument of the issue \'{}\''.format(db_statement.uid,
                                                                                               db_issue.title),
                      location='path', status_code=410)
            return False
        elif not db_statement.issue_uid == db_argument.issue_uid == db_issue.uid:
            print("foo2")
            add_error(request,
                      'Statement / Argument with uid {} does not belong to the queried issue'.format(db_statement.uid),
                      'db_issue.uid = {}, stmt = {}, arg = {}, issue = {}'.format(db_issue.uid,
                                                                                  db_statement.issue_uid,
                                                                                  db_argument.issue_uid,
                                                                                  db_issue.title),
                      location='path')
            return False
        if db_statement.is_disabled:
            print("foo3")
            add_error(request, 'Statement / Argument is disabled', location='path', status_code=410)
            return False

        request.validated['stmt_or_arg']: Statement = db_statement
        return True
    return False


def valid_attitude(request):
    """
    Check if given statement is a position and belongs to the queried issue.

    :param request: Request
    :return:
    """
    attitudes = ['agree', 'disagree', 'dontknow']

    if has_keywords_in_path(('attitude', str))(request):
        attitude = request.validated['attitude']
        if attitude not in attitudes:
            add_error(request, 'Your attitude is not correct. Received \'{}\', expected one of {}'.format(attitude, attitudes),
                      location='path')
            return False
        return True
    return False


def valid_relation_optional(request):
    """
    Parse relation from path if provided. Else return None. Should only fail if wrong relation is given.

    :param request: Request
    :return:
    """
    relations_from_path = request.matchdict['relation']
    if not relations_from_path:
        request.validated['relation'] = ''
        return True

    relations = ['undermine', 'undercut', 'rebut']
    relation = relations_from_path[0]
    if relation not in relations:
        add_error(request, 'Your relation is not correct. Received \'{}\', expected one of {}'.format(relation, relations),
                  location='path')
        return False

    request.validated['relation'] = relation
    return True


def valid_statement(request):
    """
    Given a uid, query the statement object from the database and return it in the request.

    :param request:
    :return:
    """
    statement_id = request.json_body.get('uid')
    db_statement = None
    if is_integer(statement_id):
        db_statement = DBDiscussionSession.query(Statement).filter(Statement.uid == statement_id,
                                                                   Statement.is_disabled == False).first()

    if db_statement:
        request.validated['statement'] = db_statement
        return True
    else:
        _tn = Translator(get_language_from_cookie(request))
        add_error(request, 'Statement uid is missing', _tn.get(_.wrongStatement))
        return False


def valid_argument(request):
    """
    Given an uid, query the argument object from the database and return it in the request.

    :param request:
    :return:
    """
    argument_id = request.json_body.get('uid')
    db_argument = None
    if is_integer(argument_id):
        db_argument = DBDiscussionSession.query(Argument).filter(Argument.uid == argument_id,
                                                                 Argument.is_disabled == False).first()

    if db_argument:
        request.validated['argument'] = db_argument
        return True
    else:
        _tn = Translator(get_language_from_cookie(request))
        add_error(request, 'Argument uid is missing', _tn.get(_.wrongArgument))
        return False


def valid_text_length_of(keyword):
    """
    Validate the correct length of a statement's or news titles or ... input.

    :param keyword:
    :return:
    """

    def inner(request):
        min_length = int(environ.get('MIN_LENGTH_OF_STATEMENT', 10))
        text = escape_if_string(request.json_body, keyword)
        print(text)

        if not text or text and len(text) < min_length:
            __set_min_length_error(request, min_length)
            return False
        else:
            request.validated[keyword] = text
            return True

    return inner


def valid_premisegroup(request):
    """
    Validates the uid of a premisegroup

    :param request:
    :return:
    """
    pgroup_uid = request.json_body.get('uid')
    db_pgroup = None
    if is_integer(pgroup_uid):
        db_pgroup = DBDiscussionSession.query(PremiseGroup).get(pgroup_uid)

    if db_pgroup:
        request.validated['pgroup'] = db_pgroup
        return True
    else:
        _tn = Translator(get_language_from_cookie(request))
        add_error(request, 'PGroup uid is missing', _tn.get(_.internalError))
        return False


def valid_premisegroups(request):
    """
    Validates the correct build of premisegroups

    :param request:
    :return:
    """
    premisegroups = request.json_body.get('premisegroups')
    if not premisegroups \
            or not isinstance(premisegroups, list) \
            or not all([isinstance(l, list) for l in premisegroups]):
        _tn = Translator(get_language_from_cookie(request))
        add_error(request, 'Invalid conclusion id', _tn.get(_.requestFailed))
        return False

    min_length = int(environ.get('MIN_LENGTH_OF_STATEMENT', 10))
    for premisegroup in premisegroups:
        for premise in premisegroup:
            if isinstance(premise, str):
                if len(premise) < min_length:
                    __set_min_length_error(request, min_length)
                    return False
            else:
                add_error(request, 'At least one premise isn\'t a string!')
                return False

    request.validated['premisegroups'] = premisegroups
    return True


def valid_statement_or_argument(request):
    is_argument = request.json_body.get('is_argument')
    t = Argument if is_argument else Statement
    uid = request.json_body.get('uid')
    if uid:
        db_arg_or_stmt = DBDiscussionSession.query(t).get(uid)
    else:
        add_error(request, 'Missing uid for ' + t.__name__)
        return False

    if db_arg_or_stmt:
        request.validated['arg_or_stmt'] = db_arg_or_stmt
        return True
    else:
        add_error(request, t.__name__ + ' is invalid')
        return False


def valid_text_values(request):
    min_length = int(environ.get('MIN_LENGTH_OF_STATEMENT', 10))
    tvalues = escape_if_string(request.json_body, 'text_values')
    if not tvalues:
        __set_min_length_error(request, min_length)
        return False

    error = False
    for text in tvalues:
        if len(text) < min_length:
            __set_min_length_error(request, min_length)
            error = True

    if not error:
        request.validated['text_values'] = tvalues
        return True
    return False


# -----------------------------------------------------------------------------
# Helper functions

def __set_min_length_error(request, min_length):
    """
    Add an error to the request due to too short statements text.

    :param request:
    :param min_length: minimum length of the statement
    :return:
    """
    _tn = Translator(get_language_from_cookie(request))
    a = _tn.get(_.notInsertedErrorBecauseEmpty)
    b = _tn.get(_.minLength)
    c = _tn.get(_.eachStatement)
    error_msg = '{} ({}: {} {})'.format(a, b, min_length, c)
    add_error(request, 'Text too short', error_msg)
