const moment = require('moment-timezone')

async function processResults(event, teamDataArray) {
  // console.log(event)

  let historicResults = {}

  let historicBetResultTemplate = {
    successArray: [],
    successProbability: 0,
    fairOdds: 0,
  }

  // Calculate the probability of this team winning this bet in the future based on a weighted average of historic data
  let weightings = [1.5,1.5,1.5,1,1,0.5,0.5,0.5,0.5,0.5,0.25,0.25,0.25,0.25,0.25,0.125,0.125,0.125,0.125,0.125,0.0625,0.0625,0.0625,0.0625,0.0625]
  let weightingsSum = weightings.reduce((a, b) => a + b, 0)
  // y = 0.1 + 0.9/(cosh(x/3))

  // Get the names of the two teams
  let teamsRegexMatch = event.Teams.match(new RegExp('\\s*([\\S\\s]+)\\s+v\\s+([\\S\\s]+)\\s*'))

  // Loop through each bet
  for (let betName in event.bets) {
    let minCornersEachHalf = parseInt(betName)

    historicResults[betName] = {}
    historicResults[betName].average = JSON.parse(JSON.stringify(historicBetResultTemplate))

    for (let teamName of teamsRegexMatch.slice(1)) {

      historicResults[betName][teamName] = JSON.parse(JSON.stringify(historicBetResultTemplate))

      // Determine if bet winning criteria was satisfied in the previous X matches
      for (let matchIndex in teamDataArray[teamName].matches) {
        let match = teamDataArray[teamName].matches[matchIndex]
        let nCorners1st = match.Corner.half.home + match.Corner.half.away
        let nCorners2nd = match.Corner.match.home + match.Corner.match.away - nCorners1st

        historicResults[betName][teamName].successArray[matchIndex] = (nCorners1st >= minCornersEachHalf && nCorners2nd >= minCornersEachHalf)

        if (historicResults[betName][teamName].successArray[matchIndex]) {
          historicResults[betName][teamName].successProbability += 1.0*weightings[matchIndex]/weightingsSum
        }
      }

      // Calculate fair odds for this probability of success
      historicResults[betName][teamName].fairOdds = 1/historicResults[betName][teamName].successProbability
      historicResults[betName].average.fairOdds += 1.0/(teamsRegexMatch.slice(1).length)*historicResults[betName][teamName].fairOdds

    } // End of loop through teams

    historicResults[betName].average.betStrength = event.bets[betName] / historicResults[betName].average.fairOdds
    historicResults[betName].average.goodBet = historicResults[betName].average.betStrength > 1

  } // End of loop through bets

  // console.log(historicResults)

  saveResults(event, historicResults)

  return
}

async function saveResults(event, historicResults) {

  console.log(`${event.configName}`)

  // Display results to screen
  for (let betName in event.bets) {

    let outputText = ''
    outputText += `${betName}`
    outputText += ` | ${historicResults[betName].average.goodBet ? 1 : 0}`
    outputText += ` | Strength ${historicResults[betName].average.betStrength.toFixed(3)}`
    outputText += ` | fairOdds ${historicResults[betName].average.fairOdds.toFixed(3)}`
    outputText += ` | SkyBet ${event.bets[betName].toFixed(3)}`
    outputText += ` | ${moment(event.time).format('HH:mm')}`
    console.log(outputText)
  }

}

module.exports = {
  uri: `https://m.skybet.com/football/coupon/10011490`,
  processResults: processResults,
  category: 'football',
  configName: 'cornersTakenInEachHalf'
}
