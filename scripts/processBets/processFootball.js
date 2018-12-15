
const os = require('os')
const fs = require('fs')
const rp = require('request-promise-native')
const cheerio = require('cheerio')
const moment = require('moment-timezone')
const readlineSync = require('readline-sync')
const jsonfile = require('jsonfile')
const unique = require('array-unique');
const columnify = require('columnify')
const colors = require('colors')

const miscFunctions = require('../general/miscFunctions.js');

async function processFootball(betConfigs, bets, programOptions) {
  Promise.all([collateFootballTeamsAllCoupons(bets.betsList.football),
                getMappingSkyTotalCorner()])
  .then( async function([teamList, map]) {

    map = await checkMappingSkyTotalCorner(map, teamList)
    console.log('')

    let teamDataObj = await getTotalCornerDataAllTeams(teamList, map, programOptions)
    console.log('')

    let collatedProcessedEventsArray = await evaluateData(teamDataObj, betConfigs, bets.betsList.football)

    displayResults(collatedProcessedEventsArray, betConfigs)
  })
}

async function collateTeamsSingleCoupon(accordionsObject) {
  let teamList = []

  return new Promise( function(resolve, reject) {
    for (let accordionName in accordionsObject) {
      let accordion = accordionsObject[accordionName]
      for (let groupName in accordion) {
        let group = accordion[groupName]
        for (let eventName in group) {
          let event = group[eventName]
          // Parse the team names
          let teamsRegexMatch = event.Teams.match(new RegExp('\\s*([\\S\\s]+)\\s+v\\s+([\\S\\s]+)\\s*'))
          teamList.push(teamsRegexMatch[1])
          teamList.push(teamsRegexMatch[2])
        }
      }
    }
    resolve(teamList)
  })
}

async function collateFootballTeamsAllCoupons(betsListFootball) {
  let promiseArray = []
  for (let configName in betsListFootball) {
    promiseArray.push(collateTeamsSingleCoupon(betsListFootball[configName]))
  }
  let teamListArray = await Promise.all(promiseArray)

  // Concatenate the team list to make one single list of all teams
  let teamList = []
  for (let teams of teamListArray) {
    teamList = unique(teamList.concat(teams)).sort()
  }
  console.log(`Full Team List - ${teamList.length}`)
  console.log(teamList)
  return Promise.resolve(teamList)
}

async function getMappingSkyTotalCorner() {
  return new Promise( function(resolve, reject) {

    const file = './scripts/processBets/mappingSkyTotalCorner.json'
    jsonfile.readFile(file, function (err, map) {
      if (err) console.error(err)
      resolve(map)
    })
  })
}

async function checkMappingSkyTotalCorner(map, teamList) {
  // Check that all the teams exist in the map
  for (let teamName of teamList) {
    if (!map.hasOwnProperty(teamName)) {
      let index = readlineSync.question(`${teamName} not mapped. Enter TotalCorner index: `);
      map[teamName] = parseInt(index)
      await saveNewMappingSkyTotalCorner(map)
    }
  }
  return Promise.resolve(map)
}

async function saveNewMappingSkyTotalCorner(map) {

  return new Promise( (resolve, reject) => {

    // Put the map in alphabetical order for prettiness
    let newMap = {}
    for (let teamName of Object.keys(map).sort()) newMap[teamName] = parseInt(map[teamName])

    const file = './scripts/processBets/mappingSkyTotalCorner.json'
    fs.writeFile(file, JSON.stringify(newMap, null, 2), function(error) {
      if (error) reject(error)
      // console.log(`mappingSkyTotalCorner.csv updated`);
      resolve()
    })
  })
}

