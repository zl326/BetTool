const moment = require('moment-timezone')
const columnify = require('columnify')
const colors = require('colors')

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
        matchIndex = parseInt(matchIndex)
        let match = teamDataArray[teamName].matches[matchIndex]
        let nCorners1st = match.Corner.half.home + match.Corner.half.away
        let nCorners2nd = match.Corner.match.home + match.Corner.match.away - nCorners1st

        historicResults[betName][teamName].successArray[matchIndex] = (nCorners1st >= minCornersEachHalf && nCorners2nd >= minCornersEachHalf)

        if (historicResults[betName][teamName].successArray[matchIndex]) {
          historicResults[betName][teamName].successProbability += 1.0*weightings[matchIndex]/weightingsSum
        }

        // Deal with if there are fewer matches than number of weightings
        if (matchIndex == teamDataArray[teamName].matches.length-1 && matchIndex < weightings.length-1) {
          // Calculate a normalising constant for correcting the current probability value
          let weightingsSubset = weightings.slice(0,matchIndex+1)
          let normalisation = weightings.slice(0,matchIndex+1).reduce((a, b) => a + b, 0) / weightingsSum
          historicResults[betName][teamName].successProbability /= normalisation
        }
      }

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

async function displayResults(processedEventsArray) {
  // Continue only if there is at least one bet to look at
  if (processedEventsArray.length <= 0) return

  // Sort chronologically
  processedEventsArray = processedEventsArray.sort( (a,b) => {return moment(a.time).isBefore(moment(b.time)) ? -1 : 1} )

  // Produce the columns for use with columnify
  for (let betName in processedEventsArray[0].bets) {
    let columnifyDataGood = []
    let columnifyDataBad = []

    for (let event of processedEventsArray) {
      let columnifyData = {
        goodBet: event.historicResults[betName].average.goodBet,
        strength: event.historicResults[betName].average.betStrength,
        fairOdds: event.historicResults[betName].average.fairOdds,
        SkyBet: event.bets[betName],
        teams: event.Teams,
        time: moment(event.time).format('HH:mm DD/MM'),
      }

      columnifyData.goodBet ? columnifyDataGood.push(columnifyData) : columnifyDataBad.push(columnifyData)
    }

    let columnifyOptions = {
      columnSplitter: ' | ',
      headingTransform: function(heading) {
        return heading.inverse
      },
      config: {
        goodBet: {
          dataTransform: (data) => {return data == 'true' ? data.green.inverse : data.red},
          align: 'right',
        },
        strength: {
          dataTransform: (data) => {
            let decPlaces = 3
            if (parseFloat(data) > 1.1) return parseFloat(data).toFixed(decPlaces).green.bold
            else if (parseFloat(data) >= 1.0) return parseFloat(data).toFixed(decPlaces)
            else return parseFloat(data).toFixed(decPlaces).gray
          },
          align: 'right',
        },
        fairOdds: {
          dataTransform: (data) => {return parseFloat(data).toFixed(3)},
          align: 'right',
        },
        SkyBet: {
          dataTransform: (data) => {return parseFloat(data).toFixed(2)},
          align: 'right',
        },
      }
    }

    console.log(`${processedEventsArray[0].configName} ${betName}`.yellow.inverse)
    console.log(columnify(columnifyDataBad.concat(columnifyDataGood), columnifyOptions))
    console.log(``)

  }


}

async function saveResults(event) {

}

module.exports = {
  uri: `https://m.skybet.com/football/coupon/10011490`,
  processResults: processResults,
  displayResults: displayResults,
  category: 'football',
  configName: 'cornersTakenInEachHalf'
}
