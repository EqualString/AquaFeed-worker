/* 
|------------------------------------------|
| AquaFeed - IoT nodejs Server (COMM)      |
|------------------------------------------|
| @author:  Egredžija Alen                 |
| @version: 2.5 (1.10.2015)                |
| @website: http://aquafeed.cleverapps.io  |
|------------------------------------------|
*/

// Dopunske vendor skripte (moduli)
var express      = require('express'); 
var InfiniteLoop = require('infinite-loop'); 
var mysql      	 = require('mysql'); 
var mqtt         = require('mqtt'); 
var time    	 = require('./modules/time-getting.js'); 
var app          = express();

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

//Dopunske varijable
var i,j,ln,ln2,now,users,times,id,logTime;

//SQL Baza podataka na db4free.net
var connection = mysql.createConnection({
  host     : 'db4free.net',
  user     : 'equalstring',
  password : 'UEBSAW11391',
  database : 'equaldb'
});

//Konfiguracija servera
var server = app.listen(server_port, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('app @ :http://localhost:'+server_port+'/');
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  //console.log('connected as id ' + connection.threadId); //Connection thread ID
});


/** Beskonačna petlja servera za slanje **/
var il = new InfiniteLoop;
function loop() {

	now = time.getNow(); //Trenutno vrijeme 
	var test_ned = new Date();
	var ned = test_ned.getDay().toString(); //Dohvaćanje dana u tjednu, 0-ned,1-pon..
	
	//Dohvaćanje user-a
	connection.query('SELECT * FROM `Users` ORDER BY userID', function (error, results, fields) {
		if (error) {
			console.error('error querry: ' + error.stack);
			return;
		}
		// results -> rezultat query-a
		ln = results.length;
		users = results;
		
		for ( i = 0; i < ln; i++ ){
		
			id = users[i].userID; //Za pristup ostalim 'povezanim' tablicama
			
			//Dohvaćanje vremena za svakog user-a
			connection.query('SELECT * FROM `times_'+id+'` WHERE flags="0"',  function (error, results, fields) { //Selektiraj vremena koja nisu izvedena
				if (error) {
					console.error('error querry: ' + error.stack);
					return;
				}
				
				//User-ova vremena
				ln2 = results.length;
				times = results;
				
				for ( j = 0; j < ln2; j++ ){
				
					if ( times[j].times == now ){ //Vrijeme iz tablice == trenutno
						
						//Slanje arduinu putem mqtt protokola
						client = mqtt.connect('mqtt://test.mosquitto.org');  //Free Broker
						client.subscribe('aquafeed-arduino-'+id); //Kao i log i vremena, svaki arduino ima zasebnu komunikaciju putem id-a (subscribe sobu)
						client.publish('aquafeed-arduino-'+id, 'feed'); //Slanje poruke
						client.end();
						
						//Update flag-a
						connection.query('UPDATE `times_'+id+'` SET flags="1" WHERE times="'+now+'" LIMIT 1', function (error) {
							if (error) {
								console.error('error querry: ' + error.stack);
								return;
							}
						});	
						
						//Update log-a
						logTime = time.getLogDate();
						connection.query('INSERT INTO `log_'+id+'` (time, event) VALUES ("'+logTime+'", "Poslan zahtjev")', function (error) {
							if (error) {
								console.error('error querry: ' + error.stack);
								return;
							}
						});	
					
					}
				}
				
			});
			
		}
	});
	
	//Resetiranje flagova svih svakih 24-sata
	if (now == "00:00"){
	
		//Dohvaćanje user-a
		connection.query('SELECT * FROM `Users` ORDER BY userID', function (error, results, fields) {
			if (error) {
				console.error('error querry: ' + error.stack);
				return;
			}
			// results -> rezultat query-a
			ln = results.length;
			users = results;
			for ( i = 0; i < ln; i++ ){
				
				id = users[i].userID;				
				//Update flag-a
				connection.query('UPDATE `times_'+id+'` SET flags="0"', function (error) { //Svaka columna u tablici flags = 0
					if (error) {
						console.error('error querry: ' + error.stack);
						return;
					}
				});	
					
			}
		});
	}
		
	//Resetiranje loga svake nedjelje u 1:00 
	if ((now == "01:00")&&(sun == "0")){
		
		//Dohvaćanje user-a
		connection.query('SELECT * FROM `Users` ORDER BY userID', function (error, results, fields) {
			if (error) {
				console.error('error querry: ' + error.stack);
				return;
			}
			// results -> rezultat query-a
			ln = results.length;
			users = results;
			for ( i = 0; i < ln; i++ ){
				
				id = users[i].userID;				
				//Update flag-a
				connection.query('TRUNCATE TABLE `log_'+id+'`', function (error) { //Brisanje svih zapisa iz log-a
					if (error) {
						console.error('error querry: ' + error.stack);
						return;
					}
				});	
					
			}
		});
	}
}
il.add(loop,[]).setInterval(60000).run(); //Iteracija petlje je svakih 60 sekundi
il.onError(function(error){
    console.log(error); //Primanje grešaka
});




