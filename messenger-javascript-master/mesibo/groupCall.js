
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
const MAX_STREAMS_COUNT = 3;

function MesiboGroupCall(s) {
	this.gScope = s;
	this.gApi = {};
	this.init();
}

MesiboGroupCall.prototype.init = function(){
	//console.log("****************** ============ ****************");
	this.gApi = this.gScope.getMesibo();
	if(!isValid(this.gApi)){
		MesiboLog("Invalid Mesibo Instance");
		return -1;
	}

	notify = new MesiboNotify(this.gScope);
	globalCallListener = new GroupCallListener();
	callInProgressListener = new GroupCallInProgressListener();
	initStreams();
	
	return this;
}

/*setTimeout(function() {
	
	
	console.log("object init ***********================");
}, 5000);*/

MesiboGroupCall.prototype.startGroupCall = function(GROUP_ID,currentUser,callType){
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

function stopGroupCall(GROUP_ID,currentUser){
	isJoined = false;
	selfHangup();
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
	if(joined)
		console.log(p.name+" is Joined. Address"+p.address+" Group id : "+p.C);
}


function GroupCallInProgressListener() {

}


GroupCallInProgressListener.prototype.MesiboGroupcall_OnVideo = function(p) {
	console.log('MesiboGroupcall_OnVideo');

	//Local Stream
	if(p.isLocal()) {
		p.setVideoView("video-publisher", function(){
			console.log("Set video for "+ p.getName())
		}, 10, 20);
		return;
	}

	//Remote Stream
	console.log('===> on_video', p.element_id, 'attach');
	p.setVideoView(p.element_id, function(){
		console.log("Set video for "+ p.getName())
	}, 10, 20);
}

GroupCallInProgressListener.prototype.MesiboGroupcall_OnIncoming = function(p) {   
	console.log('MesiboGroupcall_OnIncoming');
	if(!p)
		return;
	//console.log("GroupCallListener.MesiboGroupcall_OnIncoming: "+p.getName());
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
		console.log(p.getName()+ ' is connected');
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
				return;
			}
		}
	}
}

GroupCallInProgressListener.prototype.MesiboGroupcall_OnMute = function(p, audioMuted, videoMuted, remote) {
	console.log('MesiboGroupcall_OnMute');
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
	for (var i = 0; i < MAX_STREAMS_COUNT; i++) {
		streams[i] = null;
	}
}


function selfHangup(){
	publisher.hangup();
}

function exitRoom(){
	console.log("Exiting Room.. Cleaning up and resetting..");
	if(!live)
		return;

	live.leave();
	
	window.location.reload();
}


function toggleSelfVideo() {
	publisher.toggleVideoMute();
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
	for (var i = 0; i < streams.length; i++) {
		if(streams[i] == null){
			streams[i] = stream;
			streams[i].element_id = 'video-remote-'+ i;
			subscribe(streams[i]);

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

// You will receive the connection status here
/*MesiboNotify.prototype.Mesibo_OnConnectionStatus = function(status, value) {
	MesiboLog('MesiboNotify.prototype.Mesibo_OnConnectionStatus: ' + status);
    // this.scope.OnConnectionStatus(status, value);

};*/

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
};
