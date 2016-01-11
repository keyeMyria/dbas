import random
import json
from .database import DBDiscussionSession
from .database.discussion_model import Statement, User, TextVersion, Premise
from .logger import logger
from sqlalchemy import and_

# @author Tobias Krauthoff
# @email krauthoff@cs.uni-duesseldorf.de
# @copyright Krauthoff 2015

class DictionaryHelper(object):

	def get_random_subdict_out_of_orderer_dict(self, ordered_dict, count):
		"""
		Creates a random subdictionary with given count out of the given ordered_dict.
		With a count of <2 the dictionary itself will be returned.
		:param ordered_dict: dictionary for the function
		:param count: count of entries for the new dictionary
		:return: dictionary
		"""
		return_dict = dict()
		logger('DictionaryHelper', 'get_subdictionary_out_of_orderer_dict', 'count: ' + str(count))
		items = list(ordered_dict.items())
		for item in items:
			logger('DictionaryHelper', 'get_subdictionary_out_of_orderer_dict', 'all items: ' + ''.join(str(item)))
		if count < 0:
			return ordered_dict
		elif count == 1:
			if len(items) > 1:
				rnd = random.randint(0, len(items)-1)
				logger('DictionaryHelper', 'get_subdictionary_out_of_orderer_dict', 'return item at ' + str(rnd))
				return_dict[items[rnd][0]] = items[rnd][1]
			else:
				return ordered_dict
		else:

			for i in range(0, count):
				rnd = random.randint(0, len(items)-1)
				logger('DictionaryHelper', 'get_subdictionary_out_of_orderer_dict', 'for loop ' + str(i) + '. add element at ' + str(rnd))
				return_dict[items[rnd][0]] = items[rnd][1]
				items.pop(rnd)

		return return_dict

	def dictionary_to_json_array(self, raw_dict, ensure_ascii):
		"""
		Dumps given dictionary into json
		:param raw_dict: dictionary for dumping
		:param ensure_ascii: if true, ascii will be checked
		:return: json data
		"""
		return_dict = json.dumps(raw_dict, ensure_ascii)
		return return_dict

	def save_statement_row_in_dictionary(self, statement_row, issue):
		"""
		Saved a row in dictionary
		:param statement_row: for saving
		:param issue:
		:return: dictionary
		"""
		logger('DictionaryHelper', 'save_statement_row_in_dictionary', 'statement uid ' + str(statement_row.uid))
		db_statement = DBDiscussionSession.query(Statement).filter(and_(Statement.uid==statement_row.uid,
		                                                                Statement.issue_uid==issue)).first()
		db_premise = DBDiscussionSession.query(Premise).filter(and_(Premise.statement_uid==db_statement.uid,
		                                                            Premise.issue_uid==issue)).first()
		logger('DictionaryHelper', 'save_statement_row_in_dictionary', 'premise uid ' +
			       ((str(db_premise.premisesGroup_uid) + '.' + str(db_premise.statement_uid)) if db_premise else 'null'))
		db_textversion = DBDiscussionSession.query(TextVersion).filter_by(uid=db_statement.textversion_uid).join(User).first()

		uid    = str(db_statement.uid)
		text   = db_textversion.content
		date   = str(db_textversion.timestamp)
		author = db_textversion.users.nickname
		pgroup = str(db_premise.premisesGroup_uid) if db_premise else '0'

		while text.endswith('.'):
			text = text[:-1]

		logger('DictionaryHelper', 'save_statement_row_in_dictionary', uid + ', ' + text + ', ' + date + ', ' + author +
		       ', ' + pgroup + ', ' + str(issue))
		return {'uid':uid, 'text':text, 'date':date, 'author':author, 'premisegroup_uid':pgroup, 'issue':issue}