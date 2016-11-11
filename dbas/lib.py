"""
Common, pure functions used by the D-BAS.


.. codeauthor:: Tobias Krauthoff <krauthoff@cs.uni-duesseldorf.de
"""
import hashlib
import locale
import time
from collections import defaultdict
from datetime import datetime
from html import escape
from urllib import parse

from dbas.database import DBDiscussionSession
from dbas.database.discussion_model import Argument, Premise, Statement, TextVersion, Issue, Language, User, Settings, \
    VoteArgument, VoteStatement, Group
from dbas.strings.keywords import Keywords as _
from dbas.strings.text_generator import TextGenerator
from dbas.strings.translator import Translator, get_translation
from sqlalchemy import and_, func

fallback_lang = 'en'


def escape_string(text):
    """
    Escapes all html special chars.

    :param text: string
    :return: html.escape(text)
    """
    return escape(text)


def get_language(request, current_registry):
    """
    Returns current ui locales code which is saved in current cookie or the registry.

    :param request: request
    :param current_registry: get_current_registry()
    :return: language abrreviation
    """
    try:
        lang = request.cookies['_LOCALE_']
    except (KeyError, AttributeError):
        lang = current_registry.settings['pyramid.default_locale_name']
    return str(lang)


def get_discussion_language(request, current_issue_uid=1):
    """
    Returns Language.ui_locales
    CALL AFTER issue_helper.get_id_of_slug(..)!

    :param request: self.request
    :return:
    """
    # first matchdict, then params, then session, afterwards fallback
    issue = request.matchdict['issue'] if 'issue' in request.matchdict \
        else request.params['issue'] if 'issue' in request.params \
        else request.session['issue'] if 'issue' in request.session \
        else current_issue_uid

    db_lang = DBDiscussionSession.query(Issue).filter_by(uid=issue).join(Language).first()

    return db_lang.languages.ui_locales if db_lang else 'en'


def sql_timestamp_pretty_print(ts, lang, humanize=True, with_exact_time=False):
    """
    Pretty printing for sql timestamp in dependence of the language.

    :param ts: timestamp (arrow) as string
    :param lang: language
    :param humanize: Boolean
    :param with_exact_time: Boolean
    :return:
    """
    ts = ts.replace(hours=-2)
    if humanize:
        # if lang == 'de':
        ts = ts.to('Europe/Berlin')
        # else:
        #    ts = ts.to('US/Pacific')
        return ts.humanize(locale=lang)
    else:
        if lang == 'de':
            return ts.format('DD.MM.YYYY' + (', HH:mm:ss ' if with_exact_time else ''))
        else:
            return ts.format('YYYY-MM-DD' + (', HH:mm:ss ' if with_exact_time else ''))


def python_datetime_pretty_print(ts, lang):
    """


    :param ts:
    :param lang:
    :return:
    """
    formatter = '%d. %b.'
    if lang == 'de':
        try:
            locale.setlocale(locale.LC_TIME, 'de_DE.UTF-8')
            formatter = '%b. %Y'
        except locale.Error:
            locale.setlocale(locale.LC_TIME, 'en_US.UTF8')

    return datetime.strptime(str(ts), '%Y-%m-%d').strftime(formatter)


def get_all_arguments_by_statement(statement_uid, include_disabled=False):
    """
    Returns a list of all arguments where the statement is a conclusion or member of the premisegroup

    :param statement_uid: Statement.uid
    :param include_disabled: Boolean
    :return: [Arguments]
    """

    db_arguments = DBDiscussionSession.query(Argument).filter_by(
        is_disabled=include_disabled,
        conclusion_uid=statement_uid
    ).all()

    premises = DBDiscussionSession.query(Premise).filter_by(
        is_disabled=include_disabled,
        statement_uid=statement_uid
    ).all()

    return_array = db_arguments if db_arguments else []

    for premise in premises:
        db_arguments = DBDiscussionSession.query(Argument).filter_by(is_disabled=include_disabled,
                                                                     premisesgroup_uid=premise.premisesgroup_uid).all()

        if db_arguments:
            return_array = return_array + db_arguments

    return return_array if len(return_array) > 0 else None


