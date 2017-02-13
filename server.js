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
var os           = require('os-utils');
var app          = express();

// Port aplikacije
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8074;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var app_token = 'bL00Zz9Hup5J3vAawFahQsXyMRbXZVY';

// Dopunske varijable
var i, j, ln, timesLength, now, users, times, id, userTimezone, logTime, today;

//Header za POST
var headers = {
	'Content-Type': 'application/x-www-form-urlencoded'
};

//SQL Baza podataka na db4free.net
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

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

//Status http GET
app.get('/', function(req, res){

	var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	var Cpus = os.cpuCount();
	var Platform = os.platform();

	res.render('index.html', {
		userIP: userIP,
		Platform : Platform,
		Cpus : Cpus
	});
	
});

// REST api (zahtjev za trenutno hranjenje od strane kontrolnog dijela ili aplikacije)
app.post('/api/control', function(req, res){
	
	//Slanje arduinu putem mqtt protokola
	client = mqtt.connect('mqtt://test.mosquitto.org');// Free Broker
	client.subscribe('aquafeed-arduino-'+req.body.key);// Kao i log i vremena, svaki arduino ima zasebnu komunikaciju putem id-a (subscribe sobu)
	client.publish('aquafeed-arduino-'+req.body.key, 'feed-now'); // Slanje poruke
	client.end();
	res.end();
	
});

/** API za Desktop **/

//Test konekcije
app.post('/api/app-test', function(req, res){

	res.send("up&running");
	res.end();
	
});

//Login
app.post('/api/app-login', testAppLogin, getAppTimes, function(req, res){

	//JSON sa podacima
	var sendData = {
		"_token" : app_token,
		"userId" : res.locals.userID,
		"times" : res.locals.datas
	};
	
	res.send(sendData);
	res.end();
	
});

//Update vremena
app.post('/api/app-timeUpdate', tokenTest, updateTimes);

//Trenutno hranjenje sa desktop app-a
app.post('/api/app-feedNow', tokenTest, function (req,res){

	//Slanje arduinu putem mqtt protokola
	client = mqtt.connect('mqtt://test.mosquitto.org');// Free Broker
	client.subscribe('aquafeed-arduino-'+req.body.userId);// Kao i log i vremena, svaki arduino ima zasebnu komunikaciju putem id-a (subscribe sobu)
	client.publish('aquafeed-arduino-'+req.body.userId, 'feed-now'); // Slanje poruke
	client.end();
	
	pool.getConnection(function(err, connection) { 
		if(err){
			console.log("Database Connection error");
			res.send('db-error');	
			res.end();
			return;
		}
		else {
			//Update log-a
			connection.query('INSERT INTO `log_'+req.body.userId+'` (time, event) VALUES ("'+req.body.logTime+'", "Trenutno hranjenje (Desktop App)")', function (error, results, fields) {
				if (error) {
					res.send('db-error');	
					res.end();
					return;
				}
				connection.release();

				res.send('done');
				res.end();

			});
		}	
	});	

});

function tokenTest(req, res, next){

	if(req.body._token == app_token){
		
		next();
		
	}else{
	
		res.send('token-error');
		res.end();
		
	} 
	
}

function updateTimes(req, res){
	
		pool.getConnection(function(err, connection) {
			if(err){
				console.log("Database Connection error");
				res.send('db-error');	
				res.end();
				return;
			}
			else{
				//Pražnjenje tablice
				connection.query('TRUNCATE TABLE `times_'+req.body.userId+'`', function (error, results, fields) { //Brisanje svih zapisa 
					if (error) {
						res.send('db-error');	
						res.end();
						return;
					}
					connection.release();
					
					for ( i = 0; i < req.body.timeData.length; i++ ){ 
						
						pool.getConnection(function(i, err, connection) { //getConnection-> asinkrona funkcija
							if(err){
								console.log("Database Connection error");
								res.send('db-error');	
								res.end();
								return;
							}
							//Unos novih vremena
							connection.query('INSERT INTO `times_'+req.body.userId+'` (times, flags, ardReturn) VALUES ("'+req.body.timeData[i]+'", "0", "0")', function (error, results, fields) {
								if (error) {
									res.send('db-error');	
									res.end();
									return;
								}
								connection.release();
							});	
						}.bind(pool, i)); //"Trik" za asinkrono rješavanje ("povezan" i sa pool-om), async nije bio potreban :-)
					}
					
					pool.getConnection(function(err, connection) { 
						//Update log-a
						connection.query('INSERT INTO `log_'+req.body.userId+'` (time, event) VALUES ("'+req.body.logTime+'", "Promjena vremena u tablici (Desktop App)")', function (error, results, fields) {
							if (error) {
								res.send('db-error');	
								res.end();
								return;
							}
							connection.release();
							
							res.send('update-done');
							res.end();
							
						});	
					});			
					
				});	
			}	
		});
}

