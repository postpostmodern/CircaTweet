$(function(){

	// delayer is a timeout that keeps down the number of requests to Twitter
	var delayer;
	// use_dist keeps track of whether or not we are geolocated
	var use_dist = false;

	// Handlebars.js templates
	var resultsTemplate;
	var statusTemplate;
	$.get('/js/templates/results.html', function(template) { 
		resultsTemplate = Handlebars.compile(template);
	});
	$.get('/js/templates/status.html', function(template) { 
		statusTemplate = Handlebars.compile(template);
	});
	
	// Geolocation!
	if (Modernizr.geolocation) {
		var latitude, longitude;
		navigator.geolocation.getCurrentPosition(
			function(position) {
				latitude = position.coords.latitude;
				longitude = position.coords.longitude;
				// Show the distance slider
				$('input[name="dist"]').show();
				use_dist = true;
			}
		);
	}
	
	// Bind events for inputs
	$('input[name="q"]').keyup(delayedSearch);
	$('input[name="dist"]').change(delayedSearch);
	
	// This allows for clickable hashtags
	$('.hashtag').live('click', function() {
		$('input[name="q"]').val($(this).text()).scrollTop(0);
		delayedSearch();
	});
	
	// Updates the status message (see /hs/templates/status.html)
	function updateStatus() {
		$('#status').html($(statusTemplate(status())));
	}
	
	// Delays the API call until typing or sliding stops for 1/2 second
	function delayedSearch() {
		clearTimeout(delayer);
		var q = $('input[name="q"]').val();
		if(q.length > 1) {
			delayer = setTimeout(doSearch, 500);
			$('#spinner').show();
		} else {
			$('#results').empty();
			$('#spinner').hide();
		}
		updateStatus();
		$('#results').empty();
	}
	
	// API call to Twitter
	function doSearch() {
		// Get the input values
		var current_status = status();
		
		// Don't do anything if the search string is short
		if(current_status.q.length < 2) return;
		
		// Set up params to send to Twitter
		var params = {};
		params.lang = 'en';
		params.q = current_status.q;
		if(current_status.dist) params.geocode = [ latitude, longitude, current_status.dist + 'mi' ].join(',');
		
		// JSON request
		$.getJSON(
			'http://search.twitter.com/search.json?callback=?', 
			params, 
			function(data) { 
				data.results = fixCookevilleResults(data.results);
				$('#spinner').hide();
				// Add this to the data so the templates can use it:
				data.use_dist = use_dist;
				// Render Handlebars.js template and insert
				$('#results').html($(resultsTemplate(data))); 
			}
		);
	}
	
	// Gets values from inputs and returns an object
	function status() {
		var dist = inputVal('dist');
		var dist = (use_dist && parseFloat(dist) < 500) ? dist : false;
		return {
			dist: dist, 
			q: inputVal('q'),
		}
	}
	
	// This rejects results for Candyland, which Twitter thinks is Cookeville, TN.
	function fixCookevilleResults(results) {
		return _.reject(results, function(result) { return result.location == undefined ? false : result.location.match(/[kc]and(y|ee|i)land/i); });
	}
	
	// For representing the distance as a string (if over 500mi, infinity)
	function distanceString(dist) {
		return parseFloat(dist) > 500 ? '∞' : dist;
	}
	
	// A utility method for fetching input values
	function inputVal(name) {
		return $('input[name="'+name+'"]').val();
	}
	
	// Wraps hashtags so we can make them clickable
	function autoHashtags(str) {
		return str.replace(/[#]+[A-Za-z0-9-_]+/g, function(tag) {
			return '<span class="hashtag">' + tag + '</span>';
		});
	}
	
	// Auto-links @usernames to profiles
	function autoUsernames(str) {
		return str.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
			var username = u.replace("@","")
			return u.link("http://twitter.com/"+username);
		});
	}
	
	// Auto-links URLs
	function autoLinks(str) {
		return str.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
			return url.link(url);
		});
	}
	
	// Begin Handlebars Helpers -----------------------------------

	Handlebars.registerHelper('distanceString', distanceString);

	Handlebars.registerHelper('parseTweet', function(tweet) {
		return new Handlebars.SafeString(autoUsernames(autoHashtags(autoLinks(Handlebars.Utils.escapeExpression(tweet)))));
	});
	
	Handlebars.registerHelper('relDate', function(d) {
		return new Date(d).toRelativeTime(1000);
	});
	
});
