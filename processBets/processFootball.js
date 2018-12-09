
const os = require('os')
const fs = require('fs')
const rp = require('request-promise-native')
const cheerio = require('cheerio')
const moment = require('moment-timezone')
const csvParser = require('csv-parser')
const csvWriter = require('csv-writer')
const readlineSync = require('readline-sync')

collateTeams = function(teamList, betsObject) {
  return new Promise( function(resolve, reject) {
    for (let accordionName in betsObject) {
      let accordion = betsObject[accordionName]
      for (let groupName in accordion) {
        let group = accordion[groupName]
        for (let eventName in group) {
          let event = group[eventName]
          // Parse the team names
          let teamsRegexMatch = event.Teams.match(new RegExp('([\\S\\s]+) v ([\\S\\s]+)'))
          teamList.push(teamsRegexMatch[1])
          teamList.push(teamsRegexMatch[2])
        }
      }
    }
    resolve(teamList)
  })
}

getMappingSkyTotalCorner = function() {
  return new Promise( function(resolve, reject) {
    let map = {}
    fs.createReadStream('./processBets/mappingSkyTotalCorner.csv')
    .pipe(csvParser(['team', 'index']))
    .on('data', function(data){
      if (!map.hasOwnProperty(data.team)) map[data.team] = parseInt(data.index)
    })
    .on('error', function(err){
      console.log(err)
      reject(err)
    })
    .on('end', function(){
      resolve(map)
    })
  })
}

checkMappingSkyTotalCorner = function(map, teamList) {
  // Check that all the teams exist in the map
  let newEntry = false
  for (let teamName of teamList) {
    if (!map.hasOwnProperty(teamName)) {
      let index = readlineSync.question(`${teamName} not mapped. Enter TotalCorner index: `);
      map[teamName] = index
      newEntry = true
    }
  }

  return new Promise( (resolve, reject) => {
    if (newEntry) {
      saveNewMappingSkyTotalCorner(map)
      .then( function() {
        resolve(map)
      })
    }
    else resolve(map)
  })
}

saveNewMappingSkyTotalCorner = function(map) {

  return new Promise( (resolve, reject) => {
    let mapArray = []
    for (let teamNameOriginal of Object.keys(map).sort()) {
      mapArray.push({
        teamName: teamNameOriginal,
        index: map[teamNameOriginal],
      })
    }

    const mapWriter = csvWriter.createObjectCsvWriter({
      path: './processBets/mappingSkyTotalCorner.csv',
      header: ['teamName', 'index'],
      encoding: 'utf8'
    });
    console.log(mapArray.length)
    console.log(mapArray[mapArray.length-1])
    console.log(mapArray[mapArray.length-2])
    mapWriter.writeRecords(mapArray)       // returns a promise
    .then(() => {
      console.log(`mappingSkyTotalCorner.csv updated`);
      resolve()
    });
  })
}

getTotalCornerData = function(map, teamName, recordsToGet, initialPageNumber, recordsAlreadyFound) {
  const options = {
    uri: `https://www.totalcorner.com/team/view/${map[teamName]}/page:${initialPageNumber}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  };

  return new Promise( function(resolve, reject) {
    rp(options)
      .then(($) => {
        let teamData = {
          teamName: teamName,
          matches: [],
        }

        // Get the team name
        teamData.team_name_TC = $('#team_view_title').find('h4').text().match(new RegExp('([\\S\\s]+) - Schedule'))[1]

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
          console.log(`${recordsToGet} matches fetched - ${teamName}`)
          resolve(teamData)
        }
        else if (recordsAlreadyFound + teamData.matches.length < recordsToGet) {
          getTotalCornerData(map, teamName, recordsToGet, initialPageNumber+1, recordsAlreadyFound + teamData.matches.length)
          .then( function(teamDataExtra) {
            teamData.matches = teamData.matches.concat(teamDataExtra.matches)
            resolve(teamData)
          } )
        }
        else {
          reject('Something went wrong')
        }
      })
  })
}

module.exports = {
   collateTeams: collateTeams,
   getMappingSkyTotalCorner: getMappingSkyTotalCorner,
   getTotalCornerData: getTotalCornerData,
}