def get_text_for_argument_uid(uid, with_html_tag=False, start_with_intro=False, first_arg_by_user=False,
                              user_changed_opinion=False, rearrange_intro=False, colored_position=False,
                              attack_type=None, minimize_on_undercut=False):
    """
    Returns current argument as string like "conclusion, because premise1 and premise2"

    :param uid: Integer
    :param with_html_tag: Boolean
    :param start_with_intro: Boolean
    :param first_arg_by_user: Boolean
    :param user_changed_opinion: Boolean
    :param rearrange_intro: Boolean
    :param colored_position: Boolean
    :param attack_type: Boolean
    :param minimize_on_undercut: Boolean
    :return: String
    """
    db_argument = DBDiscussionSession.query(Argument).get(uid)
    if not db_argument:
        return None

    lang = db_argument.lang
    # catch error

    _t = Translator(lang)

    # getting all argument id
    arg_array = [db_argument.uid]
    while db_argument.argument_uid:
        db_argument = DBDiscussionSession.query(Argument).filter_by(uid=db_argument.argument_uid).first()
        arg_array.append(db_argument.uid)

    if attack_type == 'jump':
        return __build_argument_for_jump(arg_array, with_html_tag)

    if len(arg_array) == 1:
        # build one argument only
        return __build_single_argument(arg_array[0], rearrange_intro, with_html_tag, colored_position, attack_type, _t,
                                       start_with_intro)

    else:
        # get all pgroups and at last, the conclusion
        sb = '<' + TextGenerator.tag_type + '>' if with_html_tag else ''
        se = '</' + TextGenerator.tag_type + '>' if with_html_tag else ''
        doesnt_hold_because = ' ' + se + _t.get(_.doesNotHold).lower() + ' ' + _t.get(_.because).lower() + ' ' + sb
        return __build_nested_argument(arg_array, first_arg_by_user, user_changed_opinion, with_html_tag,
                                       start_with_intro, doesnt_hold_because, lang, minimize_on_undercut)


def get_all_arguments_with_text_by_statement_id(statement_uid):
    """
    Given a statement_uid, it returns all arguments, which use this statement and adds
    the corresponding text to it, which normally appears in the bubbles. The resulting
    text depends on the provided language.

    :param statement_uid: uid to a statement, which should be analyzed
    :return: list of dictionaries containing some properties of these arguments
    :rtype: list
    """
    arguments = get_all_arguments_by_statement(statement_uid)
    results = list()
    if arguments:
        for argument in arguments:
            results.append({"uid": argument.uid,
                            "text": get_text_for_argument_uid(argument.uid)})
        return results


def get_all_arguments_with_text_and_url_by_statement_id(statement_uid, urlmanager, color_statement=False):
    """
    Given a statement_uid, it returns all arguments, which use this statement and adds
    the corresponding text to it, which normally appears in the bubbles. The resulting
    text depends on the provided language.

    :param statement_uid: Id to a statement, which should be analyzed
    :param color_statement: True, if the statement (specified by the ID) should be colored
    :return: list of dictionaries containing some properties of these arguments
    :rtype: list
    """
    arguments = get_all_arguments_by_statement(statement_uid)
    results = list()
    sb = ('<' + TextGenerator.tag_type + ' data-argumentation-type="position">') if color_statement else ''
    se = ('</' + TextGenerator.tag_type + '>') if color_statement else ''
    if arguments:
        for argument in arguments:
            statement_text = get_text_for_statement_uid(statement_uid)
            argument_text = get_text_for_argument_uid(argument.uid)
            pos = argument_text.lower().find(statement_text.lower())
            argument_text = argument_text[0:pos] + sb + argument_text[pos:pos + len(statement_text)] + se + argument_text[pos + len(statement_text):]
            results.append({'uid': argument.uid,
                            'text': argument_text,
                            'url': urlmanager.get_url_for_jump(False, argument.uid)})
        return results


def get_slug_by_statement_uid(uid):
    """

    :param uid:
    :return:
    """
    db_statement = DBDiscussionSession.query(Statement).get(uid)
    return resolve_issue_uid_to_slug(db_statement.issue_uid)