function testAppLogin(req, res, next){

	pool.getConnection(function(err, connection) {
		if(err){
			console.log("Database Connection error");
			res.send("login-error");
			res.end();
			return;
		}
		else{
			//Dohvaćanje user-a (koristi mysql.escape() interno)
			connection.query('SELECT * FROM `Users` WHERE (username= ? OR email= ?) AND passwd= ? LIMIT 1', [req.body.user,req.body.user,req.body.pass], function (error, results, fields) {
				if (error) {
					res.send("login-error");	
					res.end();
					return;
				}
				connection.release(); //Vraćanje konekcije u pool
				
				//results -> rezultat query-a
				if( results.length == 1 ){ //Korisnik postoji
				
					res.locals.userID = results[0].userID; //ID korisnika
					next();

				}
				else { //Korisnik ne postoji
					
					pool.getConnection(function(err, connection) {
						//Testiranje imena/adrese
						connection.query('SELECT * FROM `Users` WHERE username= ? OR email= ? LIMIT 1',[req.body.user,req.body.user], function (error, rows, fields) {
								if (error) {
									res.send("login-error");	
									res.end();
									return;
								}
								connection.release(); 
								
								if( rows.length != 1 ){
								
									//Nepostojeće ime/adresa (korisnik)
									res.send("wrong-username");
									res.end();
									
								} else {
								
									//Neodgovarajuća lozinka
									res.send("wrong-password");
									res.end();
									
								}
						});
					});	
					
				}
				
			});
		}	
	});	

}

function getAppTimes(req, res, next){
	
	pool.getConnection(function(err, connection) {
		if(err){
			console.log("Database Connection error");
			res.send("login-error");	
			res.end();
			return;
		}
		else{
			//Dohvaćanje tablice s vremenima
			connection.query('SELECT * FROM `times_'+res.locals.userID+'` ORDER BY times',  function (error, rows, fields) { 
				if (error) {
					res.send("login-error");	
					res.end();
					return;
				}
				connection.release();
						
				var datas = []; 
						
				//Podaci
				for ( i = 0; i < rows.length; i++ ){
					datas[i] = rows[i].times;
				}
				
				res.locals.datas = datas;		
				next();
				
			});
		}	
	});	

}

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
		if(err){
			console.log("Database Connection error");
			return;
		}
		else {
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
					logTime = moment.tz(users[i].timeZone).format('DD/MM/YYYY HH:mm'); //Logtime
					
					//Poziv glavne funkcije sa svim potrebnim argumentima
					work(id,now,today,logTime);

				}
			});
		}	
	});
	
}
il.add(loop,[]).setInterval(30000).run(); //Iteracija petlje je svakih 30 sekundi, zbog flag-a se nece izvršiti isto hranjenje više puta
il.onError(function(error){
    console.log(error); //Primanje grešaka
});

//Listener za povratnu informaciju od Arduina
listener = mqtt.connect('mqtt://test.mosquitto.org');  
listener.subscribe('aquafeed-arduino-listener'); 
listener.on('message', function (topic, message) {
	console.log(message.toString());
	var por = message.toString().split("-");
	ArdRecv(por[0],por[1]);
});

//Funkcija za obradu signala od arduina
function ArdRecv(userId,time){
	
	//Postavljanje flag-a 
	pool.getConnection(function(err, connection) {
		if(err){
			console.log("Database Connection error");
			return;
		}
		else {
			//Update flag-a
			connection.query('UPDATE `times_'+userId+'` SET ardReturn="1" WHERE times="'+time+'" LIMIT 1', function (error) {
				if (error) {
					return;
				}
			});	
			connection.release(); 
			
			//Slanje zahtjeva za Realtime Timeline
			http_request.post("http://aqua-testfeed.rhcloud.com/api/worker", {form: {key: userId}, headers: headers}, function(err){
				if (err) {
					return;
				}
			}); 
		}
	});
	
}

