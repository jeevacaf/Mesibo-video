
//var api = null;
var curUser = null;
//var selected_user = null;
var live = null;
var publisher = null;
var notify = null;

var callInProgressListener = null;
var globalCallListener = null;
var isAudio = true;
var isVideo = false;
var isJoined = false;
var ringtone = null;
var isPlayed = false;
var streams = [];
const MAX_STREAMS_COUNT = 20;

function MesiboGroupCall(s) {
	this.gScope = s;
	this.gApi = {};
	this.init();
}

MesiboGroupCall.prototype.init = function(){
	this.gApi = this.gScope.getMesibo();
	if(!isValid(this.gApi)){
		MesiboLog("Invalid Mesibo Instance");
		return -1;
	}

	notify = new MesiboNotify();
	globalCallListener = new GroupCallListener();
	callInProgressListener = new GroupCallInProgressListener();	
	//initStreams();
	
	return this;
}

MesiboGroupCall.prototype.startGroupCall = function(GROUP_ID,currentUser,callType,gpName){
	//notify = new MesiboNotify();

	isJoined = true;
	if(isPlayed){
		ringtone.pause();
		isPlayed = false;
	}
		
	if(callType == 'audio'){
		isVideo = false;
	}else{
		isVideo = true;
	}
	initStreams();
	curUser = currentUser;
	//globalCallListener = new GroupCallListener();
	if(!GROUP_ID){
		alert('Invalid group id');
		return;
	}	
	
	live = this.gApi.groupCall(globalCallListener, GROUP_ID);
	if(!live){
		console.log("Group call not initialized!");
		return;
	}
	live.join(globalCallListener);
	
	publisher = live.createPublisher(0);
	if(!publisher){
		console.log("Invalid call to publish!");
		return;
	}
	//callInProgressListener = new GroupCallInProgressListener();
	streamFromCamera();
	$("#groupCallModal").modal("show");
	$("#group-call-details").text(gpName +" "+callType+" Call");
	
}

function stopGroupCall(GROUP_ID,currentUser){
	isJoined = false;
	selfHangup();
	exitRoom()
}


MesiboNotify.prototype.Mesibo_OnPermission = function(on) {
	console.log("Mesibo_onPermission: " + on);
	//show permission prompt
}

MesiboNotify.prototype.Mesibo_OnConnectionStatus = function(status) {
	console.log("Mesibo_OnConnectionStatus: " + status);
	var s = document.getElementById("cstatus");
	if(!s) return;

	if(MESIBO_STATUS_ONLINE == status) {
		s.classList.replace("btn-danger", "btn-success");
		s.innerText = selected_user.name + " is online";                
		
		return;
	}

	s.classList.replace("btn-success", "btn-danger");

	switch(status) {
		case MESIBO_STATUS_CONNECTING:
			s.innerText = "Connecting";
			break;

		case MESIBO_STATUS_CONNECTFAILURE:
			s.innerText = "Connection Failed";
			break;

		case MESIBO_STATUS_SIGNOUT:
			s.innerText = "Signed out";
			break;

		case MESIBO_STATUS_AUTHFAIL:
			s.innerText = "Disconnected: Bad Token or App ID";
			break;

		default:
			s.innerText = "You are offline";
			break;
	}

}


function GroupCallListener() {

}

MesiboGroupCall.prototype.disconnect = function(){
	ringtone.pause();
	selfHangup();
}