def __build_argument_for_jump(arg_array, with_html_tag):
    """

    :param arg_array:
    :param with_html_tag:
    :return:
    """
    from dbas.logger import logger
    logger('x', 'x', str(arg_array))
    tag_premise = ('<' + TextGenerator.tag_type + ' data-argumentation-type="argument">') if with_html_tag else ''
    tag_conclusion = ('<' + TextGenerator.tag_type + ' data-argumentation-type="attack">') if with_html_tag else ''
    tag_end = ('</' + TextGenerator.tag_type + '>') if with_html_tag else ''
    lang = DBDiscussionSession.query(Argument).get(arg_array[0]).lang
    _t = Translator(lang)

    if len(arg_array) == 1:
        db_argument = DBDiscussionSession.query(Argument).get(arg_array[0])
        premises, uids = get_text_for_premisesgroup_uid(db_argument.premisesgroup_uid)
        conclusion = get_text_for_statement_uid(db_argument.conclusion_uid)

        if lang == 'de':
            intro = _t.get(_.rebut1) if db_argument.is_supportive else _t.get(_.overbid1)
            ret_value = tag_conclusion + intro[0:1].upper() + intro[1:] + ' ' + conclusion + tag_end
            ret_value += ' ' + _t.get(_.because).lower() + ' ' + tag_premise + premises + tag_end
        else:
            ret_value = tag_conclusion + conclusion + ' ' + (
                _t.get(_.isNotRight).lower() if not db_argument.is_supportive else '') + tag_end
            ret_value += ' ' + _t.get(_.because).lower() + ' '
            ret_value += tag_premise + premises + tag_end

    else:
        db_argument = DBDiscussionSession.query(Argument).filter_by(uid=arg_array[1]).first()
        conclusions_premises, uids = get_text_for_premisesgroup_uid(db_argument.premisesgroup_uid)
        if db_argument.conclusion_uid:
            conclusions_conclusion = get_text_for_statement_uid(db_argument.conclusion_uid)
        else:
            conclusions_conclusion = get_text_for_argument_uid(db_argument.argument_uid)

        db_argument = DBDiscussionSession.query(Argument).filter_by(uid=arg_array[0]).first()
        premises, uids = get_text_for_premisesgroup_uid(db_argument.premisesgroup_uid)

        ret_value = tag_conclusion + conclusions_premises + ' '
        ret_value += _t.get(_.doesNotJustify) + ' '
        ret_value += conclusions_conclusion + tag_end + ' '
        ret_value += _t.get(_.because).lower() + ' ' + tag_premise + premises + tag_end

    return ret_value


def __build_single_argument(uid, rearrange_intro, with_html_tag, colored_position, attack_type, _t, start_with_intro):
    """

    :param uid:
    :param rearrange_intro:
    :param with_html_tag:
    :param colored_position:
    :param attack_type:
    :param _t:
    :param start_with_intro:
    :return:
    """
    db_argument = DBDiscussionSession.query(Argument).filter_by(uid=uid).first()
    premises, uids = get_text_for_premisesgroup_uid(db_argument.premisesgroup_uid)
    conclusion = get_text_for_statement_uid(db_argument.conclusion_uid)
    lang = DBDiscussionSession.query(Argument).get(uid).lang

    if lang != 'de':
        # conclusion = conclusion[0:1].lower() + conclusion[1:]  # pretty print
        premises = premises[0:1].lower() + premises[1:]  # pretty print

    sb_tmp = ''
    se = '</' + TextGenerator.tag_type + '>' if with_html_tag else ''
    if attack_type not in ['dont_know', 'jump']:
        sb = '<' + TextGenerator.tag_type + '>' if with_html_tag else ''
        if colored_position:
            sb = '<' + TextGenerator.tag_type + ' data-argumentation-type="position">' if with_html_tag else ''
    else:
        sb = '<' + TextGenerator.tag_type + ' data-argumentation-type="argument">'
        sb_tmp = '<' + TextGenerator.tag_type + ' data-argumentation-type="attack">'

    # color_everything = attack_type == 'undercut' and False
    if attack_type not in ['dont_know', 'jump']:
        if attack_type == 'undermine':
            premises = sb + premises + se
        else:
            conclusion = sb + conclusion + se
    else:
        premises = sb + premises + se
        conclusion = sb_tmp + conclusion + se
    # if not color_everything:

    if lang == 'de':
        if rearrange_intro:
            intro = _t.get(_.itTrueIsThat) if db_argument.is_supportive else _t.get(_.itFalseIsThat)
        else:
            intro = _t.get(_.itIsTrueThat) if db_argument.is_supportive else _t.get(_.itIsFalseThat)

        # if color_everything:
        #     ret_value = sb + intro[0:1].upper() + intro[1:] + ' ' + conclusion + se
        # else:
        if start_with_intro:
            ret_value = intro[0:1].upper() + intro[1:] + ' '
        else:
            ret_value = (_t.get(_.statementIsAbout) + ' ') if lang == 'de' else ''
        ret_value += conclusion
        ret_value += ', ' if lang == 'de' else ' '
        ret_value += _t.get(_.because).lower() + ' ' + premises
    else:
        tmp = sb + ' ' + _t.get(_.isNotRight).lower() + se + ', ' + _t.get(_.because).lower() + ' '
        ret_value = conclusion + ' '
        ret_value += _t.get(_.because).lower() if db_argument.is_supportive else tmp
        ret_value += ' ' + premises

    # if color_everything:
    #     return sb + ret_value + se
    # else:
    return ret_value


