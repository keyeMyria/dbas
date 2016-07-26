# D-BAS

D-BAS is a novel approach to online argumentation. It avoids the 
pitfalls of  unstructured systems such as asynchronous threaded 
discussions and it is usable by any participant without training while 
still supporting the full complexity  of real-world argumentation. The 
key idea is to let users exchange arguments  with each other in the 
form of a time-shifted dialog where arguments are presented  and acted 
upon one-at-a-time.

## Documentation

Complete documenation can be found in `dbas/docs`. To create the 
documentation run:

    make html

The documentation requires [Sphinx](http://www.sphinx-doc.org/en/stable/).


## Setup for Linux

Ensure that the following tools are installed:

* Python >= 3.4
* `pip <https://pip.pypa.io/en/stable/installing/>`_
* `virtualenv <http://virtualenv.readthedocs.org/en/latest/installation.html>`_
* `virtualenvwrapper <http://virtualenvwrapper.readthedocs.org/en/latest/install.html>`_
* PostgreSQL and libpq-dev

Then follow these steps:

1. Create virtualenv with python3:

2. Install all requirements:

3. Develop application:

4. Install PostgreSQL and configure it:

6. Create database:

7. Start development web server:

        mkvirtualenv "--python=$(which python3)" dbas
        pip install -r requirements.txt
        python setup.py develop
        apt-get install libpq-dev python-dev postgresql
        make init
        make all
        pserve development.ini --reload

or all in one step:

    docker-compose up


If you want to use notifications with socket.io, please install [D-BAS Notifications](https://gitlab.cs.uni-duesseldorf.de/project/dbas-notifications).

## Testing

Frontend tests can be found in `dbas/tests` and are executable with:

    python splinterTests.py

These tests require [splinter](https://splinter.readthedocs.org/en/latest/) 
and [selenium](https://pypi.python.org/pypi/selenium).

Backend tests can be executed with:

    nosetests dbas

Therefore a D-BAS instance is required.


## License

Copyright © 2016 Tobias Krauthoff, Christian Meter

Distributed under the [MIT License](https://gitlab.cs.uni-duesseldorf.de/project/dbas/raw/master/LICENSE).