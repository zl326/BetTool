const moment = require('moment-timezone')
const columnify = require('columnify')
const colors = require('colors')

const dataProcFunctions = require('../../../general/dataProcFunctions.js');

function sortByTime(a,b) {return moment(a.time).isBefore(moment(b.time)) ? -1 : 1}

function sortColumnifyData(a,b) {
  // Sort by time primarily, and then by strength
  if (moment(a.time, 'HH:mm DD/MM').isBefore(moment(b.time, 'HH:mm DD/MM'))) return -1
  else if (moment(a.time, 'HH:mm DD/MM').isAfter(moment(b.time, 'HH:mm DD/MM'))) return 1
  else if (a.strength > b.strength) return -1
  else return 1
}

async function displayResults(processedEventsArray) {
  // Continue only if there is at least one bet to look at
  if (processedEventsArray.length <= 0) return

  // Sort chronologically
  processedEventsArray = processedEventsArray.sort(sortByTime)

  // Produce the columns for use with columnify
  for (let betName of Object.keys(processedEventsArray[0].bets).reverse()) {
    let columnifyDataGood = []
    let columnifyDataBad = []

    for (let event of processedEventsArray) {
      let columnifyData = {
        goodBet: event.historicResults[betName].average.goodBet,
        strength: event.historicResults[betName].average.betStrength,
        fairOdds: event.historicResults[betName].average.fairOdds,
        SkyBet: event.bets[betName],
        // teams: event.Teams,
        home: event.teamHome,
        away: event.teamAway,
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
        home: {
          maxWidth: 25,
          truncate: true,
          align: 'right',
        },
        away: {
          maxWidth: 25,
          truncate: true,
          align: 'left',
        },
      }
    }

    // Sort by bet strength, then time
    // i.e. overall it is still sorted by time, matches at the same time are sorted by strength
    columnifyDataBad = columnifyDataBad.sort(sortColumnifyData)
    columnifyDataGood = columnifyDataGood.sort(sortColumnifyData)

    console.log(`${processedEventsArray[0].configName} ${betName}`.yellow.inverse + ` - ${columnifyDataGood.length}/${columnifyDataGood.length+columnifyDataBad.length} Good`)
    console.log(columnify(columnifyDataBad.concat(columnifyDataGood), columnifyOptions))
    console.log(``)

  }
}

module.exports = {
  displayResults: displayResults,
}
