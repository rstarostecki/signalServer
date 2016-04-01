function Client(conn, address){
	this.connection = conn;
	this.address = address;
}

function Clients () {
    this.max = 10;
    this.count = 0;
    this.clients = {};
    this.add = function(new_client){
    	var c = this.get(new_client.address);
    	if(c != undefined){
    		c.connection.close();
    		c.connection = new_client.connection;
    		console.log("Client updated, index: "+c.address);
    	}else{
    		this.clients[this.count++] = new_client;
    		console.log("New client added, index: "+new_client.address);
    	}	
    }
    this.close = function(address, connection){
    	var i;
    	var c;
    	for (i = 0; i < this.count; i++) {
    		if(this.clients[i] === undefined) continue;
    	    if(this.clients[i].address == address){
    	    	c = this.clients[i];
    	    	break;
    	    }
    	}
    	if (c != undefined){
    		if(c.connection == connection){
    			connection.close();
    			this.clients[i] = undefined;
    			console.log("Client "+address+" Exited Definitly");
    		}
    	}
    }       
    this.get = function(address){
    	var i;
    	for (i = 0; i < this.count; i++) {
    		if(this.clients[i] === undefined) continue;
    	    if(this.clients[i].address == address)
    	    	return this.clients[i];
    	}
    	return undefined;
    }
}

function Message(type, submessage){
	this.type = type;
	this.submessage = submessage;
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

(function(){
	var user_index = 0;
	var clients = new Clients();
	var fs = require('fs');
	var serverConfig = {
		port: 1337,
		cert : fs.readFileSync('/home/romek/cert/y50.pem'), //provide your cert
		key : fs.readFileSync('/home/romek/cert/y50.key')//provide your key
	}

    var httpServ = require('https');
    var WebSocketServer   = require('websocket').server;

    var app = httpServ.createServer({
	    	key: serverConfig.key,
	    	cert: serverConfig.cert,
	    	passphrase: "zupa" //provide passphrase to your cert key  (or you will be prompted for key during wsserv start)
	    }).listen( serverConfig.port );

    var wss = new WebSocketServer( { httpServer: app } );

	wss.on('request', function(request) {
		var connection = request.accept(null, request.origin);
		var client = 0;
		connection.on('message', function(message) {
			try {
				console.log("got "+message.utf8Data);
	            var result = JSON.parse(message.utf8Data);
	            if (result.type == new MessageRegisterMe('').type){
	            	console.log("MessageRegisterMe: "+result.address);
	            	client = new Client(connection, result.address);
	            	clients.add(client);
	            	connection.send(JSON.stringify(new MessageServerResponse(0,'OK')));
	            }
	            if (result.type == new MessageForward('','').type){
	            	console.log("MessageForward to: "+result.address);
	            	var target = clients.get(result.address);
	            	if(target == undefined){
	            		console.log("MessageForward to: "+result.address+" failed. Target client not found.");
	            		connection.send(JSON.stringify(new MessageServerResponse(1,'Failure: Target client not found.')));
	            	}else{
	            		target.connection.send(JSON.stringify(new MessageDelivery(client.address, result.submessage)));
	            	}
	            }
	            	
	        } catch (e) {
	            console.log('This doesn\'t look like a valid JSON: ', message.utf8Data);
	            return;
	        }
		});
		
		connection.on('close', function(c) {
			console.log("Client connection exited: "+client.address);
			clients.close(client.address, connection);
		});
	});


}());