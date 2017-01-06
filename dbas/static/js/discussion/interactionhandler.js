/**
 * @author Tobias Krauthoff
 * @email krauthoff@cs.uni-duesseldorf.de
 */

function InteractionHandler() {
	'use strict';

	/**
	 * Callback, when a new position was send
	 * @param data returned data
	 */
	this.callbackIfDoneForSendNewStartStatement = function (data) {
		let parsedData = $.parseJSON(data);
		if (parsedData.error.length > 0) {
			$('#' + addStatementErrorContainer).show();
			$('#' + addStatementErrorMsg).text(parsedData.error);
		} else {
			$('#' + discussionSpaceId + 'input:last-child').prop('checked', false);
			window.location.href = parsedData.url;
		}
	};

	/**
	 * Callback, when new statements were send
	 * @param data returned data
	 */
	this.callbackIfDoneForSendNewPremisesArgument = function (data) {
		let parsedData = $.parseJSON(data);
		if (parsedData.error.length > 0) {
			$('#' + addPremiseErrorContainer).show();
			$('#' + addPremiseErrorMsg).text(parsedData.error);
		} else {
			window.location.href = parsedData.url;
		}
	};

	/**
	 * Callback, when new premises were send
	 * @param data returned data
	 */
	this.callbackIfDoneForSendNewStartPremise = function (data) {
		let parsedData = $.parseJSON(data);
		if (parsedData.error.length > 0) {
			$('#' + addPremiseErrorContainer).show();
			$('#' + addPremiseErrorMsg).text(parsedData.error);
		} else {
			window.location.href = parsedData.url;
		}
	};

	/**
	 * Callback, when the logfile was fetched
	 * @param data of the ajax request
	 */
	this.callbackIfDoneForGettingLogfile = function (data) {
		let parsedData = $.parseJSON(data);
		// status is the length of the content
		if (parsedData.error.length == 0) {
			new GuiHandler().showLogfileOfPremisegroup(parsedData);
		} else {
			$('#' + popupEditStatementErrorDescriptionId).text(parsedData.error);
		}
	};

	/**
	 * Callback, when a correcture could be send
	 * @param data of the ajax request
	 */
	this.callbackIfDoneForSendCorrectureOfStatement = function (data) {
		let parsedData = $.parseJSON(data);
		if (parsedData.error.length != 0) {
			setGlobalErrorHandler(_t_discussion(ohsnap), parsedData.error);
		} else {
			setGlobalSuccessHandler('Yeah!', _t_discussion(proposalsWereForwarded));
			new PopupHandler().hideAndClearEditStatementsPopup();
		}
	};

	/**
	 * Callback, when a url was shortend
	 * @param data of the ajax request
	 * @param long_url url which should be shortend
	 */
	this.callbackIfDoneForShortenUrl = function (data, long_url) {
		let parsedData = $.parseJSON(data), service;
		if (parsedData.error.length == 0) {
			service = '<a href="' + parsedData.service_url + '" title="' + parsedData.service + '" target="_blank">' + parsedData.service + '</a>';
			$('#' + popupUrlSharingDescriptionPId).html(_t_discussion(feelFreeToShareUrl) + ', ' + _t_discussion(shortenedBy) + ' ' + service + ':');
			$('#' + popupUrlSharingInputId).val(parsedData.url).data('short-url', parsedData.url);
		} else {
			$('#' + popupUrlSharingDescriptionPId).text(_t_discussion(feelFreeToShareUrl) + '.');
			$('#' + popupUrlSharingInputId).val(long_url);
		}
	};

	/**
	 * Callback for Fuzzy Search
	 * @param data
	 * @param callbackid
	 * @param type
	 */
	this.callbackIfDoneFuzzySearch = function (data, callbackid, type) {
		let parsedData = $.parseJSON(data);
		// if there is no returned data, we will clean the list

		if (Object.keys(parsedData).length == 0) {
			$('#' + proposalStatementListGroupId).empty();
			$('#' + proposalPremiseListGroupId).empty();
			$('#' + proposalEditListGroupId).empty();
			$('#' + proposalUserListGroupId).empty();
		} else {
			new GuiHandler().setStatementsAsProposal(parsedData, callbackid, type);
		}
	};

	/**
	 *
	 * @param data
	 */
	this.callbackIfDoneForGettingInfosAboutArgument = function(data){
		let parsedData = $.parseJSON(data), text, element;
		// status is the length of the content
		if (parsedData.error.length != 0) {
			text = parsedData.error;
			element = $('<p>').html(text);
			displayConfirmationDialogWithoutCancelAndFunction(_t_discussion(messageInfoTitle), element);
			return;
		}

		// supporters = parsedData.supporter.join(', ');
		let author = parsedData.author;
		if (parsedData.author != 'anonymous'){
			let img = '<img class="img-circle" style="height: 1em;" src="' + parsedData.gravatar + '">';
			author = '<a href="' + mainpage + 'user/' + parsedData.author + '">' + img + ' ' + parsedData.author + '</a>';
		} else {
			author = _t_discussion(an_anonymous_user);
		}
		text = _t_discussion(messageInfoStatementCreatedBy) + ' ' + author  + ', ';
		text += parsedData.timestamp + '. ';
		text += _t_discussion(messageInfoCurrentlySupported) + ' ' + parsedData.vote_count + ' ';
		text +=_t_discussion(messageInfoParticipant) + '.';

		let users_array = [];
		$.each(parsedData.supporter, function (index, val) {
			users_array.push({
				'avatar_url': parsedData.gravatars[val],
				'nickname': val,
				'public_profile_url': parsedData.public_page[val]
			});
		});
		
		let gh = new GuiHandler();
		let tbody = $('<tbody>');
		let rows = gh.createUserRowsForOpinionDialog(users_array);
		$.each( rows, function( key, value ) {
			tbody.append(value);
		});
		
		let body = gh.closePrepareTableForOpinonDialog(parsedData.supporter, gh, text, tbody);

		displayConfirmationDialogWithoutCancelAndFunction(_t_discussion(messageInfoTitle), body);
		$('#' + popupConfirmDialogId).find('.modal-dialog').addClass('modal-lg').on('hidden.bs.modal', function () {
			$(this).removeClass('modal-lg');
		});
		setTimeout(function(){
				let popup_table = $('#' + popupConfirmDialogId).find('.modal-body div');
				if ($( window ).height() > 400 && popup_table.outerHeight(true) > $( window ).height()) {
					popup_table.slimScroll({
						position: 'right',
						railVisible: true,
						alwaysVisible: true,
						height: ($( window ).height() / 3 * 2) + 'px'
					});
				}
			}, 300);
		
	};

	/**
	 *
	 * @param data
	 */
	this.callbackIfDoneForSendNewIssue = function(data){
		let parsedData = $.parseJSON(data);

		if (parsedData.error.length == 0) {
			$('#popup-add-topic').modal('hide');
			let li = $('<li>').addClass('enabled'),
				a = $('<a>').attr('href', parsedData.issue.url).attr('value', parsedData.issue.title),
				spanTitle = $('<span>').text(parsedData.issue.title),
				spanBadge = $('<span>').addClass('badge').attr('style', 'float: right; margin-left: 1em;').text(parsedData.issue.arg_count),
				divider = $('#' + issueDropdownListID).find('li.divider');
			li.append(a.append(spanTitle).append(spanBadge));
			if (divider.length>0){
				li.insertBefore(divider);
			}
		} else {
			$('#popup-add-topic-error-text').text(parsedData.error);
			$('#popup-add-topic-error').show();
			setTimeout(function(){
				$('#popup-add-topic-error').hide();
			}, 2500);
		}
	};
	
	/**
	 *
	 * @param data
	 */
	this.callbackIfDoneForSendNewIssueTable = function(data){
	let parsedData = $.parseJSON(data);

        if (parsedData.error.length == 0) {
			$('#popup-add-topic').modal('hide');

			let space = $('#issue-table');

			let tr = $('<tr>')
					.append($('<td>').html( parsedData.issue.uid ))
					.append($('<td>').html( parsedData.issue.title ))
					.append($('<td>').html( parsedData.issue.info ))
					.append($('<td>').html( parsedData.issue.date ))
			        .append($('<td>').append($('<a>').attr('target', '_blank').attr('href', parsedData.issue.public_url).text(parsedData.issue.author)))
			        .append($('<td>').append( $('<a>').attr('href', '#').attr('class' , 'btn btn-info btn-lg').append($('<i>').attr('class', 'fa fa-pencil-square-o'))));
           	 space.append(tr);
		} else {
			$('#popup-add-topic-error-text').text(parsedData.error);
			$('#popup-add-topic-error').show();
			setTimeout(function(){
				$('#popup-add-topic-error').hide();
			}, 2500);
		}
	};
	
	/**
	 *
	 * @param data
	 */
	this.callbackIfDoneRevokeContent = function(data) {
		let parsedData = $.parseJSON(data);
		
		if (parsedData.error.length != 0) {
			setGlobalErrorHandler(_t(ohsnap), parsedData.error);
		} else {
			console.log(parsedData['is_deleted']);
			if (parsedData['is_deleted'])
				setGlobalSuccessHandler('Yeah!', _t_discussion(dataRemoved) + ' ' + _t_discussion(yourAreNotTheAuthorOfThisAnymore));
			else
				setGlobalSuccessHandler('Yeah!', _t_discussion(contentWillBeRevoked));
		}
	};

	/**
	 *
	 * @param data
	 * @param is_argument
	 */
	this.callbackIfDoneForGettingMoreInfosAboutOpinion = function(data, is_argument){
		let parsedData = $.parseJSON(data), users_array, popup_table;

		if (parsedData.error.length != 0) {
			setGlobalErrorHandler(_t(ohsnap), parsedData.error);
			return;
		}
		
		let gh = new GuiHandler();
		let tbody = $('<tbody>');
		let span = is_argument? $('<span>').text(parsedData.opinions.message) : $('<span>').text(parsedData.opinions[0].message);

		users_array = is_argument ? parsedData.opinions.users : parsedData.opinions[0].users;
		let rows = gh.createUserRowsForOpinionDialog(users_array);
		$.each( rows, function( key, value ) {
			tbody.append(value);
		});
		
		let body = gh.closePrepareTableForOpinonDialog(users_array, gh, span, tbody);

		displayConfirmationDialogWithoutCancelAndFunction(_t_discussion(usersWithSameOpinion), body);
		$('#' + popupConfirmDialogId).find('.modal-dialog').addClass('modal-lg').on('hidden.bs.modal', function (e) {
			$(this).removeClass('modal-lg');
		});
		setTimeout(function(){
				popup_table = $('#' + popupConfirmDialogId).find('.modal-body div');
				if ($( window ).height() > 400 && popup_table.outerHeight(true) > $( window ).height()) {
					popup_table.slimScroll({
						position: 'right',
						railVisible: true,
						alwaysVisible: true,
						height: ($( window ).height() / 3 * 2) + 'px'
					});
				}
			}, 300);
		
	};
	
	/**
	 *
	 * @param data
	 */
	this.callbackIfDoneForGettingReferences = function(data){
		let parsedData = $.parseJSON(data);
		
		if (parsedData.error.length != 0)
			setGlobalErrorHandler(_t(ohsnap), parsedData.error);
		else
			new PopupHandler().showReferencesPopup(parsedData);
	};
	
	/**
	 *
	 * @param text
	 * @param conclusion
	 * @param supportive
	 * @param arg
	 * @param relation
	 * @param type
	 */
	this.sendStatement = function (text, conclusion, supportive, arg, relation, type) {
		// error on "no text"
		if (text.length == 0) {
			if (type==fuzzy_start_statement){
				$('#' + addStatementErrorContainer).show();
				$('#' + addStatementErrorMsg).text(_t(inputEmpty));
			} else {
				$('#' + addPremiseErrorContainer).show();
				$('#' + addPremiseErrorMsg).text(_t(inputEmpty));
			}
		} else {
			let undecided_texts = [], decided_texts = [];
			if ($.isArray(text)) {
				for (let i = 0; i < text.length; i++) {
					// replace multiple whitespaces
					text[i] = text[i].replace(/\s\s+/g, ' ');

					// cutting all 'and ' and 'and'
					while (text[i].indexOf((_t_discussion(and) + ' '), text[i].length - (_t_discussion(and) + ' ').length) !== -1 ||
					text[i].indexOf((_t_discussion(and)), text[i].length - (_t_discussion(and) ).length) !== -1) {
						if (text[i].indexOf((_t_discussion(and) + ' '), text[i].length - (_t_discussion(and) + ' ').length) !== -1)
							text[i] = text[i].substr(0, text[i].length - (_t_discussion(and) + ' ').length);
						else
							text[i] = text[i].substr(0, text[i].length - (_t_discussion(and)).length);
					}

					// whitespace at the end
					while (text[i].indexOf((' '), text[i].length - (' ').length) !== -1)
						text[i] = text[i].substr(0, text[i].length - (' ').length);

					// sorting the statements, whether they include the keyword 'AND'
					if (text[i].toLocaleLowerCase().indexOf(' ' + _t_discussion(and) + ' ') != -1)
						undecided_texts.push(text[i]);
					else
						decided_texts.push(text[i]);
				}
			}

			if (undecided_texts.length > 0){
				for (let j=0; j<undecided_texts.length; j++){
					if (undecided_texts[j].match(/\.$/))
						undecided_texts[j] = undecided_texts[j].substr(0, undecided_texts[j].length -1)
				}
				new GuiHandler().showSetStatementContainer(undecided_texts, decided_texts, supportive, type, arg, relation, conclusion);
			} else {
				if (type == fuzzy_start_statement) {
					if (decided_texts.length > 0)
						alert("TODO: more than one decided text");
					else
						new AjaxDiscussionHandler().sendNewStartStatement(text);
				} else if (type == fuzzy_start_premise) {
					new AjaxDiscussionHandler().sendNewStartPremise(text, conclusion, supportive);
				} else  if (type == fuzzy_add_reason) {
					new AjaxDiscussionHandler().sendNewPremiseForArgument(arg, relation, text);
				}
			}
		}
	}
}
