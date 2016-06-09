'use strict';
const express = require('express');
const request = require('request-promise');
const app = express();
app.set('view engine', 'ejs');

const API_BASE_URI = 'https://swapi.co/api/', cache = { people : [], planets : [] }, entityMap = new Map();
let preFetchPeoplePromise, preFetchPlanetsPromise;

app.get('/', function(req, res) {
    res.send('Hello World!');
});

app.get('/character/:name', function(req, res) {
	let name = req.params.name.toLowerCase(), found = [];
	preFetchPeoplePromise.then(function() {
		cache.people.forEach(function(p) {
			if (p.name.toLowerCase().indexOf(name) > -1) {
				found.push(p);
			}
		});
	    res.render('character', { results: found });
	});
});

app.get('/characters', function(req, res) {
    const limitTo = 20, sortBy = req.query.sort, endpoint = 'people';
    preFetchPeoplePromise.then(function() {
    	let arr= cache.people.slice(0, limitTo);
		const formatNumeric = function(str) {
			if (str === 'unknown'){
				return 0;
			}
			return +(str.replace(',',''));	
		};
		if (sortBy) {
		    arr.sort(function(a, b) {
		    	if (sortBy === 'name') {
		    		return a.name.localeCompare(b.name);
		    	}
		    	return formatNumeric(a[sortBy]) - formatNumeric(b[sortBy]);
		    });
		}
	    res.json(arr);
    });
});

app.get('/planetresidents', function(req, res) {
	let planets = {};
	Promise.all([preFetchPeoplePromise, preFetchPlanetsPromise]).then(function() {
		cache.planets.forEach(function(p) {
			planets[p.name] = p.residents.map(r => entityMap.get(r).name);
		});
		res.json(planets);
	});
});

app.listen(2929, function() {
    console.log('Example app listening on port 2929!');
    preFetchPeoplePromise = preFetch(1,'people');
    preFetchPlanetsPromise = preFetch(1, 'planets');
    Promise.all([preFetchPeoplePromise, preFetchPlanetsPromise]).then(function() {
    	console.log('All Done');
    });
});

function preFetch(p, endpoint) {
	console.log('requesting',endpoint,'page', p);
	let options = {
	    uri: API_BASE_URI + endpoint + '/?page=' + (p++),
	    json: true
	};
	return request(options).then(function(res) {
		res.results.forEach(function(elem) {
			entityMap.set(elem.url, elem);
			cache[endpoint].push(elem);
		});
		if (res.next) {
			return preFetch(p, endpoint);
		}
		return Promise.resolve();
	});
}
