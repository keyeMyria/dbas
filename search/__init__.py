import os
SEARCH_ADDRESS = 'search'
SEARCH_PORT = 5000
SEARCH_PROTOCOL = os.environ['DBAS_PROTOCOL']

SEARCH_REQUEST_STRING = '{}://{}:{}'.format(SEARCH_PROTOCOL, SEARCH_ADDRESS, SEARCH_PORT)