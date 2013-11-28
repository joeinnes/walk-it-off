var map;
var service;
var shortdesc;
var singleportion;
var cals;
var directionsDisplay;
var directionsService;
var usercals;
var infowindow = new google.maps.InfoWindow({
		content: "holding...",
		maxWidth: "200px;"
});

function formSubmit(valuea, valueb) {
        localStorage.setItem(valuea, document.getElementById(valueb).value);
}

function settingsSave(valuea, valueb) {
        localStorage.setItem(valuea, document.getElementById(valuea).value);
        localStorage.setItem(valueb, document.getElementById(valueb).value);
}

function buildForm(form) {
  $('#foodid').selectmenu();
  $('#foodid').empty();
  $("#foodid").selectmenu("refresh");

  query = document.getElementById('userquery').value;
  
  if(query) {
    $.ajax({
     url: "http://www.joesbigtoe.co.uk/api/food_description/search/" + query,
     dataType: "json",
     async: false,
     success: function (results) {
               var jsonresults = results; //JSON.parse(results);
               for (var i in jsonresults) {
                 $("#foodid").append(new Option(jsonresults[i].Long_Desc.replace(/~/gi,""), jsonresults[i].NDB_No));
               }
               
             }
           });
  }
  else {
    navigator.notification.confirm("No input.", void(0), "Error", "OK");
  }
  // $("#foodList").select2({maximumSelectionSize: 1, placeholder: "Choose an option",});
    $("#foodid").selectmenu("refresh");
}


function BlockElasticScroll(event) {
                event.preventDefault();
}

function initialise() {
    if (localStorage.getItem("foodid")) {
    foodid = localStorage.getItem("foodid");
    nutinf = $.ajax({
			async   : false,
			url: "http://www.joesbigtoe.co.uk/api/abbreviated/" + foodid,
			dataType: 'json',
			success: function(results){
				shortdesc = results.Shrt_Desc.replace(/~/gi,"");
				singleportion = results.GmWt_1;
				cals = results.Energ_Kcal;
			}
			}); // MAKE API CALL, GRAB INFO, PUT IN GLOBAL VARIABLES

		//if (localStorage.getItem("portions")) {
		//	userportion = localStorage.getItem("portion") * singleportion;
		//}
		//else {
			userportion = singleportion;
		//}
		usercals = ((cals/100) * userportion);
	} else {
        navigator.notification.confirm("No data found.", void(0), "Error", "OK");
	}

	if (localStorage.getItem("disttoday")) {
		distancewalked = localStorage.getItem("disttoday")*1000;
	}
	else {
		distancewalked = 0;
	}
    radius = calcRadius(usercals) - distancewalked;
    if (radius < 1000) {
        radius = 1000;
    }
    searchradius = radius * 2;
    query = localStorage.getItem("userquery");
    var found;
    
	if (navigator.geolocation) {
    	navigator.geolocation.getCurrentPosition(start); // Fire the current position into the "start" function
    }
    else {
	    navigator.notification.confirm("Geolocation is not supported on this device. Sorry about that.", void(0), "Error", "OK"); // Apologise for lack of support.
	    // TODO: Add a manual address entry field here.
	}
}

function sizeContent() {
   $('#map-canvas').height( ($(window).height() - $('#map .ui-footer').outerHeight(false)) + 2 + "px" );
   $('#map-canvas').width( $(window).outerWidth() + "px" );
    // $('#directions').height( 0.95 * (($(window).height() - 55)) + "px" ); // Set directions modal to 90% of window height
    // google.maps.event.trigger(map, 'resize');
}

function supports_html5_storage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

function calcRoute(dest) {
	$('#directionsModal').modal('show');
	$('#directions').attr('src', 'https://maps.google.com/maps?ie=UTF8&hl=en&msa=0&dirflg=w&saddr='+userloc+'&daddr='+dest+'&dg=opt&output=embed&source=embed');	
}

function validateNumberSize(inputtxt, min, max) {
	var numbers = /^[0-9]+$/;
	if(inputtxt.match(numbers)) {
		if(inputtxt.length >= min && inputtxt.length <= max) {
			return true;
		}
	}
	return false;
}

function createMarker(place, icon) {
	var placeLoc = place.geometry.location;
	var marker = new google.maps.Marker({
		map: map,
		icon: icon,
		position: place.geometry.location
	});
	var request =  {
		reference: place.reference
	};
    
	google.maps.event.addListener(marker,'click',function(){
		service.getDetails(request, function(place, status) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {
				var contentStr = '<div class="infowindow"><h3>'+place.name+'</strong></h3><p><address>'+place.formatted_address+'</address>';
				if (!!place.icon) contentStr += '<img src="'+place.icon+'" style="width: 50px;">';
				if (!!place.formatted_phone_number) contentStr += '<a href="tel:'+place.international_phone_number+'">'+place.formatted_phone_number+'</a>';
				if (!!place.website) contentStr += '<br><a target="_system" rel="external" href="'+place.website+'">'+place.website+'</a>';
				if (!!place.rating) contentStr += '<br>Rating: '+place.rating+'/5';
				contentStr += '<br><a href="#directionsModal" onclick="calcRoute(\''+place.formatted_address+'\')">Get directions</a>';
				contentStr += '</div>';
				infowindow.setContent(contentStr);
				infowindow.open(map,marker);
			} else { 
				var contentStr = "<h5>No Result, status="+status+"</h5>";
				infowindow.setContent(contentStr);
				infowindow.open(map,marker);
                infowindow.width( $(window).width() * 0.7 + "px" );
			}
		});
	});
}

