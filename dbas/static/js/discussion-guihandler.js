/**
 * @author Tobias Krauthoff
 * @email krauthoff@cs.uni-duesseldorf.de
 */

function GuiHandler() {
	'use strict';
	var interactionHandler;

	this.setHandler = function (externInteractionHandler) {
		interactionHandler = externInteractionHandler;
	};

	/**
	 *
	 */
	this.appendAddPremiseRow = function(){
		var body = $('#add-premise-container-body'),
			uid = new Date().getTime(),
			div = $('<div>').attr('style', 'padding-bottom: 2em').addClass('container-three-divs'),
			div_l = $('<div>'),
			div_m = $('<div>').addClass('flex-div'),
			div_r = $('<div>'),
			h5 = $('<h5>').attr('style', 'float:left; line-height:20px; text-align:center;').text('Because...'),
			id = 'add-premise-container-main-input-' + uid,
			input = $('<input>').attr('id', id)
				.attr('type', 'text')
				.attr('class', 'form-control add-premise-container-input')
				.attr('autocomplete', 'off')
				.attr('placeholder', 'example: There is some reason!'),
			imgm = $('<img>').attr('class', 'icon-rem-premise')
				.attr('alt', 'icon-rem')
				.attr('src', mainpage + 'static/images/icon_minus2.png')
				.attr('style', 'height: 30px; padding-right: 0.5em;')
				.attr('title', body.find('.icon-rem-premise').first().attr('title')),
			imgp = $('<img>').attr('class', 'icon-add-premise')
				.attr('alt', 'icon-add')
				.attr('src', mainpage + 'static/images/icon_plus2.png')
				.attr('style', 'height: 30px;')
				.attr('title', body.find('.icon-add-premise').first().attr('title'));

		div.append(div_l.append(h5))
			.append(div_m.append(input))
			.append(div_r.append(imgm).append(imgp));
		$('#' + addPremiseContainerBodyId).append(div);

		imgp.click(function(){
			new GuiHandler().appendAddPremiseRow();
			$(this).hide().prev().show(); // hide +, show -
		});

		imgm.click(function(){
			// removing bubble
			var id = $(this).parent().parent().find('input').attr('id'),
				tmpid = id.split('-').length == 6 ? id.split('-')[5] : '0';
			$('#current_' + tmpid).fadeOut().remove();
			$(this).parent().parent().remove();
			body.find('div').children().last().show();
			// hide minus icon, when there is only one child
			if (body.find('.container-three-divs').length == 1) {
				body.find('.icon-rem-premise').hide();
			} else {
				body.find('.icon-rem-premise').show();
			}

		});

		// add fuzzy search
		$('#' + id).keyup(function () {
			new Helper().delay(function () {
				var escapedText = new Helper().escapeHtml($('#' + id).val());
				new AjaxSiteHandler().fuzzySearch(escapedText, id, fuzzy_add_reason, '');
			}, 200);
		});
	};

	/**
	 * Setting an error description in some p-tag
	 * @param text to set
	 */
	this.setErrorDescription = function (text) {
		$('#' + discussionErrorDescriptionId).html(text);
		$('#' + discussionErrorDescriptionSpaceId).show();
	};

	/**
	 * Dialog based discussion modi
	 */
	this.setDisplayStyleAsDiscussion = function () {
		this.setImageInactive($('#' + displayStyleIconGuidedId));
		this.setImageActive($('#' + displayStyleIconIslandId));
		this.setImageActive($('#' + displayStyleIconExpertId));
		$('#' + islandViewContainerId).hide();
		$('#' + graphViewContainerId).hide();
		$('#' + discussionContainerId).show();
		$('#' + headerContainerId).show();
		$('#' + breadcrumbContainerId).show();
	};

	/**
	 * Some kind of pro contra list, but how?
	 */
	this.setDisplayStyleAsIsland = function () {
		this.setImageActive($('#' + displayStyleIconGuidedId));
		this.setImageInactive($('#' + displayStyleIconIslandId));
		this.setImageActive($('#' + displayStyleIconExpertId));
		$('#' + islandViewContainerId).fadeIn('slow');
		$('#' + graphViewContainerId).hide();
	};

	/**
	 * Full view, full interaction range for the graph
	 */
	this.setDisplayStyleAsGraphView = function () {
		this.setImageActive($('#' + displayStyleIconGuidedId));
		this.setImageActive($('#' + displayStyleIconIslandId));
		this.setImageInactive($('#' + displayStyleIconExpertId));
		$('#' + islandViewContainerId).hide();
		$('#' + discussionContainerId).hide();
		$('#' + headerContainerId).hide();
		$('#' + breadcrumbContainerId).hide();
		new GuiHandler().hideDiscussionError();
		new DiscussionGraph().showGraph();

		// text
		$('#' + graphViewContainerHeaderId).html($('#issue_info').html());

		// height
		var innerHeight = new Helper().getMaxSizeOfGraphViewContainer();
		$('#' + graphViewContainerId).attr('style', 'height: ' + innerHeight + 'px; margin-left: 2em; margin-right: 2em;');
	};

	/**
	 * Adds the inactive-image-class, which includes a grayfilter and blur
	 * @param imageElement <img>-Element
	 */
	this.setImageInactive = function(imageElement){
		imageElement.addClass('inactive-image').removeClass('icon-badge').css('cursor','not-allowed');
	};

	/**
	 * Removes the inactive-image-class, which includes a grayfilter and blur
	 * @param imageElement <img>-Element
	 */
	this.setImageActive = function(imageElement){
		imageElement.removeClass('inactive-image').addClass('icon-badge').css('cursor', 'pointer');
	};

	/*

	 */
	this.setMaxHeightForBubbleSpace = function() {
		// max size of the container
		var speechBubbles = $('#' + discussionBubbleSpaceId), height = 0,
			maxHeight = new Helper().getMaxSizeOfDiscussionViewContainer(), start,
			nowBubble = $('#now');
		$.each(speechBubbles.find('div p'), function () {
			height += $(this).outerHeight(true);
			// clear unnecessary a tags
			if ($(this).parent().attr('href') == '?breadcrumb=true') {
				$(this).insertAfter($(this).parent());
				$(this).prev().remove();
			}
		});

		start = typeof nowBubble == 'undefined' ? 'bottom' : nowBubble;
		if (height > maxHeight) {
			if (maxHeight < 300){//} && new Helper().isMobileAgent() ) {
				maxHeight = 300;
			}
			speechBubbles.slimscroll({
				position: 'right',
				height: maxHeight + 'px',
				railVisible: true,
				alwaysVisible: true,
				start: start,
				scrollBy: '10px',
				allowPageScroll: true
			});
		} else {
			height += 20;
			speechBubbles.css('height', height + 'px').css('max-height', maxHeight + 'px');
		}
	};

	/**
	 *
	 */
	this.showAddPositionContainer = function(){
		$('#' + addStatementContainerId).show();
	};

	/**
	 *
	 */
	this.showAddPremiseContainer = function(){
		$('#' + addPremiseContainerId).show();
	};

	/**
	 *
	 * @param undecided_texts
	 * @param decided_texts
	 * @param supportive
	 * @param type
	 * @param arg
	 * @param relation
	 * @param conclusion
	 */
	this.showSetStatementContainer = function(undecided_texts, decided_texts, supportive, type, arg, relation, conclusion) {
		var gh = new GuiHandler(), page, page_no,
			body = $('#' + popupSetPremiseGroupsBodyContent).empty(),
			prev = $('#' + popupSetPremiseGroupsPreviousButton).hide(),
			next = $('#' + popupSetPremiseGroupsNextButton).hide(),
			send = $('#' + popupSetPremiseGroupsSendButton).addClass('disabled'),
			counter = $('#' + popupSetPremiseGroupsCounter).hide(),
			prefix = 'insert_statements_page_';

		send.click(function sendClick(){
			var selections = body.find('input:checked'), i, j, splitted;

			// merge every text part to one array
			for (i=0; i<undecided_texts.length; i++){
					splitted = undecided_texts[i].split(' ' + _t(and) + ' ');

				if (selections[i].id.indexOf(attr_more_args) != -1){ // each splitted text part is one argument
					for (j=0; j<splitted.length; j++)
						decided_texts.push([splitted[j]]);

				} else if (selections[i].id.indexOf(attr_one_arg) != -1){ // one argument with big premisegroup
					decided_texts.push(splitted);

				} else { // just take it!
					decided_texts.push([undecided_texts[i]]);
				}
			}

			if (type == fuzzy_add_reason){
				new AjaxSiteHandler().sendNewPremiseForArgument(arg, relation, decided_texts);
			} else if (type == fuzzy_start_premise){
				new AjaxSiteHandler().sendNewStartPremise(decided_texts, conclusion, supportive);
			} else {
			 	alert("Todo: unknown type")
			}
			$('#' + popupSetPremiseGroups).modal('hide');
		});

		if (undecided_texts.length == 1){ // we only need one page div
			page = gh.getPageOfSetStatementContainer(0, undecided_texts[0], supportive);
			body.append(page);

			page.find('input').each(function(){
				$(this).click(function inputClick (){
					send.removeClass('disabled');
				});
			});

		} else { // we need several pages
			prev.show().removeClass('href').attr('max', undecided_texts.length).parent().addClass('disabled');
			next.show().attr('max', undecided_texts.length);
			counter.show().text('1/' + undecided_texts.length);

			// for each statement a new page div will be added
			for (page_no = 0; page_no < undecided_texts.length; page_no++) {
				page = gh.getPageOfSetStatementContainer(page_no, undecided_texts[page_no], supportive);
				if (page_no > 0)
					page.hide();
				body.append(page);

				page.find('input').each(function(){
					$(this).click(function inputClick (){
						new GuiHandler().displayNextPageOffSetStatementContainer(body, prev, next, counter, prefix);
					})
				});
			}

			// previous button click
			prev.click(function prevClick(){
				new GuiHandler().displayPrevPageOffSetStatementContainer(body, prev, next, counter, prefix);
			});

			// next button click
			next.click(function nextClick(){
				new GuiHandler().displayNextPageOffSetStatementContainer(body, prev, next, counter, prefix);
			});
		}

		$('#' + popupSetPremiseGroups).modal('show');
	};

	/**
	 *
	 * @param body
	 * @param prev_btn
	 * @param next_btn
	 * @param counter_text
	 * @param prefix
	 */
	this.displayNextPageOffSetStatementContainer = function(body, prev_btn, next_btn, counter_text, prefix){
		var tmp_el = body.find('div:visible'),
			tmp_id = parseInt(tmp_el.attr('id').substr(prefix.length)),
			input = tmp_el.find('input:checked');

		// is current page filled?
		if (input.length == 0){
			$('#insert_statements_page_error').fadeIn();
		} else {
			$('#insert_statements_page_error').fadeOut();

			if (tmp_id < (parseInt(next_btn.attr('max')) - 1 )) {
				tmp_el.hide().next().fadeIn();
				prev_btn.parent().removeClass('disabled');
				counter_text.show().text((tmp_id + 2) + '/' + next_btn.attr('max'));

				if ((tmp_id + 2) == parseInt(next_btn.attr('max')))
					next_btn.parent().addClass('disabled');
			} else {
				$('#' + popupSetPremiseGroupsSendButton).removeClass('disabled');
			}
		}
	};

	/**
	 *
	 * @param body
	 * @param prev_btn
	 * @param next_btn
	 * @param counter_text
	 * @param prefix
	 */
	this.displayPrevPageOffSetStatementContainer = function(body, prev_btn, next_btn, counter_text, prefix){
		var tmp_el = body.find('div:visible'),
			tmp_id = parseInt(tmp_el.attr('id').substr(prefix.length));

		if (tmp_id > 0){
			tmp_el.hide().prev().fadeIn();
			next_btn.parent().removeClass('disabled');
			counter_text.show().text((tmp_id) + '/' + prev_btn.attr('max'));
			if (tmp_id == 0)
				prev_btn.parent().addClass('disabled');
		}
	};

	/**
	 *
	 * @param page_no
	 * @param text
	 * @param supportive
	 * @returns {*}
	 */
	this.getPageOfSetStatementContainer = function(page_no, text, supportive){
		var src = $('#insert_statements_page_'),
			div_page = src.clone(),
			id = src.attr('id'),
			splitted = text.split(' ' + _t(and) + ' '),
			topic = $('#' + addPremiseContainerMainInputIntroId).text(),
			input1, input2, input3, list, bigText, bigTextSpan, connection, i;

		if (topic.match(/\.$/)){
			topic = topic.substr(0, topic.length-1) + ', '
		}

		div_page.attr('id', id + page_no).attr('page', page_no).show();
		div_page.find('#' + popupSetPremiseGroupsStatementCount).text(splitted.length);
		list        = div_page.find('#' + popupSetPremiseGroupsListMoreArguments);
		bigTextSpan = div_page.find('#' + popupSetPremiseGroupsOneBigStatement);
		// rename the id-, for- and name-tags of all radio button groups
		input1      = div_page.find('#insert_more_arguments');
		input2      = div_page.find('#insert_one_argument');
		input3      = div_page.find('#insert_dont_care');
		input1.attr('id', input1.attr('id') + '_' + page_no);
		input2.attr('id', input2.attr('id') + '_' + page_no);
		input3.attr('id', input3.attr('id') + '_' + page_no);
		input1.attr('name', input1.attr('name') + '_' + page_no);
		input2.attr('name', input2.attr('name') + '_' + page_no);
		input3.attr('name', input3.attr('name') + '_' + page_no);
		input1.parent().attr('for', input1.parent().attr('for') + '_' + page_no);
		input2.parent().attr('for', input2.parent().attr('for') + '_' + page_no);
		input3.parent().attr('for', input3.parent().attr('for') + '_' + page_no);

		connection = supportive ? _t(itIsTrueThat) : _t(itIsFalseThat);
		bigText = topic + ' ' + _t(because) + ' ' + connection;
		for (i = 0; i < splitted.length; i++) {
			list.append($('<li>').text(topic + ' ' + _t(because) + ' ' + splitted[i] + '.'));
			bigText += ' ' + i == 0 ? ' ' + splitted[i] : (' ' + _t(andAtTheSameTime) + ' ' + connection + ' ' + splitted[i])
		}
		bigTextSpan.text(bigText + '.');

		return div_page;
	};

	/**
	 *
	 * @param parsedData
	 * @param callbackid
	 * @param type
	 */
	this.setStatementsAsProposal = function (parsedData, callbackid, type){
		var callbackElement = $('#' + callbackid), uneditted_value;
		if (type == fuzzy_start_premise)        $('#' + proposalPremiseListGroupId).empty();
		else if (type == fuzzy_start_statement) $('#' + proposalStatementListGroupId).empty();
		else if (type == fuzzy_add_reason)      $('#' + proposalPremiseListGroupId).empty();
		else if (type == fuzzy_statement_popup) $('#' + proposalEditListGroupId).empty();

		// is there any value ?
		if (Object.keys(parsedData).length == 0){
			return;
		}

		var params, token, button, span_dist, span_text, distance, index;
		callbackElement.focus();

		$.each(parsedData.values, function (key, val) {
			params = key.split('_');
			distance = parseInt(params[0]);
			index = params[1];

			token = callbackElement.val();
			//var pos = val.toLocaleLowerCase().indexOf(token.toLocaleLowerCase()), newpos = 0, start = 0;

			// make all tokens bold
			uneditted_value = val;
			// replacement from http://stackoverflow.com/a/280805/2648872
			val = '<b>' + val.replace( new RegExp( "(" + (token + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1") + ")" , 'gi' ), "</b>$1<b>" ) + '</b>';

			button = $('<button>')
				.attr('type', 'button')
				.attr('class', 'list-group-item')
				.attr('id', 'proposal_' + index)
				.attr('text', uneditted_value)
				.hover(function(){$(this).addClass('active');},
					   function(){ $(this).removeClass('active');});
			span_dist = $('<span>').attr('class', 'badge').text(parsedData.distance_name + ' ' + distance);
			span_text = $('<span>').attr('id', 'proposal_' + index + '_text').html(val);
			button.append(span_dist).append(span_text).click(function(){
				callbackElement.val($(this).attr('text'));
				$('#' + proposalStatementListGroupId).empty();
				$('#' + proposalPremiseListGroupId).empty();
				$('#' + proposalEditListGroupId).empty(); // list with elements should be after the callbacker
			});

			if (type == fuzzy_start_premise)        $('#' + proposalPremiseListGroupId).append(button);
			else if (type == fuzzy_start_statement) $('#' + proposalStatementListGroupId).append(button);
			else if (type == fuzzy_add_reason)      $('#' + proposalPremiseListGroupId).append(button);
			else if (type == fuzzy_statement_popup) $('#' + proposalEditListGroupId).append(button);
		});
	};

	/**
	 * Shows an error on discussion space as well as a retry button and sets a link for the contact page
	 * @param error_msg message of the error
	 */
	this.showDiscussionError = function (error_msg) {
		$('#' + discussionFailureRowId).fadeIn('slow');
		$('#' + discussionFailureMsgId).html(error_msg);
		$('#' + contactOnErrorId).click(function(){
			var line1 = 'Report ' + new Helper().getTodayAsDate(),
				line2 = 'URL: ' + window.location.href,
				line3 = _t(fillLine).toUpperCase(),
				params = {'content': line1 + '\n' + line2 + '\n' + line3,
				'name': $('#header_user').parent().text().replace(/\s/g,'')};
			new Helper().redirectInNewTabForContact(params);
		})
	};

	/**
	 * Opens the edit statements popup
	 */
	this.showEditStatementsPopup = function () {
		var table, tr, td_text, td_buttons, helper = new Helper();
		$('#' + popupEditStatementId).modal('show');
		$('#' + popupEditStatementWarning).hide();

		// top row
		table = $('<table>')
			.attr('class', 'table table-condensed table-hover')
			.attr('border', '0')
			.attr('style', 'border-collapse: separate; border-spacing: 5px 5px;');
		td_text = $('<td>').html('<strong>' + _t(text) + '</strong>').css('text-align', 'center');
		td_buttons = $('<td>').html('<strong>' + _t(options) + '</strong>').css('text-align', 'right');
		table.append($('<tr>').append(td_text).append(td_buttons));

		// append a row for each statement
		$('#' + discussionSpaceId + ' li:not(:last-child) label:nth-child(even)').each(function () {
			tr = helper.createRowInEditDialog($(this).text(), $(this).attr('for').substr('item_'.length), $(this).attr('id'));
			table.append(tr);

		});

		$('#' + popupEditStatementContentId).empty().append(table);
		$('#' + popupEditStatementTextareaId).hide();
		$('#' + popupEditStatementDescriptionId).hide();
		$('#' + popupEditStatementSubmitButtonId).hide();
		$('#' + proposalEditListGroupId).empty();
	};

	/**
	 * Display url sharing popup
	 */
	this.showUrlSharingPopup = function () {
		$('#' + popupUrlSharingId).modal('show');
		new AjaxSiteHandler().getShortenUrl(window.location);
		//$('#' + popupUrlSharingInputId).val(window.location);
	};

	/**
	 * Display url sharing popup
	 */
	this.showGeneratePasswordPopup = function () {
		$('#' + popupGeneratePasswordId).modal('show');
		$('#' + popupGeneratePasswordCloseButtonId).click(function(){
			$('#' + popupGeneratePasswordId).modal('hide');
		});
		$('#' + popupLoginCloseButton).click(function(){
			$('#' + popupGeneratePasswordId).modal('hide');
		});
	};

	/**
	 * Displays the edit text field
	 */
	this.showEditFieldsInEditPopup = function () {
		$('#' + popupEditStatementSubmitButtonId).fadeIn('slow');
		$('#' + popupEditStatementTextareaId).fadeIn('slow');
		$('#' + popupEditStatementDescriptionId).fadeIn('slow');
	};

	/**
	 * Displays all corrections in the popup
	 * @param jsonData json encoded return data
	 */
	this.showStatementCorrectionsInPopup = function (jsonData) {
		var table, tr, td_text, td_date, td_author;

		// top row
		table = $('<table>');
		table
			.attr('id', 'edit_statement_table')
			.attr('class', 'table table-condensed')
			.attr('border', '0')
			.attr('style', 'border-collapse: separate; border-spacing: 5px 5px;');
		tr = $('<tr>');
		td_date = $('<td>');
		td_text = $('<td>');
		td_author = $('<td>');
		td_date.html('<strong>' + _t(date) + '</strong>').css('text-align', 'center');
		td_text.html('<strong>' + _t(text) + '</strong>').css('text-align', 'center');
		td_author.html('<strong>' + _t(author) + '</strong>').css('text-align', 'center');
		tr.append(td_date);
		tr.append(td_text);
		tr.append(td_author);
		table.append(tr);

		$.each(jsonData.content, function displayStatementCorrectionsInPopupEach(key, val) {
			tr = $('<tr>')
				.append($('<td>').text(val.date))
				.append($('<td>').text(val.text))
				.append($('<td>').text(val.author));
			table.append(tr);
		});

		$('#' + popupEditStatementLogfileSpaceId).empty().append(table);
	};

	/**
	 * Dispalys the 'how to write text '-popup, when the setting is not in the cookies
	 */
	this.showHowToWriteTextPopup = function(){
		var cookie_name = 'HOW_TO_WRITE_TEXT',
			userAcceptedCookies = new Helper().isCookieSet(cookie_name);
		if (!userAcceptedCookies) {
			$('#' + popupHowToWriteText).modal('show');
		}

		// accept cookie
		$('#' + popupHowToWriteTextOkayButton).click(function(){
			$('#' + popupHowToWriteText).modal('hide');
			new Helper().setCookie(cookie_name);
		});
	};

	/**
	 * Hides the url sharing text field
	 */
	this.hideEditFieldsInEditPopup = function () {
		$('#' + popupEditStatementSubmitButtonId).hide();
		$('#' + popupEditStatementTextareaId).hide();
		$('#' + popupEditStatementDescriptionId).hide();
	};

	/**
	 * Hides the logfiles
	 */
	this.hideLogfileInEditPopup = function () {
		$('#' + popupEditStatementLogfileSpaceId).empty();
		$('#' + popupEditStatementLogfileHeaderId).html('');
	};

	/**
	 * Closes the popup and deletes all of its content
	 */
	this.hideandClearEditStatementsPopup = function () {
		$('#' + popupEditStatementId).modal('hide');
		$('#' + popupEditStatementContentId).empty();
		$('#' + popupEditStatementLogfileSpaceId).text('');
		$('#' + popupEditStatementLogfileHeaderId).text('');
		$('#' + popupEditStatementTextareaId).text('');
		$('#' + popupEditStatementErrorDescriptionId).text('');
		$('#' + popupEditStatementSuccessDescriptionId).text('');
	};

	/**
	 * Closes the popup and deletes all of its content
	 */
	this.hideAndClearUrlSharingPopup = function () {
		$('#' + popupUrlSharingId).modal('hide');
		$('#' + popupUrlSharingInputId).val('');
	};

	/**
	 * Hides error description
	 */
	this.hideErrorDescription = function(){
		$('#' + discussionErrorDescriptionId).html('');
		$('#' + discussionErrorDescriptionSpaceId).hide();
	};

	/**
	 * Hides success description
	 */
	this.hideSuccessDescription = function(){
		$('#' + discussionSuccessDescriptionId).html('');
		$('#' + discussionSuccessDescriptionSpaceId).hide();
	};

	/**
	 * Hides the error field
	 */
	this.hideDiscussionError = function () {
		$('#' + discussionFailureRowId).hide();
	};

	/**
	 * Updates an statement in the discussions list
	 * @param jsonData
	 */
	this.updateOfStatementInDiscussion = function (jsonData) {
		$('#td_' + jsonData.uid).text(jsonData.text);
		$('#' + jsonData.uid).text(jsonData.text);
	};

	/**
	 * Sets style attributes to default
	 */
	this.resetChangeDisplayStyleBox = function () {
		this.setDisplayStyleAsDiscussion();
	};

	/**
	 * Check whether the edit button should be visible or not
	 */
	this.resetEditAndRefactorButton = function (optionalEditable) {
		if (typeof optionalEditable === 'undefined') { optionalEditable = true; }

		var is_editable = false, statement, uid, is_premise, is_start;
		$('#' + discussionSpaceId + ' ul > li').children().each(function () {
			statement = $(this).val();
			uid = $(this).attr('id');
			is_premise = $(this).hasClass('premise');
			is_start = $(this).hasClass('start');
			// do we have a child with input or just the label?
			if (optionalEditable) {
				if ($(this).prop('tagName').toLowerCase().indexOf('input') > -1
						&& statement.length > 0
						&& $.isNumeric(uid)
						|| is_premise
						|| is_start) {
					is_editable = true;
					return false; // break
				}
			}
		});

		// do we have an statement there?
		if (is_editable) {
			$('#' + editStatementButtonId).show();
			$('#' + reportButtonId).show();
		} else {
			$('#' + editStatementButtonId).hide();
			$('#' + reportButtonId).hide();
		}
	};
}