async function getTotalCornerData(map, teamName, recordsToGet, initialPageNumber, recordsAlreadyFound, teamName_TC) {
  const options = {
    uri: `https://www.totalcorner.com/team/view/${map[teamName]}/page:${initialPageNumber}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  };

  let teamData = {
    teamName: teamName,
    matches: [],
  }

  if (typeof teamName_TC == 'string') teamData.teamName_TC = teamName_TC

  let columnifyOptions = {
    showHeaders: false,
    columnSplitter: ' | ',
    truncate: true,
    config: {
      teamNameSkyBet : {
        minWidth: 25,
        maxWidth: 25,
      }
    }
  }

  return new Promise( function(resolve, reject) {
    rp(options)
      .then(($) => {

        // Get the team name
        teamData.teamName_TC = $('#team_view_title').find('h4').text().match(new RegExp('\\s*([\\S\\s]+)\\s*[-–]\\s*Schedule\\s*'))[1]

        let $table = $('#inplay_match_table')

        // Get header names
        let headerNames = []
        $table.find('thead tr th').each( (ith, th) => {
          let $th = $(th)

          // Append header name to list
          if ($th.hasClass('match_status')) {
            headerNames[ith] = 'Match Status'
          }
          else if ($th.hasClass('th_corner_goal_range')) {
            headerNames[ith] = $th.find('span').first().text()
          }
          else {
            headerNames[ith] = $th.text()
          }
        })


        // Loop through each match record
        $table.find('tbody tr').each( (itr, tr) => {
          let $tr = $(tr)
          let matchData = {}

          // Only consider matches of status "Full"
          let matchStatus = $tr.find('td').eq(2).find('span.match_status_minutes').text()
          if (matchStatus != 'Full') return true

          // Loop through each cell in this record
          $tr.find('td').each( (itd, td) => {
            let $td = $(td)
            let header = headerNames[itd]
            let value = undefined

            switch(header) {
              case 'League' :
                value = $td.find('a').text()
                break;
              case 'Time' :
                // let timeMoment = moment($td.text(), 'MM/DD HH:mm')
                // value = timeMoment.format()
                value = $td.text()
                // console.log(value)
                break;
              case 'Match Status' :
                value = matchStatus
                break;
              case 'Home' :
              case 'Away' :
                value = {
                  teamName: $td.find('a span').text(),
                  redCard: isNaN(parseInt($td.find('span.red_card').text())) ? 0 : parseInt($td.find('span.red_card').text()),
                  yellowCard: isNaN(parseInt($td.find('span.yellow_card').text())) ? 0 : parseInt($td.find('span.yellow_card').text()),
                  leaguePos: parseInt($td.find('span.leaguePos').text()),
                }
                break;
              case 'Score' :
                let scoreRegexMatch = $td.text().match(new RegExp('(\\d+) [-–] (\\d+)'))
                value = {}
                if (scoreRegexMatch) {
                  value = {
                    home: scoreRegexMatch[1] ? parseInt(scoreRegexMatch[1]) : null,
                    away: scoreRegexMatch[2] ? parseInt(scoreRegexMatch[2]) : null,
                  }
                }
                break;
              case 'Handicap' :
                value = parseFloat($td.text())
                break;
              case 'Corner' :
                let matchCornerRegexMatch = $td.find('span.span_match_corner').text().match(new RegExp('(\\d+)\\s*[-–]\\s*(\\d+)'))
                let halfCornerRegexMatch = $td.find('span.span_half_corner').text().match(new RegExp('(\\d+)\\s*[-–]\\s*(\\d+)'))
                value = {}
                if (matchCornerRegexMatch) {
                  value.match = {
                    home: matchCornerRegexMatch[1] ? parseInt(matchCornerRegexMatch[1]) : null,
                    away: matchCornerRegexMatch[2] ? parseInt(matchCornerRegexMatch[2]) : null,
                  }
                }
                if (halfCornerRegexMatch) {
                  value.half = {
                    home: halfCornerRegexMatch[1] ? parseInt(halfCornerRegexMatch[1]) : null,
                    away: halfCornerRegexMatch[2] ? parseInt(halfCornerRegexMatch[2]) : null,
                  }
                }
                break;
              case 'Goal Line' :
                value = {
                  total: parseFloat($td.find('div.match_total_goal_div').text()),
                  half: parseFloat($td.find('div.match_half_goal_div').text()),
                }
                break;
              case 'Dangerous Attack' :
                let matchDARegexMatch = $td.find('div.match_dangerous_attacks_div').text().match(new RegExp('(\\d*)\\s*[-–]\\s*(\\d*)'))
                let halfDARegexMatch = $td.find('div.match_dangerous_attacks_half_div').text().match(new RegExp('(\\d*)\\s*[-–]\\s*(\\d*)'))
                value = {}
                if (matchDARegexMatch) {
                  value.match = {
                    home: matchDARegexMatch[1] ? parseInt(matchDARegexMatch[1]) : null,
                    away: matchDARegexMatch[2] ? parseInt(matchDARegexMatch[2]) : null,
                  }
                }
                if (halfDARegexMatch) {
                  value.half = {
                    home: halfDARegexMatch[1] ? parseInt(halfDARegexMatch[1]) : null,
                    away: halfDARegexMatch[2] ? parseInt(halfDARegexMatch[2]) : null,
                  }
                }
                break;
              case 'Shots' :
                let matchShotsRegexMatch = $td.find('div.match_shoot_div').text().match(new RegExp('(\\d*)\\s*[-–]\\s*(\\d*)'))
                let halfShotsRegexMatch = $td.find('div.match_shoot_half_div').text().match(new RegExp('(\\d*)\\s*[-–]\\s*(\\d*)'))
                value = {}
                if (matchShotsRegexMatch) {
                  value.match = {
                    home: matchShotsRegexMatch[1] ? parseInt(matchShotsRegexMatch[1]) : null,
                    away: matchShotsRegexMatch[2] ? parseInt(matchShotsRegexMatch[2]) : null,
                  }
                }
                if (halfShotsRegexMatch) {
                  value.half = {
                    home: halfShotsRegexMatch[1] ? parseInt(halfShotsRegexMatch[1]) : null,
                    away: halfShotsRegexMatch[2] ? parseInt(halfShotsRegexMatch[2]) : null,
                  }
                }
                break;
              case 'Live Events' :
                break;
              case 'Analysis' :
                break;
              default :
                value = $td.text()
                break;
            }

            if (value) matchData[header] = value

          })
          teamData.matches.push(matchData)

          if (recordsAlreadyFound + teamData.matches.length == recordsToGet) {
            return false
          }
        })


        if (recordsAlreadyFound + teamData.matches.length == recordsToGet) {
          let columnifyData = [{
            message: `${recordsToGet} matches fetched`,
            teamNameSkyBet: teamData.teamName,
            teamNameTC: teamData.teamName_TC,
          }]
          console.log(columnify(columnifyData, columnifyOptions))
          resolve(teamData)
        }
        else if (recordsAlreadyFound + teamData.matches.length < recordsToGet) {
          getTotalCornerData(map, teamName, recordsToGet, initialPageNumber+1, recordsAlreadyFound + teamData.matches.length, teamData.teamName_TC)
          .then( function(teamDataExtra) {
            teamData.matches = teamData.matches.concat(teamDataExtra.matches)
            resolve(teamData)
          } )
        }
        else {
          reject('Something went wrong')
        }
      })
      .catch( (err) => {
        // console.log(err.name)
        // console.log(err.statusCode)
        if (recordsAlreadyFound == 0) {
          reject('noMatchesFound')
        }
        else {
          let columnifyData = [{
            message: `${recordsAlreadyFound} matches fetched`,
            teamNameSkyBet: teamData.teamName,
            teamNameTC: teamData.teamName_TC,
          }]
          console.log(columnify(columnifyData, columnifyOptions))
          resolve(teamData)
        }
      })
  })
}

async function getTotalCornerDataAllTeams(teamList, map, programOptions) {
  // Get data for all the teams

  // Set upper limit on quantity of simultaneous requests in order to not accidentally DDOS them
  let maxSimultaneousRequests = programOptions.binSize.binSize

  let promiseArray = []
  let promiseArrayTeamNames = []
  let teamDataArray = []

  let teamsFetched = []
  let teamIndex = 0

  while (teamsFetched.length < teamList.length) {
    let teamName = teamList[teamIndex]
    teamIndex = (teamIndex+1) % teamList.length
    if (teamsFetched.indexOf(teamName) > -1) continue

    promiseArray.push(getTotalCornerData(map, teamName, 25, 1, 0, undefined))
    promiseArrayTeamNames.push(teamName)

    // Execute the promises when the max quantity is reached
    if (promiseArray.length == maxSimultaneousRequests || teamsFetched.length + promiseArray.length == teamList.length) {

      let teamDataArrayLatest = []
      let nextPromiseArray = []
      let nextpromiseArrayTeamNames = []
      teamDataArrayLatest = await miscFunctions.promiseAll(promiseArray)

      // Go through the promises which rejected and try them again
      teamDataArrayLatest.forEach( (value, index) => {
        if (value == undefined) {
          nextPromiseArray.push(getTotalCornerData(map, promiseArrayTeamNames[index], 25, 1, 0, undefined))
          nextpromiseArrayTeamNames.push(promiseArrayTeamNames[index])
        }
        else {
          teamDataArray.push(value)
          teamsFetched.push(promiseArrayTeamNames[index])
        }
      })

      // Reset the promiseArray
      promiseArray = nextPromiseArray
      promiseArrayTeamNames = nextpromiseArrayTeamNames

      console.log(`---------- Fetched ${teamsFetched.length} of ${teamList.length} Teams ----------`.inverse)
    }


  }

  for (let teamIndex in teamList) {
    // let teamName = teamList[teamIndex]
    //
    // promiseArray.push(getTotalCornerData(map, teamName, 25, 1, 0, undefined))
    // promiseArrayTeamNames.push(teamName)
    //
    // // Execute the promises when the max quantity is reached
    // if (promiseArray.length == maxSimultaneousRequests || teamIndex == teamList.length-1) {
    //
    //   let teamDataArrayLatest = []
    //   let nextPromiseArray = []
    //   let nextpromiseArrayTeamNames = []
    //   teamDataArrayLatest = await miscFunctions.promiseAll(promiseArray)
    //
    //   // Go through the promises which rejected with "noMatchedFound" and try them again
    //   teamDataArrayLatest.forEach( (value, index) => {
    //     if (value == undefined) {
    //       console.log(`Undefined index ${index}`)
    //       nextPromiseArray.push(getTotalCornerData(map, promiseArrayTeamNames[index], 25, 1, 0, undefined))
    //       nextpromiseArrayTeamNames.push(teamName)
    //     }
    //   })
    //
    //   teamDataArray = teamDataArray.concat(teamDataArrayLatest)
    //   console.log(`---------- Fetched ${teamDataArray.length} of ${teamList.length} Teams ----------`.inverse)
    //
    //   // Reset the promiseArray
    //   promiseArray = [].concat(nextPromiseArray)
    //   promiseArrayTeamNames = [].concat(nextpromiseArrayTeamNames)
    // }
  }

  // Convert the array into an object with teamName as the keys
  let teamDataObj = {}
  for (let teamData of teamDataArray) {
    teamDataObj[teamData.teamName] = teamData
  }

  return teamDataObj
}

async function evaluateData(teamDataArray, betConfigs, betsListFootball) {

  let processBetPromiseArray = []

  for (let configName in betsListFootball) {
    let accordionList = betsListFootball[configName]

    for (let accordionName in accordionList) {
      let accordion = accordionList[accordionName]

      for (let competitionName in accordion) {
        let competition = accordion[competitionName]

        for (let eventName in competition) {
          let event = competition[eventName]

          // Deal with this bet depending on what its config is
          processBetPromiseArray.push(betConfigs[configName].processResults(event, teamDataArray))
        }
      }
    }
  }

  return Promise.all(processBetPromiseArray)
}

async function displayResults(collatedProcessedEventsArray, betConfigs) {
  // Sort by config
  let collatedProcessedEvents = {}
  for (let event of collatedProcessedEventsArray) {
    if (!collatedProcessedEvents.hasOwnProperty(event.configName)) collatedProcessedEvents[event.configName] = []
    collatedProcessedEvents[event.configName].push(event)
  }

  // Display the findings
  for (let configName in collatedProcessedEvents) {
    betConfigs[configName].displayResults(collatedProcessedEvents[configName])
  }

  return
}

module.exports = {
  processFootball: processFootball,
}