function calcDistance(p1, p2){
	return (google.maps.geometry.spherical.computeDistanceBetween(p1, p2));
}

function callback(results, status) {
    var near = 0;
    var med = 0;
	var far = 0;
	if (status == google.maps.places.PlacesServiceStatus.OK) {
		for (var i = 0, result; result = results[i]; i++) {
			var destination = result.geometry.location;
			var distance = calcDistance(destination, userloc);
			if (distance < (0.8 * radius) && close < 15) {
				createMarker(results[i], 'img/grey-restaurant.png');
				near++;
			}
			if (distance > (1.8 * radius) && med < 15) {
				createMarker(results[i], 'img/restaurant-blue.png');
				med++;
			}
			if (distance > (0.8 * radius) && distance < (1.8 * radius) && far < 15){
				createMarker(results[i], 'img/green-restaurant.png');
				far++;
			}
        }
    }
    if (near == 0 && med == 0 && far == 0) {
            navigator.notification.confirm("No results found", void(0), "Error", "OK")
    }
}

function start(position) {
	var latitude = position.coords.latitude;
	var longitude = position.coords.longitude;
	userloc = new google.maps.LatLng(latitude, longitude);
	map = new google.maps.Map(document.getElementById('map-canvas'), {
		zoom: 14,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		panControl: true,
		panControlOptions: {
			position: google.maps.ControlPosition.RIGHT_CENTER
		},
		zoomControl: true,
		zoomControlOptions: {
			style: google.maps.ZoomControlStyle.LARGE,
			position: google.maps.ControlPosition.RIGHT_CENTER
		},

		center: userloc,
	});
	var request = {
		location: userloc,
		radius: searchradius,
		types: ['restaurant'],
		keyword: query,
	}; 
	var marker = new google.maps.Marker({
		map: map,
		icon: 'img/you.png',
		position: userloc
	});
	service = new google.maps.places.PlacesService(map);
	service.radarSearch(request, callback);
	var circleOptions = {
		center: userloc,
		fillOpacity: 0,
		strokeOpacity:0,
		map: map,
		radius: searchradius
	}
	var myCircle = new google.maps.Circle(circleOptions);
	map.fitBounds(myCircle.getBounds());
    $('#map-canvas').height( ($(window).height() - $('#map .ui-footer').outerHeight(false)) + 1 + "px" );
}


$("#map").bind('pageshow', function(){
    initialise();
 }); 
//var interval = setInterval(function(){
//    $.mobile.loading('hide');
//    clearInterval(interval);
// },1);

document.addEventListener("menubutton", onMenuKeyDown, false);

function onMenuKeyDown() {
    // Handle the back button
}

document.addEventListener("searchbutton", onSearchKeyDown, false);

function onSearchKeyDown() {
    // Handle the back button
}

$('div.page:not(#map)').bind("swipeleft", function(){
		var nextpage = $(this).next('div[data-role="page"]');
		// swipe using id of next page if exists
		if (nextpage.length > 0) {
			$.mobile.changePage(nextpage,  {transition: 'slide'});
	}
});
$('div.page:not(#map)').bind("swiperight", function(){
		var prevpage = $(this).prev('div[data-role="page"]');
		// swipe using id of next page if exists
		if (prevpage.length > 0) {
			$.mobile.changePage(prevpage, {transition: 'slide', reverse: 'true'});
		}
});

function calcRadius(usercals) {
if (localStorage.getItem("weightinlbs")) {
        weightinlbs = localStorage.getItem("weightinlbs");
    }
else { weightinlbs = 180; }
if (localStorage.getItem("userspeed")) { 
    userspeed = localStorage.getItem("userspeed"); 
}
 else { userspeed= 3.5; }
    if (userspeed < 3) { calsperm = (12.4 * weightinlbs * 0.027)/1000 };
    if ((userspeed >= 3) && (userspeed < 3.25)) { calsperm = (12.4 * weightinlbs * 0.027)/1000 };
    if ((userspeed >= 3.25) && (userspeed < 3.75 )) { calsperm = (10.7 * weightinlbs * 0.033)/1000 };
    if ((userspeed >= 3.75) && (userspeed < 4.25)) { calsperm = (9.3 * weightinlbs * 0.042)/1000 };
    if (userspeed > 4.25)  { calsperm = (8.3 * weightinlbs * 0.047)/1000 };
radius = usercals/calsperm;
return radius;
}