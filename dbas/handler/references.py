import transaction

from urllib.parse import urlparse

from dbas.database import DBDiscussionSession
from dbas.database.discussion_model import StatementReferences, User
from dbas.query_wrapper import get_enabled_arguments_as_query, get_enabled_premises_as_query
from dbas.lib import get_text_for_statement_uid, get_profile_picture
from dbas.logger import logger
from dbas.input_validator import is_integer


def get_references_for_argument(uid, main_page):
    """
    Returns all references for the premises group of given argument

    :param uid: uid of the argument
    :param main_page: current main page
    :return: dict
    """
    logger('ReferenceHelper', str(uid))

    if not is_integer(uid):
        return {}, {}

    db_arguments = get_enabled_arguments_as_query()
    db_argument = db_arguments.filter_by(uid=uid).first()
    if not db_argument:
        return {}, {}

    db_premises = get_enabled_premises_as_query()
    db_premises = db_premises.filter_by(premisegroup_uid=db_argument.premisegroup_uid).all()

    data = {}
    text = {}
    for premise in db_premises:
        tmp_uid = premise.statement_uid
        references_array = __get_references_for_statement(tmp_uid, main_page)[tmp_uid]
        data[premise.statement_uid] = references_array
        text[premise.statement_uid] = premise.get_text()

    if db_argument.conclusion_uid is not None:
        tmp_uid = db_argument.conclusion_uid
        references_array = __get_references_for_statement(tmp_uid, main_page)[tmp_uid]
        data[tmp_uid] = references_array
        text[tmp_uid] = get_text_for_statement_uid(tmp_uid)
    else:
        d, t = get_references_for_argument(db_argument.argument_uid, main_page)
        data.update(d)
        text.update(t)

    return data, text


def get_references_for_statements(uids, main_page):
    """
    Returns all references for the current given statements

    :param uid: uids of the statement
    :param main_page: current main page
    :return: dict
    """
    data = {}
    text = {}
    for uid in uids:
        references_array = __get_references_for_statement(uid, main_page)[uid]
        data[uid] = references_array
        text[uid] = get_text_for_statement_uid(uid)
    return data, text


def __get_references_for_statement(uid, main_page):
    """
    Returns all references for the current given statement

    :param uid: uid of the statement
    :param main_page: current main page
    :return: dict
    """
    logger('ReferenceHelper', str(uid))
    db_references = DBDiscussionSession.query(StatementReferences).filter_by(statement_uid=uid).all()
    references_array = [__get_values_of_reference(ref, main_page) for ref in db_references]
    return {uid: references_array}


def __get_values_of_reference(reference: StatementReferences, main_page):
    """
    Creates dictionary with all values of the column

    :param reference: Current database row
    :param main_page: current main page
    :return: Dictionary with all columns
    """
    db_user = DBDiscussionSession.query(User).get(int(reference.author_uid))

    img = get_profile_picture(db_user, 20, True)
    name = db_user.global_nickname
    link = main_page + '/user/' + str(db_user.uid)

    return {'uid': reference.uid,
            'reference': reference.reference,
            'host': reference.host,
            'path': reference.path,
            'author': {'img': img,
                       'name': name,
                       'link': link},
            'created': str(reference.created.humanize),
            'statement_text': reference.get_statement_text()}


def set_reference(reference, url, db_user, db_statement, issue_uid):
    """
    Creates a new reference

    :param reference: Text of the reference
    :param db_user: User
    :param db_statement: Statement
    :param issue_uid: current issue uid
    :return: Boolean
    """
    parsed_url = urlparse(url)
    host = '{}://{}'.format(parsed_url.scheme, parsed_url.netloc)
    path = '{}?{}'.format(parsed_url.path, parsed_url.query)

    DBDiscussionSession.add(StatementReferences(reference, host, path, db_user.uid, db_statement.uid, issue_uid))
    DBDiscussionSession.flush()
    transaction.commit()

    return True


def get_references(uids, is_argument, application_url) -> dict:
    """
    Returns references for an argument or statement.

    :param uids: IDs of statements or arguments as list
    :param is_argument: boolean if the ids are for arguments
    :param application_url: url of the application
    :rtype: dict
    :return: prepared collection with error, data and text field
    """
    if is_argument:
        data, text = get_references_for_argument(uids, application_url)
    else:
        data, text = get_references_for_statements(uids, application_url)

    return {
        'data': data,
        'text': text
    }
