from dbas.database import DBDiscussionSession, get_dbas_db_configuration
from dbas.helper.test import add_settings_to_appconfig


def setup_package():
    settings = add_settings_to_appconfig()
    DBDiscussionSession.remove()
    DBDiscussionSession.configure(bind=get_dbas_db_configuration('discussion', settings))


def teardown_package():
    pass