def __build_nested_argument(arg_array, first_arg_by_user, user_changed_opinion, with_html_tag, start_with_intro,
                            doesnt_hold_because, lang, minimize_on_undercut):
    """

    :param arg_array:
    :param local_lang:
    :param first_arg_by_user:
    :param user_changed_opinion:
    :param with_html_tag:
    :param start_with_intro:
    :param doesnt_hold_because:
    :param _t:
    :return:
    """

    # get all pgroups and at last, the conclusion
    pgroups = []
    supportive = []
    arg_array = arg_array[::-1]
    local_lang = DBDiscussionSession.query(Argument).get(arg_array[0]).lang
    for uid in arg_array:
        db_argument = DBDiscussionSession.query(Argument).filter_by(uid=uid).first()
        text, tmp = get_text_for_premisesgroup_uid(db_argument.premisesgroup_uid)
        pgroups.append((text[0:1].lower() + text[1:]) if local_lang != 'de' else text)
        supportive.append(db_argument.is_supportive)
    uid = DBDiscussionSession.query(Argument).filter_by(uid=arg_array[0]).first().conclusion_uid
    conclusion = get_text_for_statement_uid(uid)

    sb = '<{} data-argumentation-type="position">'.format(TextGenerator.tag_type) if with_html_tag else ''
    se = '</{}>'.format(TextGenerator.tag_type) if with_html_tag else ''

    because = ', ' if local_lang == 'de' else ' '
    because += get_translation(_.because, lang).lower() + ' '

    if len(arg_array) % 2 is 0 and not first_arg_by_user:  # system starts
        ret_value = get_translation(_.earlierYouArguedThat, lang) if user_changed_opinion else get_translation(
            _.otherUsersSaidThat, lang) + ' '
        users_opinion = True  # user after system
        if local_lang != 'de':
            conclusion = conclusion[0:1].lower() + conclusion[1:]  # pretty print
    else:  # user starts
        ret_value = (get_translation(_.soYourOpinionIsThat, lang) + ': ') if start_with_intro else ''
        users_opinion = False  # system after user
        conclusion = se + conclusion[0:1].upper() + conclusion[1:]  # pretty print
    ret_value += conclusion + (because if supportive[0] else doesnt_hold_because) + pgroups[0] + '.'

    # just display the last premise group on undercuts, because the story is always saved in all bubbles
    if minimize_on_undercut and not user_changed_opinion and len(pgroups) > 2:
        return get_translation(_.butYouCounteredWith, lang) + ' ' + sb + pgroups[len(pgroups) - 1] + se + '.'

    for i, pgroup in enumerate(pgroups):
        ret_value += ' '
        if users_opinion:
            ret_value += get_translation(
                _.otherParticipantsConvincedYouThat if user_changed_opinion else _.butYouCounteredWith, lang)
        else:
            ret_value += get_translation(_.otherUsersHaveCounterArgument, lang)

        ret_value += ' {}{}{}.'.format(sb, pgroup, se) if i == len(pgroups) - 1 else ' {} '.format(pgroup)
        users_opinion = not users_opinion

    return ret_value


