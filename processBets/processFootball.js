
const os = require('os')
const fs = require('fs')
const rp = require('request-promise-native')
const cheerio = require('cheerio')
const moment = require('moment-timezone')
const csvParser = require('csv-parser')

collate = function(teamList, betsObject) {
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

getTotalCornerData = function(map, teamName) {
  const options = {
    uri: `https://www.totalcorner.com/team/view/${map[teamName]}`,
    transform: function (body) {
      return cheerio.load(body);
    }
  };

  console.log(teamName)

  return new Promise( function(resolve, reject) {
    rp(options)
      .then(($) => {
        let teamData = {
          teamName: teamName,
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
                let timeMoment = moment($td.text(), 'MM/DD HH:mm')
                value = timeMoment.format()
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
                console.log($td.text())
                let scoreRegexMatch = $td.text().match(new RegExp('(\\d+) [-–] (\\d+)'))
                value = {
                  home: parseInt(scoreRegexMatch[1]),
                  away: parseInt(scoreRegexMatch[2]),
                }
                break;
              case 'Handicap' :
                value = parseFloat($td.text())
                break;
              case 'Corner' :
                let matchCornerRegexMatch = $td.find('span.span_match_corner').text().match(new RegExp('(\\d+)\\s*[-–]\\s*(\\d+)'))
                let halfCornerRegexMatch = $td.find('span.span_half_corner').text().match(new RegExp('(\\d+)\\s*[-–]\\s*(\\d+)'))
                value = {
                  match: {
                    home: parseInt(matchCornerRegexMatch[1]),
                    away: parseInt(matchCornerRegexMatch[2]),
                  },
                  half: {
                    home: parseInt(halfCornerRegexMatch[1]),
                    away: parseInt(halfCornerRegexMatch[2]),
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
                let matchDARegexMatch = $td.find('div.match_dangerous_attacks_div').text().match(new RegExp('(\\d+)\\s*[-–]\\s*(\\d+)'))
                let halfDARegexMatch = $td.find('div.match_dangerous_attacks_half_div').text().match(new RegExp('(\\d*)\\s*[-–]\\s*(\\d*)'))
                value= {
                  match: {
                    home: parseInt(matchDARegexMatch[1]),
                    away: parseInt(matchDARegexMatch[2]),
                  },
                  half: {
                    home: parseInt(halfDARegexMatch[1]),
                    away: parseInt(halfDARegexMatch[2]),
                  }
                }
                break;
              case 'Shots' :
                let matchShotsRegexMatch = $td.find('div.match_shoot_div').text().match(new RegExp('(\\d+)\\s*[-–]\\s*(\\d+)'))
                let halfShotsRegexMatch = $td.find('div.match_shoot_half_div').text().match(new RegExp('(\\d*)\\s*[-–]\\s*(\\d*)'))
                value= {
                  match: {
                    home: parseInt(matchShotsRegexMatch[1]),
                    away: parseInt(matchShotsRegexMatch[2]),
                  },
                  half: {
                    home: parseInt(halfShotsRegexMatch[1]),
                    away: parseInt(halfShotsRegexMatch[2]),
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

            if (value) teamData[header] = value

          })

          return false
        })

        resolve(teamData)
      })
  })
}

module.exports = {
   collate: collate,
   getMappingSkyTotalCorner: getMappingSkyTotalCorner,
   getTotalCornerData: getTotalCornerData,
}
