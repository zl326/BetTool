
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
  console.log(map)
  console.log(teamName)

  return new Promise( function(resolve, reject) {
    rp(options)
      .then(($) => {
        // Get the team name
        let team_name_TC = $('#team_view_title').find('h4').text().match(new RegExp('([\\S\\s]+) - Schedule'))[1]
        console.log(team_name_TC)
      })
  })
}

module.exports = {
   collate: collate,
   getMappingSkyTotalCorner: getMappingSkyTotalCorner,
   getTotalCornerData: getTotalCornerData,
}