def get_text_for_premisesgroup_uid(uid):
    """
    Returns joined text of the premise group and the premise ids

    :param uid: premisesgroup_uid
    :return: text, uids
    """
    db_premises = DBDiscussionSession.query(Premise).filter_by(premisesgroup_uid=uid).join(Statement).all()
    uids = []
    texts = []
    if len(db_premises) > 0:
        lang = DBDiscussionSession.query(Statement).get(db_premises[0].statements.uid).lang
    else:
        return '', uids

    _t = Translator(lang)

    for premise in db_premises:
        tmp = get_text_for_statement_uid(premise.statements.uid)
        if lang != 'de':
            tmp[0:1].lower() + tmp[1:]
        uids.append(str(premise.statements.uid))
        texts.append(str(tmp))

    return ' {} '.format(_t.get(_.aand)).join(texts), uids


def get_text_for_statement_uid(uid, colored_position=False):
    """
    Returns text of statement with given uid

    :param uid: Statement.uid
    :param colored_position: Boolean
    :return: String
    """
    try:
        if isinstance(int(uid), int):
            db_statement = DBDiscussionSession.query(Statement).filter_by(uid=uid).first()
            if not db_statement:
                return None

            db_textversion = DBDiscussionSession.query(TextVersion).order_by(TextVersion.uid.desc()).filter_by(
                uid=db_statement.textversion_uid).first()
            content = db_textversion.content

            while content.endswith(('.', '?', '!')):
                content = content[:-1]

            sb = '<' + TextGenerator.tag_type + ' data-argumentation-type="position">' if colored_position else ''
            se = '</' + TextGenerator.tag_type + '>' if colored_position else ''
            return sb + content + se

    except (ValueError, TypeError):
        return None


def get_text_for_premise(uid, colored_position=False):
    """
    Returns text of premise with given uid

    :param uid: Statement.uid
    :param colored_position: Boolean
    :return: String
    """
    db_premise = DBDiscussionSession.query(Premise).filter_by(uid).first()
    if db_premise:
        return get_text_for_statement_uid(db_premise.statement_uid, colored_position)
    else:
        return None


def get_text_for_conclusion(argument, start_with_intro=False, rearrange_intro=False):
    """
    Check the arguments conclusion whether it is an statement or an argument and returns the text

    :param argument: Argument
    :param lang: ui_locales
    :param start_with_intro: Boolean
    :param rearrange_intro: Boolean
    :return: String
    """
    if argument.argument_uid:
        return get_text_for_argument_uid(argument.argument_uid, start_with_intro, rearrange_intro=rearrange_intro)
    else:
        return get_text_for_statement_uid(argument.conclusion_uid)


def resolve_issue_uid_to_slug(uid):
    """
    Given the issue uid query database and return the correct slug of the issue.

    :param uid: issue_uid
    :type uid: int
    :return: Slug of issue
    :rtype: str
    """
    issue = DBDiscussionSession.query(Issue).filter_by(uid=uid).first()
    return issue.get_slug() if issue else None


def get_all_attacking_arg_uids_from_history(history):
    """
    Returns all arguments of the history, which attacked the user

    :param history: String
    :return: [Arguments.uid]
    :rtype: list
    """
    try:
        splitted_history = history.split('-')
        uids = []
        for part in splitted_history:
            if 'reaction' in part:
                tmp = part.replace('/', 'X', 2).find('/') + 1
                uids.append(part[tmp])
        return uids
    except AttributeError:
        return []


def get_user_by_private_or_public_nickname(nickname):
    """
    Gets the user by his (public) nickname, based on the option, whether his nickname is public or not

    :param nickname: Nickname of the user
    :return: Current user or None
    """
    db_user = get_user_by_case_insensitive_nickname(nickname)
    db_public_user = get_user_by_case_insensitive_public_nickname(nickname)

    db_settings = None
    current_user = None

    if db_user:
        db_settings = DBDiscussionSession.query(Settings).filter_by(author_uid=db_user.uid).first()
    elif db_public_user:
        db_settings = DBDiscussionSession.query(Settings).filter_by(author_uid=db_public_user.uid).first()

    if db_settings:
        if db_settings.should_show_public_nickname and db_user:
            current_user = db_user
        elif not db_settings.should_show_public_nickname and db_public_user:
            current_user = db_public_user

    return current_user