function playRingtone(){
	if(!isPlayed){
		ringtone = new Audio('ringtone/incomingcall.mp3');
		ringtone.loop = false;
		ringtone.play();
		isPlayed = true;
	}
}
GroupCallListener.prototype.MesiboGroupcall_OnPublisher = function(p, joined) {	
	if(!p)
		return;

	console.log("GroupCallListener.MesiboGroupcall_OnPublisher: "+ p.getName() + " joined: "+ joined);
	if(joined){
		connectStream(p);
		//Trigger call notification
		if(!isJoined){
			try{// Group id[p.D.C], name[p.D.name], address[p.D.address]
				console.log("Group Id: "+p.D.C);
				//document.getElementById("ansGroupBody").innerHTML = "";
				playRingtone();
				document.getElementById("ansGroupBody").innerHTML = "Incomming Group call";
				$('#groupCallId').val(p.D.C);
				$('#answerGroupModal').modal('show');
				//After 30 sec hide user modal
				setTimeout(function() {
					$("#answerGroupModal").modal('hide');
				}, 30000);
				
			}catch(e){
				console.log("Failed to trigger call notification: "+e);
			}
		}
	}
}

GroupCallListener.prototype.MesiboGroupcall_OnSubscriber = function(p, joined) {	
	if(!p)
		return;
	console.log("GroupCallListener.MesiboGroupcall_OnSubscriber: "+p.name +" joined "+joined);
	MesiboLog(p);
	if(!joined){
		// remove the element who are left the conference call
		$('#groupVideoStream .conference-img').each(function(idx, el){
			var val = $(this).attr('id');
			var attval = $(this).attr('data-pid');
			if(attval && (attval == p.uid))
				document.getElementById(val).style.display = 'none';
		})
	}
	if(joined){
		console.log(p.name+" is Joined. Address"+p.address+" Group id : "+p.C);
	}
}


function GroupCallInProgressListener() {

}


GroupCallInProgressListener.prototype.MesiboGroupcall_OnVideo = function(p) {
	console.log('MesiboGroupcall_OnVideo');

	//Local Stream
	if(p.isLocal()) {
		if(isVideo){
			p.setVideoView("video-publisher", function(){
				console.log("Set video for "+ p.getName())
			}, 10, 20);
		}else{
			var imgUrl = getUserProfilePicture(p.getId());
			$('#image-publisher').attr('src',imgUrl);
		}
		return;
	}

	//Remote Stream
	console.log('===> on_video', p.element_id, 'attach');
	
	p.setVideoView(p.element_id, function(){
		console.log("Set video for "+ p.getName()+" : Mute status "+p.getMuteStatus(true)+" : "+p.getMuteStatus(false))
		document.getElementById('body-'+p.element_id).style.display = 'block';
		$('#name-'+p.element_id).html(p.getName());
		if(!isVideo){
			var imgUrl = getUserProfilePicture(p.getId());
			$('#profile-'+p.element_id).attr('src',imgUrl);
		}
	}, 10, 20);
}

GroupCallInProgressListener.prototype.MesiboGroupcall_OnAudio = function(p) {   
	console.log('MesiboGroupcall_OnAudio');
	if(!p)
		return;
	console.log("GroupCallListener.MesiboGroupcall_OnAudio: "+p.getName());
}


GroupCallInProgressListener.prototype.MesiboGroupcall_OnConnected = function(p, connected){
	console.log('MesiboGroupcall_OnConnected', p.getId(), p.getName(), 'local?', p.isLocal(), connected);

	if(connected){
		console.log(p.getName()+ ' is connected --->'+p.getId());
		if(p.element_id){
			$('#'+p.element_id).attr('data-pid',p.getId());
			//$().attr();
		}
	}
}

GroupCallInProgressListener.prototype.MesiboGroupcall_OnHangup = function(p, reason) {
	console.log('MesiboGroupcall_OnHangup', p.getName(), reason);
	if(p.isLocal()) {
		return;
	}
	if(!p)
		return;
	for(var i = 0; i < streams.length; i++){
		if(p.getId()){
			if ( streams[i].getId() === p.getId()) {
				streams[i] = null; //Free up slot
				$('#name-video-remote-'+i).html("");
				document.getElementById('body-video-remote-'+i).style.display = 'none';
				return;
			}
		}
	}
}

