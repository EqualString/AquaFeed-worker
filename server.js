/* 
|------------------------------------------|
| AquaFeed - IoT nodejs Server (COMM)      |
|------------------------------------------|
| @author:  Egredžija Alen                 |
| @version: 2.7 (12.6.2016)                |
| @website: http://aquafeed.cleverapps.io  |
|------------------------------------------|
*/

// Dopunske vendor skripte (moduli)
var express      = require('express'); 
var bodyParser   = require('body-parser');
var InfiniteLoop = require('infinite-loop'); 
var mysql      	 = require('mysql'); 
var mqtt         = require('mqtt'); 
var moment       = require('moment-timezone');
var http_request = require('request');
var app          = express();

// Port aplikacije
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8074;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

// Dopunske varijable
var i, j, ln, timesLength, now, users, times, id, userTimezone, logTime, today;

// SQL Baza podataka na db4free.net
var	pool = mysql.createPool({
	host     : 'db4free.net',
	user     : 'equalstring',
	password : 'UEBSAW11391',
	database : 'equaldb'
});

// Express konfiguracija
app.set('port', server_port);
app.set('ip', server_ip_address);

app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.set('views', __dirname + '/public');

app.use(bodyParser.json()); // support za json encoded body
app.use(bodyParser.urlencoded({ extended: true })); // support za encoded body

// REST api (zahtjev za trenutno hranjenje od strane kontrolong dijela)
app.post('/api/control', function(req, res){
	
	//Slanje arduinu putem mqtt protokola
	client = mqtt.connect('mqtt://test.mosquitto.org');// Free Broker
	client.subscribe('aquafeed-arduino-'+req.body.key);// Kao i log i vremena, svaki arduino ima zasebnu komunikaciju putem id-a (subscribe sobu)
	client.publish('aquafeed-arduino-'+req.body.key, 'feed'); // Slanje poruke
	client.end();
	res.end();
	
});

// OpenShift(server_port & server_ip)
var server = require('http').createServer(app);
server.listen(app.get('port'), app.get('ip'), function(){
	console.log('app @ :http:// '+ server_port);
});

app.use(express.static(__dirname + '/public'));// Koristi sve iz foldera 'public'

/** Beskonačna petlja servera za slanje **/
var il = new InfiniteLoop;
function loop() {

	pool.getConnection(function(err, connection) {
		//Dohvaćanje user-a
		connection.query('SELECT * FROM `Users` ORDER BY userID', function (error, results, fields) {
			if (error) {
				console.error('error querry: ' + error.stack);
				return;
			}
			connection.release(); //Vraćanje konekcije u pool
			
			// results -> rezultat query-a
			ln = results.length;
			users = results;
			
			//Loop za svakog korisnika
			for ( i = 0; i < ln; i++ ){
			
				id = users[i].userID; //Za pristup ostalim 'povezanim' tablicama
				now = moment.tz(users[i].timeZone).format('HH:mm'); //Dohvaćanje trenutnog vremena po korisnikovoj vremenskoj zoni
				today = moment.tz(users[i].timeZone).format('dddd'); //Koji je dan po korisnikovoj vremenskoj zoni 
				
				pool.getConnection(function(i, err, connection) {
					//Dohvaćanje vremena za svakog user-a
					connection.query('SELECT * FROM `times_'+id+'` WHERE flags="0"',  function (error, results, fields) { //Selektiraj vremena koja nisu izvedena
						if (error) {
							console.error('error querry: ' + error.stack);
							return;
						}
						connection.release(); 
						
						//User-ova vremena
						timesLength = results.length; //Broj vremena
						times = results; //Vremena
						
						//Loop za sva korisnikova vremena
						for ( j = 0; j < timesLength; j++ ){
						
							if ( times[j].times === now ){ //Vrijeme iz tablice == trenutno
								
								//Slanje arduinu putem mqtt protokola
								client = mqtt.connect('mqtt://test.mosquitto.org');  //Free Broker
								client.subscribe('aquafeed-arduino-'+id); //Kao i log i vremena, svaki arduino ima zasebnu komunikaciju putem id-a (subscribe sobu)
								client.publish('aquafeed-arduino-'+id, 'feed'); //Slanje poruke
								client.end();
								
								//Header za POST
								var headers = {
									'Content-Type': 'application/x-www-form-urlencoded'
								};
								
								//Slanje zahtjeva za Realtime Timeline
								http_request.post("http://aquatest-testfeed.rhcloud.com/api/worker", {form: {key: id}, headers: headers}, function(err){
									if (err) {
										return;
									}
								}); 
								
								//Postavljanje flag-a da je izvršeno
								pool.getConnection(function(j, err, connection) {
									//Update flag-a
									connection.query('UPDATE `times_'+id+'` SET flags="1" WHERE times="'+now+'" LIMIT 1', function (error) {
										if (error) {
											return;
										}
									});	
									connection.release(); 
								}.bind(pool, j));
								
								//Update log-a
								pool.getConnection(function(j, err, connection) {
									logTime = (users[i].timeZone).format('DD/MM/YYYY HH:mm');
									connection.query('INSERT INTO `log_'+id+'` (time, event) VALUES ("'+logTime+'", "Poslan zahtjev")', function (error) {
										if (error) {
											return;
										}
									});	
									connection.release(); 
								}.bind(pool, j));
							}
						}
						
					});
				}.bind(pool, i));
				
				//Resetiranje flagova svih svakih 24-sata
				if (now === "00:00"){
				
					//Reset flag-a
					pool.getConnection(function(i, err, connection) {
						connection.query('UPDATE `times_'+id+'` SET flags="0"', function (error) { //Svaka columna u tablici flags = 0
							if (error) {
								console.error('error querry: ' + error.stack);
								return;
							}
						});	
						connection.release(); 
					}.bind(pool, i));		
					
				}
				
				//Resetiranje loga svakog ponedjeljka u 1:00 
				if ((now === "01:00")&&(today === "Monday")){
					
					//Pražnjenje tablice
					pool.getConnection(function(i, err, connection) {
						connection.query('TRUNCATE TABLE `log_'+id+'`', function (error) { //Brisanje svih zapisa iz log-a
							if (error) {
								console.error('error querry: ' + error.stack);
								return;
							}
						});	
						connection.release(); 
					}.bind(pool, i));		
	
				}
				
			}
		});
	});
	
}
il.add(loop,[]).setInterval(50000).run(); //Iteracija petlje je svakih 60 sekundi
il.onError(function(error){
    console.log(error); //Primanje grešaka
});

/*client = mqtt.connect('mqtt://test.mosquitto.org');  //Free Broker
		client.subscribe('aquafeed-arduino-'+socket.request.session.userID); //(subscribe soba)
		console.log(socket.request.session.userID);
		client.on('message', function (topic, message) {
			var por = message.toString();
			if(por == 'feed'){
				socket.emit('gotFeedmsg');
			}
		});*/