def get_user_by_case_insensitive_nickname(nickname):
    """
    :param nickname:
    :return:
    """
    return DBDiscussionSession.query(User).filter(func.lower(User.nickname) == func.lower(nickname)).first()


def get_user_by_case_insensitive_public_nickname(public_nickname):
    """
    :param public_nickname:
    :return:
    """
    return DBDiscussionSession.query(User).filter(
        func.lower(User.public_nickname) == func.lower(public_nickname)).first()


def create_speechbubble_dict(is_user=False, is_system=False, is_status=False, is_info=False, is_flagable=False,
                             is_author=False, uid='', url='', message='', omit_url=False, argument_uid=None,
                             statement_uid=None, is_supportive=None, nickname='anonymous', lang='en'):
    """
    Creates an dictionary which includes every information needed for a bubble.

    :param is_user: Boolean
    :param is_system: Boolean
    :param is_status: Boolean
    :param is_info: Boolean
    :param is_flagable: Boolean
    :param uid: Argument.uid
    :param url: URL
    :param message: String
    :param omit_url: Boolean
    :param argument_uid: Argument.uid
    :param statement_uid: Statement.uid
    :param is_supportive: Boolean
    :param nickname: String
    :param lang: String
    :return: dict()
    """
    speech = {'is_user': is_user,
              'is_system': is_system,
              'is_status': is_status,
              'is_info': is_info,
              'is_flagable': is_flagable,
              'is_author': is_author,
              'id': uid if len(str(uid)) > 0 else str(time.time()),
              'url': url if len(str(url)) > 0 else 'None',
              'message': message,
              'omit_url': omit_url,
              'data_type': 'argument' if argument_uid else 'statement' if statement_uid else 'None',
              'data_argument_uid': str(argument_uid), 'data_statement_uid': str(statement_uid),
              'data_is_supportive': str(is_supportive),
              # 'url': url if len(str(url)) > 0 else 'None'
              }
    db_votecounts = None

    if is_supportive is None:
        is_supportive = False

    if not nickname:
        nickname = 'anonymous'
    db_user = DBDiscussionSession.query(User).filter_by(nickname=nickname).first()
    if not db_user:
        db_user = DBDiscussionSession.query(User).filter_by(nickname='anonymous').first()

    if argument_uid:
        db_votecounts = DBDiscussionSession.query(VoteArgument). \
            filter(and_(VoteArgument.argument_uid == argument_uid,
                        VoteArgument.is_up_vote == is_supportive,
                        VoteArgument.is_valid,
                        VoteArgument.author_uid != db_user.uid)). \
            all()

    elif statement_uid:
        db_votecounts = DBDiscussionSession.query(VoteStatement). \
            filter(and_(VoteStatement.statement_uid == statement_uid,
                        VoteStatement.is_up_vote == is_supportive,
                        VoteStatement.is_valid,
                        VoteStatement.author_uid != db_user.uid)). \
            all()
    _t = Translator(lang)
    speech['votecounts'] = len(db_votecounts) if db_votecounts else 0

    votecount_keys = defaultdict(lambda: "{} {}.".format(speech['votecounts'], _t.get(_.voteCountTextMore)))
    votecount_keys[0] = _t.get(_.voteCountTextFirst) + '.'
    votecount_keys[1] = _t.get(_.voteCountTextOneOther) + '.'

    speech['votecounts_message'] = votecount_keys[speech['votecounts']]

    return speech


def is_user_author(nickname):
    """
    Check, if the given uid has admin rights or is admin

    :param nickname: current user name
    :return: true, if user is admin, false otherwise
    """
    db_user = DBDiscussionSession.query(User).filter_by(nickname=str(nickname)).first()
    db_admin_group = DBDiscussionSession.query(Group).filter_by(name='admins').first()
    db_author_group = DBDiscussionSession.query(Group).filter_by(name='authors').first()
    #  logger('Lib', 'is_user_author', 'main')
    if db_user:
        if db_user.group_uid == db_author_group.uid or db_user.group_uid == db_admin_group.uid:
            return True

    return False


def is_user_admin(nickname):
    """
    Check, if the given uid has admin rights or is admin

    :param nickname: current user name
    :return: true, if user is admin, false otherwise
    """
    db_user = DBDiscussionSession.query(User).filter_by(nickname=str(nickname)).first()
    db_admin_group = DBDiscussionSession.query(Group).filter_by(name='admins').first()
    #  logger('Lib', 'is_user_author', 'main')
    return db_user and db_user.group_uid == db_admin_group.uid


