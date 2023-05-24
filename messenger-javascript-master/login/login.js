$(function() {
	'use strict';

	
	console.log('login init');
  $('.form-control').on('input', function() {
	  var $field = $(this).closest('.form-group');
	  if (this.value) {
	    $field.addClass('field--not-empty');
	  } else {
	    $field.removeClass('field--not-empty');
	  }
	});

});

function redirect_messenger() {
	window.location.replace("messenger.html");
}

function login_init() {
	console.log('start login');
	var token = getLoginToken();
	if(token && token.length > 16) {
		redirect_messenger();
		return;
	}
	var mesibo = Mesibo.getInstance();

	document.getElementById("otpdiv").style.display = "none";
	document.getElementById("otp").value = '';
	document.getElementById('phone').readOnly = false;
	document.getElementById("phone").value = '';
	_displayLoginError(null);
}

function login_start() {
	var phone = document.getElementById("phone").value;
	
		var token =USERS[phone];
		if(token && token.length > 16){
			console.log("Login Successfull");

			document.getElementById("phone").innerHTML = null;
			document.getElementById("otp").innerHTML = null;

			saveLoginToken(token);
			redirect_messenger();
		}

      
}

function _displayLoginError(error) {
	document.getElementById("errmsg").style.display = error?"block":"none";
	if(error)
		document.getElementById("errmsg").value = error;
}


