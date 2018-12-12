
// const os = require('os')
// const fs = require('fs')
// const rp = require('request-promise-native')
// const cheerio = require('cheerio')
// const moment = require('moment-timezone')
// const readlineSync = require('readline-sync')
// const jsonfile = require('jsonfile')
// const unique = require('array-unique');

const getSkyBets = require('./getSkyBets.js');


async function getBets(betConfigs) {
  // Get the bets for each config
  let betsList = {}
  let betsPromiseArray = []
  let categories = []

  for (let betConfig of betConfigs) {
    if (!betsList.hasOwnProperty(betConfig.category)) betsList[betConfig.category] = []
    if (categories.indexOf(betConfig.category) == -1) categories.push(betConfig.category)

    if (betConfig.category == 'football') betsPromiseArray.push(getSkyBets.getBetsCoupons(betConfig.uri))
  }

  let betsArray = await Promise.all(betsPromiseArray)
  // Bets are sorted into the category they belong to
  for (let betConfigIndex in Object.keys(betConfigs)) {
    let betConfig = betConfigs[Object.keys(betConfigs)[betConfigIndex]]
    betsList[betConfig.category].push(betsArray[betConfigIndex])
  }

  let bets = {
    betsList: betsList,
    categories: categories,
  }

  return bets
}

async function getBetConfigs(commander, process) {
  // Get bet configs
  let betConfigs = []
  console.log('\nOptions:')
  if (commander.all || commander.cornersTakenInEachHalf || process.argv.length <= 2) { // default if no arguments applied
    console.log('Chosen - Corners Taken in Each Half')
    betConfigs.push(require('./betConfigs/football/cornersTakenInEachHalf.js'))
  }
  if (commander.all || commander.totalOverBookingPoints) {
    console.log('Chosen - Total Over Booking Points')
    betConfigs.push(require('./betConfigs/football/totalOverBookingPoints.js'))
  }
  if (commander.all || commander.premierLeague) {
    console.log('Chosen - Premier League')
    betConfigs.push(require('./betConfigs/football/premierLeague.js'))
  }
  if (commander.dummy) {
    console.log('Chosen - Dummy')
    betConfigs.push(require('./betConfigs/football/dummy.js'))
  }

  return betConfigs
}



module.exports = {
  getBets: getBets,
  getBetConfigs: getBetConfigs,
}