def is_argument_disabled_due_to_disabled_statements(argument):
    """
    Returns true if any involved statement is disabled.

    :param argument: Argument
    :return: Boolean
    """
    if argument.conclusion_uid is None:
        # check conclusion of given arguments conclusion
        db_argument = DBDiscussionSession.query(Argument).filter_by(uid=argument.argument_uid).first()
        conclusion = DBDiscussionSession(Statement).filter_by(uid=db_argument.conclusion_uid).first()
        if conclusion.is_disabled:
            return True
        # check premisegroup of given arguments conclusion
        premises = __get_all_premises_of_argument(db_argument)
        for premise in premises:
            if premise.statements.is_disabled:
                return True
    else:
        # check conclusion of given argument
        conclusion = DBDiscussionSession(Statement).filter_by(uid=argument.conclusion_uid).first()
        if conclusion.is_disabled:
            return True

    # check premisegroup of given argument
    premises = __get_all_premises_of_argument(argument)
    for premise in premises:
        if premise.statements.is_disabled:
            return True

    return False


def is_author_of_statement(nickname, statement_uid):
    """

    :param nickname:
    :param statement_uid:
    :return:
    """
    db_user = DBDiscussionSession.query(User).filter_by(nickname=str(nickname)).first()
    if not db_user:
        return False
    db_textversion = DBDiscussionSession.query(TextVersion).filter_by(statement_uid=statement_uid).order_by(
        TextVersion.uid.asc()).first()
    if not db_textversion:
        return False
    return db_textversion.author_uid == db_user.uid


def is_author_of_argument(nickname, argument_uid):
    """

    :param nickname:
    :param argument_uid:
    :return:
    """
    db_user = DBDiscussionSession.query(User).filter_by(nickname=str(nickname)).first()
    if not db_user:
        return False
    db_argument = DBDiscussionSession.query(Argument).filter(and_(Argument.uid == argument_uid,
                                                                  Argument.author_uid == db_user.uid)).first()
    return True if db_argument else False


def __get_all_premises_of_argument(argument):
    """
    Returns list with all premises of the argument.

    :param argument: Argument
    :return: list()
    """
    ret_list = []
    db_premises = DBDiscussionSession.query(Premise).filter_by(premisesgroup_uid=argument.premisesgroup_uid).join(
        Statement).all()
    for premise in db_premises:
        ret_list.append(premise)
    return ret_list


def get_profile_picture(user, size=80, ignore_privacy_settings=False):
    """
    Returns the url to a https://secure.gravatar.com picture, with the option wavatar and size of 80px

    :param user: User
    :param size: Integer, default 80
    :param ignore_privacy_settings:
    :return: String
    """
    db_settings = DBDiscussionSession.query(Settings).filter_by(author_uid=user.uid).first()
    additional_id = '' if db_settings.should_show_public_nickname else 'x'
    if ignore_privacy_settings:
        additional_id = ''
    unknown = 'unknown@dbas.cs.uni-duesseldorf.de'
    email = (user.email + additional_id).encode('utf-8') if user else unknown.encode('utf-8')

    gravatar_url = 'https://secure.gravatar.com/avatar/' + hashlib.md5(email.lower()).hexdigest() + "?"
    gravatar_url += parse.urlencode({'d': 'wavatar', 's': str(size)})
    return gravatar_url


def get_author_data(main_page, uid):
    """
    Returns a-tag with gravatar of current author and users page as href

    :param uid: of user
    :return: string
    """
    db_user = DBDiscussionSession.query(User).filter_by(uid=int(uid)).first()
    db_settings = DBDiscussionSession.query(Settings).filter_by(author_uid=int(uid)).first()
    if not db_user:
        return 'Missing author with uid ' + str(uid), False
    if not db_settings:
        return 'Missing settings of author with uid ' + str(uid), False
    img = '<img class="img-circle" src="' + get_profile_picture(db_user, 20, True) + '">'
    link_begin = '<a href="' + main_page + '/user/' + db_user.get_global_nickname() + '">'
    link_end = '</a>'
    return link_begin + db_user.nickname + ' ' + img + link_end, True
