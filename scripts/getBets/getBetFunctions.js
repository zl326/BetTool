
const getSkyBets = require('./getSkyBets.js');

async function getBets(betConfigs, programOptions) {
  // Get the bets for each config
  let betsList = {}
  let betsPromiseArray = []
  let categories = []

  for (let betConfigName in betConfigs) {
    let betConfig = betConfigs[betConfigName]
    if (!betsList.hasOwnProperty(betConfig.category)) betsList[betConfig.category] = {}
    if (categories.indexOf(betConfig.category) == -1) categories.push(betConfig.category)

    if (betConfig.category == 'football') betsPromiseArray.push(getSkyBets.getBetsCoupons(betConfig.uri, betConfig.configName, programOptions))
  }

  let betsArray = await Promise.all(betsPromiseArray)
  // Bets are sorted into the category and config they belong to
  for (let betConfigIndex in Object.keys(betConfigs)) {
    let betConfig = betConfigs[Object.keys(betConfigs)[betConfigIndex]]

    betsList[betConfig.category][betConfig.configName] = betsArray[betConfigIndex]
  }

  let bets = {
    betsList: betsList,
    categories: categories,
  }

  return bets
}

async function getBetConfigs(commander) {
  // Get bet configs
  let betConfigsArray = []
  console.log('\nBet Options Chosen:')
  if (commander.all || commander.cornersTakenInEachHalf || commander.football) {
    console.log('Corners Taken in Each Half')
    betConfigsArray.push(require('./betConfigs/football/cornersTakenInEachHalf.js'))
  }
  if (commander.all || commander.totalOverBookingPoints || commander.football) {
    console.log('Total Over Booking Points')
    betConfigsArray.push(require('./betConfigs/football/totalOverBookingPoints.js'))
  }
  if (commander.all || commander.totalOverCornersTaken || commander.football) {
    console.log('Total Over Corners Taken')
    betConfigsArray.push(require('./betConfigs/football/totalOverCornersTaken.js'))
  }
  if (commander.dummy) {
    console.log('Dummy')
    betConfigsArray.push(require('./betConfigs/football/dummy.js'))
  }

  let retrievedBetConfigsArray = await Promise.all(betConfigsArray)

  // Convert to an object
  let betConfigs = {}
  for (let betConfig of betConfigsArray) betConfigs[betConfig.configName] = betConfig

  return betConfigs
}

module.exports = {
  getBets: getBets,
  getBetConfigs: getBetConfigs,
}