GroupCallInProgressListener.prototype.MesiboGroupcall_OnMute = function(p, audioMuted, videoMuted, remote) {
	console.log('MesiboGroupcall_OnMute = '+p.element_id);
	if(audioMuted){
        // Audio Muted
		document.getElementById('saudmute-'+p.element_id).style.display = 'none';
		document.getElementById('saudunmute-'+p.element_id).style.display = 'block';
		console.log("====>"+p.getName() +" audio muted");
    }else{
    	console.log("====>"+p.getName() +" audio unmute");
    	document.getElementById('saudmute-'+p.element_id).style.display = 'block';
		document.getElementById('saudunmute-'+p.element_id).style.display = 'none';
    }

	if(isVideo){
		if(videoMuted){
	        // Video Muted
			console.log("====>"+p.getName() +" video mute");
			document.getElementById('svidmute-'+p.element_id).style.display = 'none';
			document.getElementById('svidunmute-'+p.element_id).style.display = 'block';
	    }else{
	    	console.log("====>"+p.getName() +" video unmute");
	        document.getElementById('svidmute-'+p.element_id).style.display = 'block';
	    	document.getElementById('svidunmute-'+p.element_id).style.display = 'none';
	    }
	}
    	
}

// TODO: Talking detection 
// You can use p.isTalking() to check whether a participant is talking
GroupCallInProgressListener.prototype.MesiboGroupcall_OnTalking = function(p, talking) {
	console.log('MesiboGroupcall_OnTalking');
}



function streamFromCamera() {
	console.log('streamFromCamera');

	publisher.setVideoSource(MESIBOCALL_VIDEOSOURCE_CAMERADEFAULT);
	publisher.call(isAudio, isVideo, callInProgressListener);
	publisher.setName(curUser.getName());

}

function streamFromScreen() {
	console.log('streamFromScreen');

	publisher.setVideoSource(MESIBOCALL_VIDEOSOURCE_SCREEN);
	publisher.call( isAudio, isVideo, callInProgressListener);
	publisher.setName(curUser.getName() +"'s screen");

}



function initStreams(){
	
	var streamIds='<div id="videolocal" class="conference-img"> <div style="width: 350px;height:260px; padding: 10px;border: 2px solid gray;margin: 0; border-radius:5px !important;">';
	if(isVideo){
		streamIds += '<video id="video-publisher" class="video-tag" style="height:100%;" height="100%" width="250" autoplay playsinline /></video> '
			+'<img id="image-publisher" style=" display:none;border-radius:5px; height:80%;margin-top:30px;" src="images/profile/default-profile-icon.jpg">'+
			'<p style="font-family:roboto; font-size:15px;margin-left:10px;margin-top:-20px;"> You</p> </div> </div>';
	}
	else{
		streamIds += '<video id="video-publisher" class="video-tag" style="height:100%;" height="100%" width="250" autoplay playsinline /></video> '
			+'<img  id="image-publisher" style="border-radius:5px; height:80%;margin-top:-280px;" src="images/profile/default-profile-icon.jpg">'
			+'<p style="font-family:roboto; font-size:15px;margin-left:10px;margin-top:-40px;"> You</p> </div> </div>';
	}
	for (var i = 0; i < MAX_STREAMS_COUNT; i++) {
		streams[i] = null;
		if(isVideo){
			streamIds += '<div id="body-video-remote-'+i+'" class="conference-img" style="display:none; margin-right:0px;">'
			+'<div style=" display:flex; flex-direction:column;position:absolute; margin-left:313px;margin-top:100px;">'
			+'<img id=saudmute-video-remote-'+i+' src="images/small-audio.svg"><img style="display:none" id=saudunmute-video-remote-'+i+' src="images/small-audio-strike.svg">'
			+'<img id=svidmute-video-remote-'+i+' src="images/small-video.svg"><img style="display:none" id=svidunmute-video-remote-'+i+' src="images/small-video-strike.svg"></div>'
			+'<div style="width: 350px;height:260px; padding: 10px;border: 2px solid gray;margin: 0;border-radius:5px !important; padding-right:35px;">'
			+'<video id="video-remote-'+i+'" style="height:100%;" height="250" width="250" autoplay playsinline ></video>'
			+'<p id="name-video-remote-'+i+'" style="font-family:roboto; font-size:15px;margin-left:10px;margin-top:-20px;"> </p></div></div>';
		}
		else{
			streamIds += '<div class="conference-img" id="body-video-remote-'+i+'" style="display:none; margin-right:0px;">'
			+'<div style=" display:flex; flex-direction:column;position:absolute; margin-left:313px;margin-top:100px;">'
			+'<img id=saudmute-video-remote-'+i+' src="images/small-audio.svg"><img style="display:none" id=saudunmute-video-remote-'+i+' src="images/small-audio-strike.svg">'
			+'<img id=svidunmute-video-remote-'+i+' src="images/small-video-strike.svg"></div>'
			+'<div style="width: 350px;height:260px; padding: 10px;border: 2px solid gray;margin: 0;border-radius:5px !important; padding-right:35px;">'
			+'<video id="video-remote-'+i+'" style="height:100%;" height="250" width="250" autoplay playsinline ></video>'
			+'<img alt="" id="profile-video-remote-'+i+'" src="images/profile/default-profile-icon.jpg" style=" border-radius:5px; height:80%;margin-top:-280px;"/>'
			+'<p id="name-video-remote-'+i+'" style="font-family:roboto; font-size:15px;margin-left:10px;margin-top:-40px;"> </p> </div></div>';
		}
	}
	$('#groupVideoStream').html(streamIds);
	
}


