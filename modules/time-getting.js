/*
* Funkcije dohvaćanja vremena
*/

module.exports = { 

	//Trenutno vrijeme za beskonačnu petlju
    getNow : function() { 
	
		var time;
		//var d = new Date();
		var d = new Date( new Date().getTime() + 1 * 3600 * 1000); //UTC + 2,Europe
		var hh = d.getHours().toString();
		var mn = d.getMinutes().toString();	
		if(hh<10) {
			hh='0'+hh;
		} 
		if(mn<10) {
			mn='0'+mn;
		} 
		time = hh +":"+ mn;
		
		return time;
		
	},
	
	//Datum za log
    getLogDate : function() { 
	
		//var n = new Date();
		var n = new Date( new Date().getTime() + 1 * 3600 * 1000); //UTC + 2,Europe
		var year = n.getFullYear();
		var month = n.getMonth()+1; 
		var day = n.getDate();
		var hour = n.getHours();
		var minute = n.getMinutes();
		
		if(month.toString().length == 1) {
			var month = '0'+month;
		}
		if(day.toString().length == 1) {
			var day = '0'+day;
		}   
		if(hour.toString().length == 1) {
			var hour = '0'+hour;
		}
		if(minute.toString().length == 1) {
			var minute = '0'+minute;
		}
		   
		var dateTime = day+'/'+month+'/'+year+' '+hour+':'+minute;   
		
		return dateTime;

	}
};