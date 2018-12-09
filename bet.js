


// const myModule = require('./getBets/SkyBet_CornersTakenInEachHalf.js');
const getSkyBets = require('./getBets/getSkyBets.js');
const processFootball = require('./processBets/processFootball.js');


let cornersTakenInEachHalf = getSkyBets.getBetsAccumulators(`https://m.skybet.com/football/coupon/10011490`)

let teamList = []

cornersTakenInEachHalf
.then( function(results) {
  return processFootball.collate(teamList, results)
})
.then( function(teamList) {
  console.log(teamList)

  return Promise.all([Promise.resolve(teamList), processFootball.getMappingSkyTotalCorner()])
})
.then( function([teamList, map]) {
  return Promise.all([Promise.resolve(teamList), checkMappingSkyTotalCorner(map, teamList)])
})
.then( function([teamList, map]) {
  // Get data for all the teams
  let promiseList = []
  for (let teamName of teamList) {
    console.log(teamName)
    promiseList.push(processFootball.getTotalCornerData(map, teamName, 35, 1, 0))
  }

  return Promise.all(promiseList)
})
.then( function(teamDataArray){
  for (let teamData of teamDataArray) {

  }
})
