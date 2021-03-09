const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const Twit = require('twit');
const config = require('./config')
const firebaseConfig = require('./firebaseConfig')
const firebase = require('firebase')

const express = require('express')
const PORT = process.env.PORT || 5000

let app = express()
app.listen(PORT, () => console.log(`Listening on ${ PORT }`))

const publichealthURL = 'http://publichealth.lacounty.gov/acd/ncorona2019/vaccine/hcwsignup/';

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
function writeUserData(userId, address, appointment) {
	firebase.database().ref('locations/' + userId).set({
	  address: address,
	  appointment: appointment
	})
}
var database = firebase.database();

function tweeted(err, data, response) {
	console.log(data)
}
async function scrapeAndPost() {
	console.log('START')
	puppeteer
		.launch({ headless: true, args:['--no-sandbox'] })
		.then(async browser => {
			let page = await browser.newPage()
			page.setDefaultNavigationTimeout(0)
			return page
		})
		.then(page => {
			return page.goto(publichealthURL).then(function() {
				return page.content();
			});
		})
		.then(html => {
			let $ = cheerio.load(html);
			try {
				$('.ds-8').each(async function() {
					let url
					let name
					let tempAddress 
					let address = null
					let appointment
					let link = $(this).find('.card-body')
					let finalLink = $(link).find('div > ul > li > a')
					if (finalLink.length > 0)
						url = finalLink[0].attribs.href
					if ($(this).text().includes('Moderna')) {
						name = $(this).text().split('Moderna')[0]
						tempAddress = $(this).text().split('Moderna')[1]
						tempAddress ? address = tempAddress.split(/ \d{5}/)[0] + tempAddress.match(/ \d{5}/) : null
						tempAddress ? appointment = tempAddress.split(/ \d{5}/)[1] : ''
					}
						
					if ($(this).text().includes('Pfizer')) {
						name = $(this).text().split('Pfizer')[0]
						tempAddress = $(this).text().split('Pfizer')[1]
						tempAddress ? address = tempAddress.split(/ \d{5}/)[0] + tempAddress.match(/ \d{5}/) : null
						tempAddress ? appointment = tempAddress.split(/ \d{5}/)[1] : ''
					}
					if (!name || !address || !appointment)
						return 
					name = name.replace(/[\$]/g, '').replace(/[\.]/g, '').replace(/[\#]/g, '').replace(/[\[\]]/g, '')
					
					let k = await database.ref().child('locations/' + name).get()
					if (!k.val()) {
						writeUserData(name, address, appointment)
						return
					}
					if (k.val() && k.val().appointment !== appointment && appointment !== undefined && url) {
						let tweet = {
							status: 'Appointment availability change at ' + address + ' Availablility: ' + appointment + (url ? ' Click here: ' + url : '')
						}
						var T = new Twit(config)
						console.log('TWEET SENT: ' + tweet.status)
						T.post('statuses/update', tweet, tweeted)
						writeUserData(name, address, appointment)
					}
					url = null 
					name = null
					tempAddress = null 
					address = null
					appointment = null
					link = null
					finalLink = null
					$ = null
				});
			} catch (error) {
				console.log(error)
			}
			finally {
					console.log('STOP');
					const used = process.memoryUsage().heapUsed / 1024 / 1024; 
					console.log(`The script uses approximately ${used} MB`);
			}
			app.get('/', function (req, res) {
				res.send('BOT ACTIVE')
				res.end()
			  })
		})
		.catch(console.error);
}
scrapeAndPost()

