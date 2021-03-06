"""
Initialize the engine and session of D-BAS database.

.. codeauthor:: Tobias Krauthoff <krauthoff@cs.uni-duesseldorf.de
"""
import os

from sqlalchemy import engine_from_config, MetaData
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from zope.sqlalchemy import ZopeTransactionExtension as Zte

# the concept of “session scopes” was introduced, with an emphasis on web applications
# and the practice of linking the scope of a Session with that of a web request
DBDiscussionSession = scoped_session(sessionmaker(extension=Zte(), expire_on_commit=False))
DiscussionBase = declarative_base()
NewsBase = declarative_base(metadata=MetaData(schema='news'))
DBEngine = None


def load_discussion_database(engine: Engine):
    """
    Binds current engine for our session

    :param engine:
    :return:
    """
    db_discussion_engine = engine
    DBDiscussionSession.remove()
    DBDiscussionSession.configure(bind=db_discussion_engine)
    DiscussionBase.metadata.bind = db_discussion_engine
    DiscussionBase.metadata.create_all(db_discussion_engine)


def get_dbas_db_configuration(db_name, settings={}):
    """
    Gets a database name and settings and looks up database connection configurations in four environment variables
    These are:

    +--------------+------------------------------------------------------------------+
    | DB_HOST | The hostname of the database (example: localhost, db, 10.0.0.2). |
    +--------------+------------------------------------------------------------------+
    | DB_PORT | The port of the database (example: 5432).                        |
    +--------------+------------------------------------------------------------------+
    | DB_USER | The database username. (example: dbas)                           |
    +--------------+------------------------------------------------------------------+
    | DB_PW   | The passwort of the DB_USER (example: passw0rt123)          |
    +--------------+------------------------------------------------------------------+


    :param db_name: The name of the database, as a string
    :param settings: A dict containing settings for the database connection. (optional)
    :return: A sqlalchemy engine from environment variables and settings.
    """
    prefix = 'sqlalchemy.{}.'.format(db_name)
    settings.update(get_db_environs(prefix + 'url', db_name))

    return engine_from_config(settings, prefix)


def get_db_environs(key, db_name, settings={}):
    db_user = os.environ.get("DB_USER", None)
    db_pw = os.environ.get("DB_PW", None)
    db_host = os.environ.get("DB_HOST", None)
    db_host_port = os.environ.get("DB_PORT", None)

    if all([db_user, db_pw, db_host, db_host_port]):
        settings.update(
            {key: "postgresql+psycopg2://{}:{}@{}:{}/{}?client_encoding=utf8".format(
                db_user, db_pw, db_host, db_host_port, db_name)})
        return settings
    else:
        errors = "Following variables are missing:\n"
        if not db_user:
            errors += "DB_USER\n"
        if not db_pw:
            errors += "DB_PW\n"
        if not db_host:
            errors += "DB_HOST\n"
        if not db_host_port:
            errors += "DB_PORT\n"

        raise EnvironmentError("Misconfigured environment variables for database. Result the installation instructions.\n" + errors)