function selfHangup(){
	publisher.hangup();
}

function exitRoom(){
	console.log("Exiting Room.. Cleaning up and resetting..");
	if(!live)
		return;

	live.leave();
	
	//window.location.reload();
}

function getUserProfilePicture(uid){
	return "images/profile/default-profile-icon.jpg";
	/* var availbleUSersStr = JSON.parse(localStorage.getItem("AVAILABLE_USERS"));
	var userObj = availbleUSersStr.find(o => o.uid === uid);
	var usrAdrs = userObj['mask_address'];
	var scopeObj = angular.element(document.getElementById('mesibowebapp')).scope();
	var usrObj = scopeObj.mesibo.getProfile(userObj['mask_address'], 0);
	return scopeObj.getUserPicture(usrObj) */;
}

function showProfilePicture(uid,isVideo){
	 $("#image-publisher").show().attr('src',getUserProfilePicture(uid));
	 if(isVideo){
		 document.getElementById('video-publisher').style.display = 'block';
		 document.getElementById('image-publisher').style.display = 'none';
	 }else{
		 document.getElementById('video-publisher').style.display = 'none';
		 document.getElementById('image-publisher').style.display = 'block';
	 }
}
function toggleSelfVideo(isVideo) {
	publisher.toggleVideoMute();
	showProfilePicture(publisher.getId(),isVideo);
}

function toggleSelfAudio() {
	publisher.toggleAudioMute();
}

function toggleRemoteVideo(i) {
	var s = streams[i];
	if(s)
		s.toggleVideoMute();
}

function toggleRemoteAudio(i) {
	var s = streams[i];
	if(s)
		s.toggleAudioMute();
}

function hangup(i, reason) {
	var s = streams[i];
	if(s){		
		s.hangup();
	}
}

function connectStream(stream){
	console.log('===> connect', stream);
	for (var i = 0; i < streams.length; i++) {
		if(streams[i] == null){
			streams[i] = stream;
			streams[i].element_id = 'video-remote-'+ i;
			subscribe(streams[i]);
			//document.getElementById('video-remote-'+ i).style.display = 'block';
			document.getElementById('body-video-remote-'+ i).style.display = 'block';
			$('#name-video-remote-'+ i).html("unknown");
			return;
		}
	}
}

