const moment = require('moment-timezone')
const columnify = require('columnify')
const colors = require('colors')

const dataProcFunctions = require('../../../general/dataProcFunctions.js');
const footballGeneralFunctions = require('./footballGeneralFunctions.js');

async function processResults(event, teamDataObj) {
  // console.log(event)

  let historicResults = {}

  let historicBetResultTemplate = {
    successArray: [],
    successProbability: 0,
    fairOdds: 0,
  }

  // Calculate the probability of this team winning this bet in the future based on a weighted average of historic data
  let weightings = dataProcFunctions.weightingFunc1()

  // Get the names of the two teams
  let teamsRegexMatch = event.Teams.match(new RegExp('\\s*([\\S\\s]+)\\s+v\\s+([\\S\\s]+)\\s*'))
  event.teamHome = teamsRegexMatch[1]
  event.teamAway = teamsRegexMatch[2]

  // Loop through each bet
  for (let betName in event.bets) {
    let minCornersEachHalf = parseInt(betName)

    historicResults[betName] = {}
    historicResults[betName].average = JSON.parse(JSON.stringify(historicBetResultTemplate))

    for (let teamName of teamsRegexMatch.slice(1)) {

      historicResults[betName][teamName] = JSON.parse(JSON.stringify(historicBetResultTemplate))

      // Determine if bet winning criteria was satisfied in the previous X matches
      for (let matchIndex in teamDataObj[teamName].matches) {
        matchIndex = parseInt(matchIndex)
        let match = teamDataObj[teamName].matches[matchIndex]
        let nCorners1st = match.Corner.half.home + match.Corner.half.away
        let nCorners2nd = match.Corner.match.home + match.Corner.match.away - nCorners1st

        historicResults[betName][teamName].successArray[matchIndex] = (nCorners1st >= minCornersEachHalf && nCorners2nd >= minCornersEachHalf)
      }

      historicResults[betName][teamName].successProbability = await dataProcFunctions.getWeightedAverage(historicResults[betName][teamName].successArray, weightings)

      // Calculate fair odds for this probability of success
      historicResults[betName][teamName].fairOdds = 1/historicResults[betName][teamName].successProbability
      historicResults[betName].average.fairOdds += 1.0/(teamsRegexMatch.slice(1).length)*historicResults[betName][teamName].fairOdds

    } // End of loop through teams

    historicResults[betName].average.betStrength = event.bets[betName] / historicResults[betName].average.fairOdds
    historicResults[betName].average.goodBet = historicResults[betName].average.betStrength > 1

  } // End of loop through bets

  event.historicResults = historicResults
  saveResults(event)

  return event
}

async function saveResults(event) {

}

module.exports = {
  uri: `https://m.skybet.com/football/coupon/10011490`,
  processResults: processResults,
  displayResults: footballGeneralFunctions.displayResults,
  category: 'football',
  configName: 'cornersTakenInEachHalf'
}
