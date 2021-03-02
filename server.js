const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const Twit = require('twit');
const config = require('./config')
const firebase = require('firebase')

console.log(config)

const url = 'http://publichealth.lacounty.gov/acd/ncorona2019/vaccine/hcwsignup/';
const bearer = 'AAAAAAAAAAAAAAAAAAAAAOewNAEAAAAA9GMOdM61RnnbrX9ZJb1BlZICy6A%3Dzjy0a9BOBWgzgCeEaIPjMW4OpmN5fdO5sknlnJzpC2mpOL667s'
var firebaseConfig = {
    apiKey: "AIzaSyDnSlmhfPtMkAPkC5b_8OVxGB1EvwLwJBw",
    authDomain: "vaxdb-ac3f3.firebaseapp.com",
    projectId: "vaxdb-ac3f3",
    storageBucket: "vaxdb-ac3f3.appspot.com",
    messagingSenderId: "169100254110",
    appId: "1:169100254110:web:7271ba3d3ce888b9c5548f",
    measurementId: "G-BZVP2H4XHM"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  function writeUserData(userId, address, appointment) {
	firebase.database().ref('locations/' + userId).set({
	  address: address,
	  appointment: appointment
	})
  }
  var database = firebase.database();


  
var T = new Twit(config)


function tweeted(err, data, response) {
	console.log(data)
}

function scrapeAndPost() {
	console.log('START')
	puppeteer
		.launch()
		.then(async browser => {
			let page = await browser.newPage()
			page.setDefaultNavigationTimeout(0)
			return page
		})
		.then(page => {
			return page.goto(url).then(function() {
			return page.content();
			});
		})
		.then(html => {
			const $ = cheerio.load(html);
			const newsHeadlines = [];
			$('.ds-8').each(async function() {
				let name
				let tempAddress 
				let address = null
				let appointment
				if ($(this).text().includes('Moderna')) {
					name = $(this).text().split('Moderna')[0]
					tempAddress = $(this).text().split('Moderna')[1].split('Show on map')[1]
					tempAddress ? address = tempAddress.split(/ \d{5}/)[0] + tempAddress.match(/ \d{5}/) : null
					tempAddress ? appointment = tempAddress.split(/ \d{5}/)[1] : ''
				}
					
				if ($(this).text().includes('Pfizer')) {
					name = $(this).text().split('Pfizer')[0]
					tempAddress = $(this).text().split('Pfizer')[1].split('Show on map')[1]
					tempAddress ? address = tempAddress.split(/ \d{5}/)[0] + tempAddress.match(/ \d{5}/) : null
					tempAddress ? appointment = tempAddress.split(/ \d{5}/)[1] : ''
				}
				name = name.replaceAll('.', '').replaceAll('#', '').replaceAll('$', '').replaceAll('[', '').replaceAll(']', '')
				let k = await database.ref().child('locations/' + name).get()
				//console.log(k.val().appointment + ' AND ' + appointment)
				if (k.val().appointment !== appointment && appointment !== '') {
					let tweet = {
						status: 'Appointment availability change at ' + name + ' ' + appointment + ' https://tinyurl.com/phkb2e7n'
					}
					console.log('TWEET SENT: ' + tweet.text)
					T.post('statuses/update', tweet, tweeted)
					writeUserData(name, address, appointment)
				}
			/*	
			newsHeadlines.push({
				name: name,
				address: address,
				appointment: appointment
			});
			*/
		});
		setTimeout(() => {
			scrapeAndPost()
			}, 30000);
			console.log('STOP');
		})
		.catch(console.error);
	}
scrapeAndPost()