function attachStream(stream){
	var uid = stream.getId();
	for (var i = 0; i < streams.length; i++) {
		if(streams[i].getId() == uid){
			var element = streams[i].element_id;
			console.log('===> attach', element);
			streams[i].setVideoView(element);
			document.getElementById('body-'+element_id).style.display = 'block';
			return;
		}
	}
}


function subscribe(p) {
	console.log('====> subscribe', p.getId(), callInProgressListener);
	//Subscribing to both audio and video  of  a participant
	p.call( isAudio, isVideo, callInProgressListener);
}

function redial(index){
	if(streams[index])
		subscribe(streams[index]);
}

//Notify listener
function MesiboNotify() {
	//this.scope = s;
}

MesiboNotify.prototype.MesiboGroupcall_OnIncoming = function(groupProfile, profile, active) {
    console.log("MesiboGroupcall_OnIncoming: " + active);
}


/*
function starGroupCall(GROUP_ID,currentUser,callType){
	//selected_user = users[user_index];

	//api = new Mesibo();
	//api.setAppName(MESIBO_APP_ID);
	//notify = new MesiboNotify();
	//api.setListener(notify);
	//api.setCredentials(selected_user.token);
	//api.setDatabase("mesibo");
	//api.start();
	isJoined = true;
	if(isPlayed){
		ringtone.pause();
		isPlayed = false;
	}
		
	if(callType == 'audio'){
		isVideo = false;
	}else{
		isVideo = true;
	}
	curUser = currentUser;
	//console.log("name : "+curUser.getName() + "username : "+curUser.getAddress());
	//initStreams();

	//Create group call object
	//globalCallListener = new GroupCallListener();
	if(!GROUP_ID){
		alert('Invalid group id');
		return;
	}	
	
	live = api.groupCall(globalCallListener, GROUP_ID);
	if(!live){
		console.log("Group call not initialized!");
		return;
	}
	live.join(globalCallListener);
	
	
	//document.getElementById("exit").style.display = "block";
	
	// Create a local participant, where we will stream camera/screen
	publisher = live.createPublisher(0);
	if(!publisher){
		console.log("Invalid call to publish!");
		return;
	}
	// Ideally you can set a call in progress listener for each participant
	// But, in this simple demo we will create one global in progress listener
	// and use it for all participants
	
	//callInProgressListener = new GroupCallInProgressListener();
	
	// Automatically start streaming from camera
	// call will be started automatically as soon as the user is online
	streamFromCamera();
	
	$("#groupCallModal").modal("show");
	//document.getElementById("conference-area").style.display = 'flex';
	//document.getElementById("login-options").style.display = 'none';

}*/


// You will receive the connection status here
/*MesiboNotify.prototype.Mesibo_OnConnectionStatus = function(status, value) {
	MesiboLog('MesiboNotify.prototype.Mesibo_OnConnectionStatus: ' + status);
    // this.scope.OnConnectionStatus(status, value);

};*/

/*
// You will receive status of sent messages here
MesiboNotify.prototype.Mesibo_OnMessageStatus = function(m) {

	MesiboLog('MesiboNotify.prototype.Mesibo_OnMessageStatus: from ' + m.peer +
		' status: ' + m.status);
    this.scope.onMessageStatus(m);
};

// You will receive messages here
MesiboNotify.prototype.Mesibo_OnMessage = function(m, data) {

	MesiboLog('MesiboNotify.prototype.Mesibo_OnMessage: from ' + m.peer, ' data ', data);
	this.scope.onMessage(m, data);
};

// You will receive calls here
MesiboNotify.prototype.Mesibo_OnCall = function(callid, from, video) {
	MesiboLog('Mesibo_OnCall: '+ callid + ' '+ from + ' '+ video);
    this.scope.onCall(callid, from, data);
};

// You will receive call status here
MesiboNotify.prototype.Mesibo_OnCallStatus = function(callid, status) {
	MesiboLog('Mesibo_onCallStatus: ' + callid + ' ' + status);
    this.scope.onCallStatus(callid, status);
};*/
