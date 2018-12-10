const commander = require('commander');
const getSkyBets = require('./getBets/getSkyBets.js');
const processFootball = require('./processBets/processFootball.js');
const unique = require('array-unique');

// Parse the input arguments
commander
  .version('0.0.0')
  .option('-a, --all', 'All bets')
  .option('--cteh, --cornersTakenInEachHalf', 'Corners Taken in Each Half')
  .option('--tobp, --totalOverBookingPoints', 'Total Over Booking Points')
  .option('--pl, --premierLeague', 'Premier League')
  .parse(process.argv);


// Get bet configs
let betConfigs = []
console.log('\nOptions:')
if (commander.all || commander.cornersTakenInEachHalf || true) {
  console.log('Chosen - Corners Taken in Each Half')
  betConfigs.push(require('./getBets/betConfigs/football/cornersTakenInEachHalf.js'))
}
if (commander.all || commander.totalOverBookingPoints) {
  console.log('Chosen - Total Over Booking Points')
  betConfigs.push(require('./getBets/betConfigs/football/totalOverBookingPoints.js'))
}
if (commander.all || commander.premierLeague) {
  console.log('Chosen - Premier League')
  betConfigs.push(require('./getBets/betConfigs/football/premierLeague.js'))
}

getBetConfigs(betConfigs)
.then( function(betsArray) {
  console.log('')

  Promise.all([collateFootballTeams(betsArray), processFootball.getMappingSkyTotalCorner()])
  .then( async function([teamList, map]) {

    map = await checkMappingSkyTotalCorner(map, teamList)
    console.log('')

    let teamDataArray = await getTotalCornerDataAllTeams(teamList, map)
    console.log('')

    evaluateData(teamDataArray, betConfigs, betsArray)

  })
})



function getBetConfigs(betConfigs) {
  // Get the bets for each config
  let betsArray = []
  for (let betConfig of betConfigs) {
    betsArray.push(getSkyBets.getBetsAccumulators(betConfig.uri))
  }
  return Promise.all(betsArray)
}

async function collateFootballTeams(betsArray) {
  let promiseArray = []
  betsArray.map( (result) => {promiseArray.push(processFootball.collateTeams(result))})
  let teamListArray = await Promise.all(promiseArray)

  // Concatenate the team list to make one single list of all teams
  let teamList = []
  for (let teams of teamListArray) {
    teamList = unique(teamList.concat(teams)).sort()
  }
  console.log('Full Team List')
  console.log(teamList)
  return Promise.resolve(teamList)
}

function getTotalCornerDataAllTeams(teamList, map) {
  // Get data for all the teams
  let promiseList = []
  for (let teamName of teamList) {
    promiseList.push(processFootball.getTotalCornerData(map, teamName, 25, 1, 0))
  }
  return Promise.all(promiseList)
}

function evaluateData(teamDataArray, betConfigs, betsArray) {
  for (let teamData of teamDataArray) {

  }
}
