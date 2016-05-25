var mqtt = require('mqtt');
var express = require('express'); 
var app = express();
var http_request = require('request');

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8074;
var headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
};
//Konfiguracija servera
var server = app.listen(server_port, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('app @ :http://localhost:'+server_port+'/');
	console.log('->');
	http_request.post("http://localhost:8080/api/worker", {form: {key: '1'}, headers: headers});
});

app.get('/', function(req, res){
	
});

/*var client = mqtt.connect('mqtt://test.mosquitto.org'); 
client.subscribe('aquafeed-arduino-1');
client.publish('aquafeed-arduino-1', 'feed');*/