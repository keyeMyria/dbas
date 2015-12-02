from .logger import logger

# @author Tobias Krauthoff
# @email krauthoff@cs.uni-duesseldorf.de
# @copyright Krauthoff 2015

class Translator(object):

	def __init__(self, lang):
		"""

		:param lang: current language
		:return:
		"""
		self.en_dict = self.setUpEnDict()
		self.de_dict = self.setUpDeDict()
		self.lang = lang

	def setUpEnDict(self):
		"""

		:return: dictionary for the english language
		"""
		logger('Translator', 'setUpEnDict', 'def')

		en_lang = {}
		en_lang['attack']                       = 'You disagreed with'
		en_lang['support']                      = 'You agreed with'
		en_lang['premise']                      = 'Premise'
		en_lang['because']                      = 'because'
		en_lang['doesNotHoldBecause']           = 'does not hold because'
		en_lang['moreAbout']                    = 'More about'
		en_lang['undermine1']                   = 'It is false that'
		en_lang['undermine2']                   = ''
		en_lang['support1']                     = 'It is right'
		en_lang['support2']                     = ''
		en_lang['undercut1']                    = 'It is false that'
		en_lang['undercut2']                    = 'and this is no good counter-argument'
		en_lang['overbid1']                     = 'It is false that'
		en_lang['overbid2']                     = 'and this is a good counter-argument'
		en_lang['rebut1']                       = 'It is right that'
		en_lang['rebut2']                       = ', but I have a better statement'

		en_lang['oldPwdEmpty']                  = 'Old password field is empty.'
		en_lang['newPwdEmtpy']                  = 'New password field is empty.'
		en_lang['confPwdEmpty']                 = 'Password confirmation field is empty.'
		en_lang['newPwdNotEqual']               = 'New passwords are not equal'
		en_lang['pwdsSame']                     = 'New and old password are the same'
		en_lang['oldPwdWrong']                  = 'Your old password is wrong.'
		en_lang['pwdChanged']                   = 'Your password was changed'

		en_lang['emptyName']                    = 'Your name is empty!'
		en_lang['emptyEmail']                   = 'Your e-mail is empty!'
		en_lang['emtpyContent']                 = 'Your content is empty!'
		en_lang['maliciousAntiSpam']            = 'Your anti-spam message is empty or wrong!'
		en_lang['nonValidCSRF']                 = 'CSRF-Token is not valid'
		en_lang['name']                         = 'Name'
		en_lang['mail']                         = 'Mail'
		en_lang['phone']                        = 'Phone'
		en_lang['message']                      = 'Message'

		en_lang['pwdNotEqual']                  = 'Passwords are not equal'
		en_lang['nickIsTaken']                  = 'Nickname is taken'
		en_lang['mailIsTaken']                  = 'E-Mail is taken'
		en_lang['mailNotValid']                 = 'E-Mail is not valid'
		en_lang['errorTryLateOrContant']        = 'An error occured, please try again later or contact the author'
		en_lang['accountWasAdded']              = 'Your account was added and you are now able to login.'
		en_lang['accountWasRegistered']         = 'Your account was successfully registered for this e-mail.'
		en_lang['accoutErrorTryLateOrContant']  = 'Your account with the nick could not be added. Please try again or contact the author.'

		en_lang['nicknameIs']                   = 'Your nickname is: '
		en_lang['newPwdIs']                     = 'Your new password is: '
		en_lang['dbasPwdRequest']               = 'D-BAS Password Request'

		en_lang['emailBodyText'] = "This is an automatically generated mail by the D-BAS System.\n" + \
				"For contact please write an mail to krauthoff@cs.uni-duesseldorf.de\n" + \
				"This system is part of a doctoral thesis and currently in an alpha-phase."

		en_lang['emailWasSent']                 = 'E-Mail was sent.'
		en_lang['emailWasNotSent']              = 'E-Mail was not sent.'

		en_lang['antispamquestion']             = 'What is'
		en_lang['0']                            = 'zero'
		en_lang['1']                            = 'one'
		en_lang['2']                            = 'two'
		en_lang['3']                            = 'three'
		en_lang['4']                            = 'four'
		en_lang['5']                            = 'five'
		en_lang['6']                            = 'six'
		en_lang['7']                            = 'seven'
		en_lang['8']                            = 'eight'
		en_lang['9']                            = 'nine'
		en_lang['signs']                        = ['+','*','/','-']
		en_lang['+']                            = 'plus'
		en_lang['-']                            = 'minus'
		en_lang['*']                            = 'multiply with'
		en_lang['/']                            = 'divided by'

		logger('Translator', 'setUpEnDict', 'length ' + str(len(en_lang)))
		return en_lang

	def setUpDeDict(self):
		"""

		:return: dictionary for the german language
		"""
		logger('Translator', 'setUpDeDict', 'def')

		de_lang = {}
		de_lang['attack']                       = 'Sie lehnen ab, dass'
		de_lang['support']                      = 'Sie akzeptiere'
		de_lang['premise']                      = 'Prämisse'
		de_lang['because']                      = 'weil'
		de_lang['doesNotHoldBecause']           = 'gilt nicht, weil'
		de_lang['moreAbout']                    = 'Mehr über'
		de_lang['undermine1']                   = 'Es ist falsch, dass'
		de_lang['undermine2']                   = ''
		de_lang['support1']                     = 'Es ist richtig, dass'
		de_lang['support2']                     = ''
		de_lang['undercut1']                    = 'Es ist falsch, dass'
		de_lang['undercut2']                    = 'und das ist ein schlechter Konter'
		de_lang['overbid1']                     = 'Es ist falsch, dass'
		de_lang['overbid2']                     = 'und das ist ein guter Konter'
		de_lang['rebut1']                       = 'Es ist richtig, dass'
		de_lang['rebut2']                       = ', aber ich habe etwas besseres'

		de_lang['oldPwdEmpty']                  = 'Altes Passwortfeld ist leer.'
		de_lang['newPwdEmtpy']                  = 'Neues Passwortfeld ist leer.'
		de_lang['confPwdEmpty']                 = 'Bestätigungs-Passwordfeld ist leer.'
		de_lang['newPwdNotEqual']               = 'Password und Bestätigung stimmen nicht überein.'
		de_lang['pwdsSame']                     = 'Altes und neues Passwort sind identisch.'
		de_lang['oldPwdWrong']                  = 'Ihr altes Passwort ist falsch.'
		de_lang['pwdChanged']                   = 'Ihr Passwort würde geändert.'

		de_lang['emptyName']                    = 'Ihr Name ist leer!'
		de_lang['emptyEmail']                   = 'Ihre E-Mail ist leer!'
		de_lang['emtpyContent']                 = 'Ihr Inhalt ist leer!'
		de_lang['maliciousAntiSpam']            = 'Ihr Anti-Spam-Nachricht ist leer oder falsch!'
		de_lang['nonValidCSRF']                 = 'CSRF-Token ist nicht valide'
		de_lang['name']                         = 'Name'
		de_lang['mail']                         = 'Mail'
		de_lang['phone']                        = 'Telefon'
		de_lang['message']                      = 'Nachricht'

		de_lang['pwdNotEqual']                  = 'Passwörter sind nicht gleich.'
		de_lang['nickIsTaken']                  = 'Nickname ist schon vergeben.'
		de_lang['mailIsTaken']                  = 'E-Mail ist schon vergeben.'
		de_lang['mailNotValid']                 = 'E-Mail ist nicht gültig.'
		de_lang['errorTryLateOrContant']        = 'Leider ist ein Fehler aufgetreten, bitte versuchen Sie später erneut oder ' \
		                                          'kontaktieren Sie uns.'
		de_lang['accountWasAdded']              = 'Ihr Account wurde angelegt. Sie können sich nun anmelden.'
		de_lang['accountWasRegistered']         = 'Ihr Account wurde erfolgreich für die genannte E-Mail registiert.'
		de_lang['accoutErrorTryLateOrContant']  = 'Ihr Account konnte nicht angelegt werden, bitte versuchen Sie später erneut oder ' \
		                                          'kontaktieren Sie uns.'

		de_lang['nicknameIs']                   = 'Ihr Nickname lautet: '
		de_lang['newPwdIs']                     = 'Ihr Passwort lautet: '
		de_lang['dbasPwdRequest']               = 'D-BAS Password Nachfrage'

		de_lang['emailBodyText'] = 'Dies ist eine automatisch generierte E-Mail von D-BAS.\n' + \
				'Für Kontakt können Sie gerne eine E-Mail an krauthoff@cs.uni-duesseldorf.de verfassen.\n' + \
				'Dieses System ist Teil einer Promotion und noch in der Testphase.'

		de_lang['emailWasSent']                 = 'E-Mail wurde gesendet.'
		de_lang['emailWasNotSent']              = 'E-Mail wurde nicht gesendet.'

		de_lang['antispamquestion']             = 'Was ist'
		de_lang['0']                            = 'null'
		de_lang['1']                            = 'eins'
		de_lang['2']                            = 'zwei'
		de_lang['3']                            = 'drei'
		de_lang['4']                            = 'vier'
		de_lang['5']                            = 'fünf'
		de_lang['6']                            = 'sechs'
		de_lang['7']                            = 'sieben'
		de_lang['8']                            = 'acht'
		de_lang['9']                            = 'neun'
		de_lang['signs']                        = ['+','*','/','-']
		de_lang['+']                            = 'plus'
		de_lang['-']                            = 'minus'
		de_lang['*']                            = 'mal'
		de_lang['/']                            = 'durch'


		logger('Translator', 'setUpDeDict', 'length ' + str(len(de_lang)))
		return de_lang


	def get(self, id):
		"""

		:param id:
		:return:
		"""
		logger('Translator', 'get', 'id: ' + id + ', lang: ' + self.lang)
		if self.lang == 'de' and id in self.de_dict:
			logger('Translator', 'get', 'return de: ' + str(self.de_dict[id]))
			return self.de_dict[id]

		elif self.lang == 'en' and id in self.en_dict:
			logger('Translator', 'get', 'return en: ' + str(self.en_dict[id]))
			return self.en_dict[id]

		elif self.lang == 'de' and id not in self.de_dict:
			logger('Translator', 'get', 'unknown id for german dict')
			return 'unbekannter identifier im deutschen Wörterbuch'

		elif self.lang == 'en' and id not in self.en_dict:
			logger('Translator', 'get', 'unknown id for englisch dict')
			return 'unknown identifier in the englisch dictionary'

		else:
			logger('Translator', 'get', 'unknown lang')
			return 'unknown language: ' + self.lang