//Funckija koja se iteracijski poziva
function work(id,now,today,logTime){

	pool.getConnection(function(err, connection) {
		if(err){
			console.log("Database Connection error");
			return;
		}
		else {
			//Dohvaćanje vremena za svakog user-a
			connection.query('SELECT * FROM `times_'+id+'` WHERE flags="0"',  function (error, results, fields) { //Selektiraj vremena koja nisu izvedena
				if (error) {
					console.error('error querry: ' + error.stack);
					return;
				}
				connection.release(); 
		
				//Korisnikova vremena vremena
				timesLength = results.length; //Broj vremena
				times = results; //Vremena

				//Loop za sva korisnikova vremena
				for ( j = 0; j < timesLength; j++ ){

					if ( times[j].times === now ){ //Vrijeme iz tablice == trenutno
					
						//Slanje arduinu putem mqtt protokola
						sender = mqtt.connect('mqtt://test.mosquitto.org');  //Free Broker
						sender.subscribe('aquafeed-arduino-'+id); //Kao i log i vremena, svaki arduino ima zasebnu komunikaciju putem id-a (subscribe sobu)
						sender.publish('aquafeed-arduino-'+id, 'feed-'+now); //Slanje poruke
						sender.end();
						
						//Postavljanje flag-a da je izvršeno
						pool.getConnection(function(j, err, connection) {
							connection.query('UPDATE `times_'+id+'` SET flags="1" WHERE times="'+now+'" LIMIT 1', function (error) {
								if (error) {
									return;
								}
							});	
							connection.release(); 				
						}.bind(pool, j));
					
						//Update log-a
						pool.getConnection(function(j, err, connection) {
							connection.query('INSERT INTO `log_'+id+'` (time, event) VALUES ("'+logTime+'", "Poslan zahtjev")', function (error) {
								if (error) {
									return;
								}
							});	
							connection.release(); 
						}.bind(pool, j));
						
						//Slanje zahtjeva za Realtime Timeline
						http_request.post("http://aqua-testfeed.rhcloud.com/api/worker", {form: {key: id}, headers: headers}, function(err){
							if (err) {
								return;
							}
						}); 
						
					}
					
				}
		
			});
		}	
	});

	//Resetiranje flagova svih svakih 24-sata
	if (now === "00:00"){

		//Reset flag-a
		pool.getConnection(function(err, connection) {
			if(err){
				console.log("Database Connection error");
				return;
			}
			else {
				connection.query('UPDATE `times_'+id+'` SET flags="0",ardReturn="0"', function (error) { //Svaka columna u tablici flags = 0
					if (error) {
						console.error('error querry: ' + error.stack);
						return;
					}
				});	
				connection.release(); 
			}	
		});		

	}

	//Resetiranje loga svakog ponedjeljka u 1:00 
	if ((now === "01:00")&&(today === "Monday")){

		//Pražnjenje tablice
		pool.getConnection(function(err, connection) {
			if(err){
				console.log("Database Connection error");
				return;
			}
			else {
				connection.query('TRUNCATE TABLE `log_'+id+'`', function (error) { //Brisanje svih zapisa iz log-a
					if (error) {
						console.error('error querry: ' + error.stack);
						return;
					}
				});	
				connection.release(); 
			}	
		});		
	
	}
	
}

//Socket.io
var io = require('socket.io').listen(server);

io.sockets.on("connection", function(socket) {
	OSUtil(socket);
});

function OSUtil(socket){
	
	var data = [];
	
	//Memory count
	var frmem = os.freemem();
	var totmem = os.totalmem();
	
	var usedmem = totmem - frmem;
	
	data[0] = usedmem.toString().split(".")[0]; //Iskorištena memorija
	data[1] = totmem.toString().split(".")[0]; //Slobodna memorija
	
	os.cpuUsage(function(usage){
		data[2] = Math.round(usage*100); // CPU usage(%)
		socket.emit('system_status', data);
		var t = setTimeout(function(){ OSUtil(socket)},500); //Slanje novih vrijednosti svakih 500ms
	});
	
}

