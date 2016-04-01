/**
 * 
 */


// javascript code
//var button = document.getElementById('start-peer-connection');
//button.onclick = function() {
//start();
//}

function getText(textfieldID){
	return document.getElementById(textfieldID).value;
}

function MessageRegisterMe(address){
	this.type = 'register';
	this.address = address;
}

function MessageServerResponse(res, desc){
	this.type = 'server-response';
	this.res = res;
	this.desc = desc;
}

function MessageForward(address, submessage){
	this.type = 'forward';
	this.address = address;
	this.submessage = submessage;
}
function MessageDelivery(from, submessage){
	this.type = 'delivery';
	this.from = from;
	this.submessage = submessage;
}

var connection;

function register(){
	connection = new WebSocket(SignalServer);

    connection.onopen = function () {
    	connection.send(JSON.stringify(new MessageRegisterMe(getText('address'))));
    };

    connection.onerror = function (error) {
        // an error occurred when sending/receiving data
    };

    connection.onmessage = function (message) {
        // try to decode json (I assume that each message from server is json)
        try {
        	console.log("got "+message.data);
            var result = JSON.parse(message.data);
            if (result.type == (new MessageServerResponse('').type)){
            	console.log("MessageServerResponse: "+result.desc);
            }
            if (result.type == (new MessageDelivery('','').type)){
            	console.log("MessageDelivery from: "+result.from);
            	gotMessageFromServer(result.from, result.submessage);
            }
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }
        // handle incoming message
    };
    step2();
}

var localVideo;
var remoteVideo;
var peerConnection;
var peerConnectionConfig = {'iceServers': [{'url': TurnServer}]};

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;


function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
}

//register first

function step2(){
	
	localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    
    var constraints = {
        video: true,
        audio: true,
    };

    if(navigator.getUserMedia) {
        navigator.getUserMedia(constraints, getUserMediaSuccess, errorHandler);
    } else {
        alert('Your browser does not support getUserMedia API');
    }
	
}

function start(isCaller) {
	
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);

    if(isCaller) {
        peerConnection.createOffer(gotDescription, errorHandler);
    }
}

var current_caller;

function getTarget(){
	var from = getText('target');
	if (from == null || from == "") 
		from = current_caller;
	return from;
}

function gotMessageFromServer(caller, signal) {
    
    if(signal.sdp) {
    	if(signal.sdp.type == "offer"){
    		//if(!peerConnection) 
    			start(false);
    		current_caller = caller;
	        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
	            peerConnection.createAnswer(gotDescription, errorHandler);
	        }, errorHandler);
    	}else{
    		console.log("Got SDP, but SDP is not an offer, so do not create answer ");
    		peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {}, errorHandler);
    	}
    	
    } else if(signal.ice) {
    	current_caller = caller;
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
    }
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
    	console.log("send ice to "+getTarget());
        connection.send(JSON.stringify(new MessageForward(getTarget(),{'ice': event.candidate})));
    }
}

function gotDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description, function () {
    	console.log("send sdp to "+getTarget());
        connection.send(JSON.stringify(new MessageForward(getTarget(),{'sdp': description})));
    }, function() {console.log('set description error')});
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

function errorHandler(error) {
    console.log(error);
}
