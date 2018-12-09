


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

  return Promise.all([Promise.resolve(teamList), processFootball.getMappingSkyTotalCorner()])
})
.then( function([teamList, map]) {
  console.log(teamList)
  processFootball.getTotalCornerData(map, teamList[0])
})
