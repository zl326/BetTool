const commander = require('commander');
const getBetFunctions = require('./scripts/getBets/getBetFunctions.js');
const processFootball = require('./scripts/processBets/processFootball.js');

// Parse the input arguments
commander
  .version('0.0.0')
  .option('-a, --all', 'All bets')
  .option('--cteh, --cornersTakenInEachHalf', 'Corners Taken in Each Half')
  .option('--tobp, --totalOverBookingPoints', 'Total Over Booking Points')
  .option('--pl, --premierLeague', 'Premier League')
  .option('-d, --dummy', 'Dummy')
  .parse(process.argv);



getBetFunctions.getBetConfigs(commander, process)
.then( async function(betConfigs) {
  let bets = await getBetFunctions.getBets(betConfigs)
  console.log('')

  let promiseArray = []
  for (let category of bets.categories) {
    if (category == 'football') promiseArray.push(processFootball.processFootball(betConfigs, bets))
  }

  Promise.all(promiseArray)
})
