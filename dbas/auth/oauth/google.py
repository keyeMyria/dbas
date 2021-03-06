"""
Google OAuth handler of D-

App is registered by the account of dbas.hhu@gmail.com

Used lib: http://requests-oauthlib.readthedocs.io/en/latest/examples/google.html
Manage Google Client IDs: https://console.developers.google.com/apis/credentials
"""

import os
import json
from oauthlib.oauth2.rfc6749.errors import InsecureTransportError, InvalidClientError, MissingTokenError
from requests_oauthlib.oauth2_session import OAuth2Session
from dbas.logger import logger
from dbas.handler.user import oauth_values
from dbas.strings.translator import Translator
from dbas.strings.keywords import Keywords as _

scope = ['https://www.googleapis.com/auth/userinfo.email',
         'https://www.googleapis.com/auth/userinfo.profile']
authorization_base_url = 'https://accounts.google.com/o/oauth2/v2/auth'
token_url = 'https://accounts.google.com/o/oauth2/token'


def start_flow(redirect_uri):
    """

    :param redirect_uri:
    :return:
    """
    client_id = os.environ.get('OAUTH_GOOGLE_CLIENTID', None)
    client_secret = os.environ.get('OAUTH_GOOGLE_CLIENTKEY', None)

    if 'service=google' not in redirect_uri:
        bind = '#' if '?' in redirect_uri else '?'
        redirect_uri = '{}{}{}'.format(redirect_uri, bind, 'service=google')

    logger('Google OAuth', 'Read OAuth id/secret: none? {}/{}'.format(client_id is None, client_secret is None))

    # OAuth endpoints given in the Google API documentation
    google = OAuth2Session(client_id, redirect_uri=redirect_uri, scope=scope)

    authorization_url, state = google.authorization_url(authorization_base_url, access_type='offline', prompt='select_account')

    logger('Google OAuth', 'Please go to {} and authorize access'.format(authorization_url))
    return {'authorization_url': authorization_url, 'error': ''}


def continue_flow(redirect_uri, authorization_response, ui_locales):
    """

    :param redirect_uri:
    :param authorization_response:
    :param ui_locales:
    :return:
    """
    client_id = os.environ.get('OAUTH_GOOGLE_CLIENTID', None)
    client_secret = os.environ.get('OAUTH_GOOGLE_CLIENTKEY', None)

    logger('Google OAuth', 'Read OAuth id/secret: none? {}/{}'.format(client_id is None, client_secret is None))

    if 'service=google' not in redirect_uri:
        bind = '#' if '?' in redirect_uri else '?'
        redirect_uri = '{}{}{}'.format(redirect_uri, bind, 'service=google')

    google = OAuth2Session(client_id, redirect_uri=redirect_uri, scope=scope)

    try:
        token = google.fetch_token(token_url, authorization_response=authorization_response, client_secret=client_secret)
    except InsecureTransportError:
        logger('Google OAuth', 'OAuth 2 MUST utilize https', error=True)
        _tn = Translator(ui_locales)
        return {'user': {}, 'missing': {}, 'error': _tn.get(_.internalErrorHTTPS)}
    except InvalidClientError:
        logger('Google OAuth', 'InvalidClientError', error=True)
        _tn = Translator(ui_locales)
        return {'user': {}, 'missing': {}, 'error': _tn.get(_.internalErrorHTTPS)}
    except MissingTokenError:
        logger('Google OAuth', 'MissingTokenError', error=True)
        _tn = Translator(ui_locales)
        return {'user': {}, 'missing': {}, 'error': _tn.get(_.internalErrorHTTPS)}

    logger('Google OAuth', 'Token: {}'.format(token))

    resp = google.get('https://www.googleapis.com/oauth2/v2/userinfo?alt=json')
    logger('Google OAuth', str(resp.text))
    parsed_resp = json.loads(resp.text)

    # example response
    # 'id': '112556997662022178084'
    # 'name': 'Tobias Krauthoff'
    # 'given_name': 'Tobias'
    # 'family_name': 'Krauthoff'
    # 'gender': 'male'
    # 'email': 'tobias.krauthoff@googlemail.com'
    # 'link': 'https://plus.google.com/112556997662022178084'
    # 'verified_email': True
    # 'locale': 'de'
    # 'picture': 'https://lh3.googleusercontent.com/-oHifqnhsSEI/AAAAAAAAAAI/AAAAAAAAA_E/FOOl5HaFX4E/photo.jpg'

    gender = 'n'
    if 'gender' in parsed_resp:
        gender = 'm' if parsed_resp['gender'] == 'male' else 'f' if parsed_resp['gender'] == 'female' else ''

    user_data = __prepare_data(parsed_resp, gender, ui_locales)
    missing_data = [key for key in oauth_values if len(user_data[key]) == 0 or user_data[key] is 'null']

    logger('Google OAuth', 'user_data: ' + str(user_data))
    logger('Google OAuth', 'missing_data: ' + str(missing_data))

    return {
        'user': user_data,
        'missing': missing_data,
        'error': ''
    }


def __prepare_data(parsed_resp, gender, ui_locales):
    return {
        'id': parsed_resp['id'],
        'firstname': parsed_resp.get('given_name', ''),
        'lastname': parsed_resp.get('family_name', ''),
        'nickname': str(parsed_resp.get('email')).split('@')[0],
        'gender': gender,
        'email': str(parsed_resp.get('email')),
        'ui_locales': 'de' if parsed_resp['locale'] == 'de' else ui_locales
    }
