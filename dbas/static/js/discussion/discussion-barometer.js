/**
 * @author Tobias Krauthoff
 * @email krauthoff@cs.uni-duesseldorf.de
 */

function DiscussionBarometer(){
	'use strict'

	/**
	 * Displays the barometer
	 */
	this.showBarometer = function(){
		var uid = 0, uid_array = [],
			splitted = window.location.href.split('/'),
			adress = 'position';

		// parse url
		if (window.location.href.indexOf('/attitude/') != -1){
			adress = 'attitude';
			uid = splitted[splitted.length-1];
			new DiscussionBarometer().ajaxRequest(uid, adress);
		} else if (window.location.href.indexOf('/justify/') != -1 || window.location.href.indexOf('/choose/') != -1) {
			adress = 'statement';
			$('#discussions-space-list li:not(:last-child) label').each(function(){
				uid_array.push($(this).attr('id'));
			});
			new DiscussionBarometer().ajaxRequest(uid_array, adress);
		} else if (window.location.href.indexOf('/reaction/') != -1){
			adress = 'argument';
			uid = splitted[splitted.length-3];
			new DiscussionBarometer().ajaxRequest(uid, adress);
		} else {
			adress = 'position';
			new DiscussionBarometer().ajaxRequest(uid, adress);
		}
	};

	/**
	 * Requests JSON-Object
	 * @param uid: current id in url
	 * @param adress: keyword in url
	 */
	this.ajaxRequest = function(uid, adress){
		var dataString;
		switch(adress){
			case 'attitude':
				dataString = {is_argument: 'false', is_attitude: 'true', is_reaction: 'false', uids: uid};
			break;
			case 'statement':
				var json_array = JSON.stringify(uid);
				dataString = {is_argument: 'false', is_attitude: 'false', is_reaction: 'false', uids: json_array};
			break;
			case 'argument':
				dataString = {is_argument: 'true', is_attitude: 'false', is_reaction: 'true', uids: uid};
			break;
			default:
				dataString = {is_argument: 'false', is_attitude: 'false', is_reaction: 'false', uids: uid};
		}

		$.ajax({
			url: 'ajax_get_user_with_same_opinion',
			type: 'GET',
			dataType: 'json',
			data: dataString,
			async: true
		}).done(function (data) {
			new DiscussionBarometer().callbackIfDoneForGetDictionary(data, adress);
		}).fail(function () {
			new DiscussionBarometer().callbackIfFailForGetDictionary();
		});
	}

	/**
	 * Callback if the ajax request was successfull
	 * @param data: unparsed data of the request
	 * @param adress: keyword in url
	 */
	this.callbackIfDoneForGetDictionary = function(data, adress){
		var obj;
        try{
	        obj = JSON.parse(data);
			console.log(obj);
        }catch(e){
	        // TODO: Um die Anzeige einer Fehlermeldung kümmern wir uns später.
			alert('parsing-json: ' + e);
	        return;
        }
		$('#' + popupConfirmDialogId).modal('show');
		$('#' + popupConfirmDialogId + ' div.modal-body')
			.html('<canvas id="chartCanvas" width="400" height="400" style= "display: block; margin: 0 auto;"></canvas>');
		$('#' + popupConfirmDialogAcceptBtn).show().click( function () {
			$('#' + popupConfirmDialogId).modal('hide');
		}).removeClass('btn-success');

		switch(adress){
			case 'attitude': new DiscussionBarometer().createAttitudeBarometer(obj); break;
			case ('statement' || 'position'): new DiscussionBarometer().createStatementBarometer(obj); break;
			case 'argument': new DiscussionBarometer().createArgumentBarometer(obj); break;
		}

	};

	/**
	 * Creates chart for attitude
	 * @param obj: parsed JSON-object
	 */
	this.createAttitudeBarometer = function(obj) {
		$('#' + popupConfirmDialogId + ' h4.modal-title').html(obj.text);
    	var ctx = $('#' + popupConfirmDialogId + ' div.modal-body ' + "#chartCanvas").get(0).getContext("2d");

		var pieData = [
        {
			value: obj.agree_users.length,
        	color: "#41AF3D",
			highlight: "#8ADB87",
            label: 'agree'
        },
		{
			value: obj.disagree_users.length,
        	color: "#E04F5F",
			highlight: "#EFA5AC",
			label: 'disagree'
		}
		];

		var chart = new Chart(ctx).Pie(pieData);
	};

	/**
	 * Creates chart for statement
	 * @param obj: parsed JSON-object
	 */
	this.createStatementBarometer = function(obj) {
		var ctx = $('#' + popupConfirmDialogId + ' div.modal-body ' + "#chartCanvas").get(0).getContext("2d");
		var chart = new Chart(ctx).Pie();
		$.each(obj, function(i, e) {
			$.each(e, function(key,value){
				if (value.text != null) {
					var randomColor = '#' + (Math.random().toString(16) + '0000000').slice(2, 8);
					chart.addData({
						value: value.users.length,
						color: randomColor,
						label: value.text
					});
				}
			});
		});
	};

	/**
	 * Creates chart for argument
	 * @param obj: parsed JSON-object
	 */
	this.createArgumentBarometer = function(obj) {
		var ctx = $('#' + popupConfirmDialogId + ' div.modal-body ' + "#chartCanvas").get(0).getContext("2d");
		var chart = new Chart(ctx).Pie();
		$.each(obj, function(key, value) {
			console.log(value);
			if(key != 'error') {
				var randomColor = '#' + (Math.random().toString(16) + '0000000').slice(2, 8);
				chart.addData({
					value: value.users.length,
					color: randomColor
				});
			}
		});
	};

	/**
	 * Callback if the ajax request failed
	 */
	this.callbackIfFailForGetDictionary = function(){
		alert('ajax-request: some error');
		// TODO: Um die Anzeige einer Fehlermeldung kümmern wir uns später.
	};
}
